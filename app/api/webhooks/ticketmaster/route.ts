import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma-client';

type WebhookPayload = {
  eventType: string; // "onsale" | "soldout" | "cancelled" | "postponed"
  id: string;        // Ticketmaster event ID (externalId)
  [key: string]: unknown;
};

const STATUS_MAP: Record<string, string> = {
  onsale: 'onsale',
  soldout: 'soldout',
  cancelled: 'soldout',
  postponed: 'upcoming',
};

const UPDATE_TYPE_MAP: Record<string, string> = {
  cancelled: 'alert',
  postponed: 'schedule',
  soldout: 'tickets',
};

const UPDATE_PRIORITY_MAP: Record<string, string> = {
  cancelled: 'urgent',
  postponed: 'important',
  soldout: 'important',
};

export async function POST(req: NextRequest) {
  const secret = process.env.TICKETMASTER_WEBHOOK_SECRET;

  // Verify HMAC signature when secret is configured
  if (secret) {
    const signature = req.headers.get('x-ticketmaster-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const rawBody = await req.text();
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    try {
      const sigBuffer = Buffer.from(signature, 'hex');
      const expBuffer = Buffer.from(expected, 'hex');
      if (sigBuffer.length !== expBuffer.length || !timingSafeEqual(sigBuffer, expBuffer)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    await processWebhook(rawBody);
    return NextResponse.json({ ok: true });
  }

  // No secret configured — process without verification (dev only)
  const rawBody = await req.text();
  await processWebhook(rawBody);
  return NextResponse.json({ ok: true });
}

async function processWebhook(rawBody: string) {
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error('[Webhook] Invalid JSON payload');
    return;
  }

  const { eventType, id: externalId } = payload;
  if (!externalId) {
    console.error('[Webhook] Missing externalId');
    return;
  }

  // Write audit record immediately, before processing
  const webhookRecord = await prisma.webhookEvent.create({
    data: {
      source: 'ticketmaster',
      eventType,
      externalId,
      rawPayload: rawBody,
    },
  });

  try {
    const newStatus = STATUS_MAP[eventType];
    if (!newStatus) {
      console.warn(`[Webhook] Unknown eventType: ${eventType}`);
      return;
    }

    // Find the matching internal event
    const event = await prisma.event.findUnique({
      where: { externalId_source: { externalId, source: 'ticketmaster' } },
    });

    if (!event) {
      console.warn(`[Webhook] No event found for externalId ${externalId}`);
      return;
    }

    // Update event status
    await prisma.event.update({
      where: { id: event.id },
      data: { status: newStatus },
    });

    // For important status changes, create an EventUpdate so users see it in their feed
    const updateType = UPDATE_TYPE_MAP[eventType];
    if (updateType) {
      const messages: Record<string, { title: string; description: string }> = {
        cancelled: {
          title: 'Event Cancelled',
          description: `${event.title} has been cancelled. Check the event page for refund information.`,
        },
        postponed: {
          title: 'Event Postponed',
          description: `${event.title} has been postponed. New date to be announced.`,
        },
        soldout: {
          title: 'Sold Out',
          description: `${event.title} is now sold out. Check for resale tickets on the event page.`,
        },
      };

      const msg = messages[eventType];
      if (msg) {
        await prisma.eventUpdate.create({
          data: {
            eventId: event.id,
            eventTitle: event.title,
            type: updateType,
            title: msg.title,
            description: msg.description,
            priority: UPDATE_PRIORITY_MAP[eventType] ?? 'normal',
          },
        });
      }
    }

    // Mark webhook as processed
    await prisma.webhookEvent.update({
      where: { id: webhookRecord.id },
      data: { processedAt: new Date() },
    });

    console.log(`[Webhook] Processed ${eventType} for ${externalId} → status: ${newStatus}`);
  } catch (err) {
    console.error('[Webhook] Processing error:', err);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma-client';
import { sendPush } from '@/lib/push';
import { z } from 'zod';

export const runtime = 'nodejs';

const bodySchema = z.object({
  title: z.string().default('TicketCue Test'),
  body: z.string().default('This is a test push notification.'),
  tag: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = bodySchema.parse(body);

    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: user.id } });
    if (subscriptions.length === 0) {
      return NextResponse.json({ error: 'No subscriptions for user' }, { status: 404 });
    }

    const results: { id: string; status: 'sent' | 'failed'; error?: string }[] = [];

    for (const sub of subscriptions) {
      try {
        await sendPush({
          subscription: {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keyP256dh,
              auth: sub.keyAuth,
            },
          },
          title: parsed.title,
          body: parsed.body,
          tag: parsed.tag,
        });
        results.push({ id: sub.id, status: 'sent' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send';
        results.push({ id: sub.id, status: 'failed', error: message });
      }
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    console.error('Push test error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

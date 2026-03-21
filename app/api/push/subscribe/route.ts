import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma-client';
import { z } from 'zod';

export const runtime = 'nodejs';

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
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

    const body = await req.json();
    const parsed = subscriptionSchema.parse(body);

    // Upsert by endpoint for this user to avoid duplicates
    const existing = await prisma.pushSubscription.findFirst({
      where: { userId: user.id, endpoint: parsed.endpoint },
    });

    const record = existing
      ? await prisma.pushSubscription.update({
          where: { id: existing.id },
          data: {
            keyP256dh: parsed.keys.p256dh,
            keyAuth: parsed.keys.auth,
          },
        })
      : await prisma.pushSubscription.create({
          data: {
            userId: user.id,
            endpoint: parsed.endpoint,
            keyP256dh: parsed.keys.p256dh,
            keyAuth: parsed.keys.auth,
          },
        });

    return NextResponse.json({ id: record.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    console.error('Push subscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

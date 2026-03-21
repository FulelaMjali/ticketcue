import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma-client';

export const runtime = 'nodejs';

export async function GET() {
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

    const reminders = await prisma.reminder.findMany({
      where: { userId: user.id },
      select: { eventId: true },
    });

    const eventIds = Array.from(new Set(reminders.map((r) => r.eventId)));
    if (eventIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const updates = await prisma.eventUpdate.findMany({
      where: { eventId: { in: eventIds } },
      orderBy: { timestamp: 'desc' },
      take: 30,
    });

    return NextResponse.json(
      updates.map((u) => ({
        ...u,
        timestamp: u.timestamp.toISOString(),
        createdAt: u.createdAt.toISOString(),
      })),
      { status: 200 }
    );
  } catch (error) {
    console.error('Feed updates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

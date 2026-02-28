import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma-client';
import { z } from 'zod';

const intervalsSchema = z.object({
  twoHours: z.boolean(),
  oneHour: z.boolean(),
  thirtyMinutes: z.boolean(),
  tenMinutes: z.boolean(),
});

const notificationMethodsSchema = z.object({
  browserPush: z.boolean(),
  email: z.boolean(),
});

const createReminderSchema = z.object({
  eventId: z.string().min(1),
  intervals: intervalsSchema,
  notificationMethods: notificationMethodsSchema,
});

async function getCurrentUserId() {
  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  return user?.id ?? null;
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reminders = await prisma.reminder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      reminders.map((reminder) => ({
        ...reminder,
        intervals: JSON.parse(reminder.intervals),
        notificationMethods: JSON.parse(reminder.notificationMethods),
        createdAt: reminder.createdAt.toISOString(),
        updatedAt: reminder.updatedAt.toISOString(),
      })),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get reminders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createReminderSchema.parse(body);

    const event = await prisma.event.findUnique({
      where: { id: parsed.eventId },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const existing = await prisma.reminder.findFirst({
      where: {
        userId,
        eventId: parsed.eventId,
        status: 'active',
      },
    });

    if (existing) {
      const updated = await prisma.reminder.update({
        where: { id: existing.id },
        data: {
          intervals: JSON.stringify(parsed.intervals),
          notificationMethods: JSON.stringify(parsed.notificationMethods),
          status: 'active',
        },
      });

      return NextResponse.json(
        {
          ...updated,
          intervals: parsed.intervals,
          notificationMethods: parsed.notificationMethods,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
        { status: 200 }
      );
    }

    const reminder = await prisma.reminder.create({
      data: {
        userId,
        eventId: parsed.eventId,
        intervals: JSON.stringify(parsed.intervals),
        notificationMethods: JSON.stringify(parsed.notificationMethods),
        status: 'active',
      },
    });

    return NextResponse.json(
      {
        ...reminder,
        intervals: parsed.intervals,
        notificationMethods: parsed.notificationMethods,
        createdAt: reminder.createdAt.toISOString(),
        updatedAt: reminder.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    console.error('Create reminder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

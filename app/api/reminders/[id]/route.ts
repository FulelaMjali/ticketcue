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

const updateReminderSchema = z.object({
  intervals: intervalsSchema.optional(),
  notificationMethods: notificationMethodsSchema.optional(),
  status: z.enum(['active', 'completed', 'dismissed']).optional(),
});

interface Params {
  params: Promise<{
    id: string;
  }>;
}

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

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const reminder = await prisma.reminder.findFirst({
      where: {
        id,
        userId,
      },
      select: { id: true },
    });

    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    await prisma.reminder.delete({ where: { id } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Delete reminder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateReminderSchema.parse(body);

    const reminder = await prisma.reminder.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    const updated = await prisma.reminder.update({
      where: { id },
      data: {
        intervals:
          parsed.intervals !== undefined
            ? JSON.stringify(parsed.intervals)
            : reminder.intervals,
        notificationMethods:
          parsed.notificationMethods !== undefined
            ? JSON.stringify(parsed.notificationMethods)
            : reminder.notificationMethods,
        status: parsed.status ?? reminder.status,
      },
    });

    return NextResponse.json(
      {
        ...updated,
        intervals: JSON.parse(updated.intervals),
        notificationMethods: JSON.parse(updated.notificationMethods),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    console.error('Update reminder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

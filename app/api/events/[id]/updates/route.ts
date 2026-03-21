import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-client';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const createSchema = z.object({
  type: z.enum(['lineup', 'tickets', 'schedule', 'weather', 'logistics', 'alert']),
  title: z.string().min(3),
  description: z.string().min(3),
  priority: z.enum(['normal', 'important', 'urgent']).default('normal'),
  imageUrl: z.string().url().optional(),
});

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const updates = await prisma.eventUpdate.findMany({
      where: { eventId: id },
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json(
      updates.map((update) => ({
        ...update,
        timestamp: update.timestamp.toISOString(),
        createdAt: update.createdAt.toISOString(),
      })),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get event updates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = createSchema.parse(body);

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const update = await prisma.eventUpdate.create({
      data: {
        eventId: id,
        eventTitle: event.title,
        type: parsed.type,
        title: parsed.title,
        description: parsed.description,
        imageUrl: parsed.imageUrl || null,
        priority: parsed.priority,
      },
    });

    return NextResponse.json(
      {
        ...update,
        timestamp: update.timestamp.toISOString(),
        createdAt: update.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    console.error('Create event update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

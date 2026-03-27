import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-client';
import { z } from 'zod';

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(10),
  category: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { limit, category } = querySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );

    // Group active reminders by eventId, ordered by count desc
    const grouped = await prisma.reminder.groupBy({
      by: ['eventId'],
      where: { status: 'active' },
      _count: { eventId: true },
      orderBy: { _count: { eventId: 'desc' } },
      take: limit * 3, // fetch extra to account for category filtering below
    });

    if (grouped.length === 0) {
      return NextResponse.json({ events: [], reminderCounts: {} });
    }

    const eventIds = grouped.map((g) => g.eventId);

    const eventWhere: any = { id: { in: eventIds } };
    if (category) eventWhere.category = category;

    const events = await prisma.event.findMany({
      where: eventWhere,
      take: limit,
    });

    // Build a count map and sort events to match the grouped order
    const countMap: Record<string, number> = {};
    for (const g of grouped) {
      countMap[g.eventId] = g._count.eventId;
    }

    const sorted = events.sort(
      (a, b) => (countMap[b.id] ?? 0) - (countMap[a.id] ?? 0)
    );

    return NextResponse.json({
      events: sorted.map((event) => ({
        ...event,
        date: event.date.toISOString(),
        ticketSaleDate: event.ticketSaleDate?.toISOString() ?? null,
        presaleDate: event.presaleDate?.toISOString() ?? null,
        ticketPhases: event.ticketPhases ? JSON.parse(event.ticketPhases) : [],
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
      })),
      reminderCounts: countMap,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Trending events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

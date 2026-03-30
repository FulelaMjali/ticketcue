import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-client';
import { searchEvents } from '@/lib/search';
import { z } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
  category: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  sort: z.enum(['date_asc', 'date_desc', 'created_desc']).default('date_asc'),
});

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const { page, limit, category, search, status, sort } = querySchema.parse(
      Object.fromEntries(searchParams)
    );

    const skip = (page - 1) * limit;

    let events;
    let total;

    if (search) {
      // Weighted relevance search via raw SQL (title > artist > venue > location)
      const result = await searchEvents({ search, category, status, skip, take: limit });
      events = result.events;
      total = result.total;
    } else {
      // Standard filtered query when no search term
      const where: any = {};
      if (category) where.category = category;
      if (status) where.status = status;

      const orderBy =
        sort === 'date_desc' ? { date: 'desc' as const }
        : sort === 'created_desc' ? { createdAt: 'desc' as const }
        : { date: 'asc' as const };

      total = await prisma.event.count({ where });
      const rows = await prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      });

      events = rows.map((event) => ({
        ...event,
        date: event.date.toISOString(),
        ticketSaleDate: event.ticketSaleDate?.toISOString() || null,
        presaleDate: event.presaleDate?.toISOString() || null,
        ticketPhases: event.ticketPhases ? JSON.parse(event.ticketPhases) : [],
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
      }));
    }

    return NextResponse.json(
      {
        events,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Get events error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

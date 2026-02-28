import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-client';
import { z } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  category: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const { page, limit, category, search, status } = querySchema.parse(
      Object.fromEntries(searchParams)
    );

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (category) {
      where.category = category;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { artist: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.event.count({ where });

    // Get events
    const events = await prisma.event.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(
      {
        events: events.map((event) => ({
          ...event,
          date: event.date.toISOString(),
          ticketSaleDate: event.ticketSaleDate?.toISOString() || null,
          presaleDate: event.presaleDate?.toISOString() || null,
          createdAt: event.createdAt.toISOString(),
          updatedAt: event.updatedAt.toISOString(),
        })),
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

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-client';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        updates: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ...event,
        date: event.date.toISOString(),
        ticketSaleDate: event.ticketSaleDate?.toISOString() || null,
        presaleDate: event.presaleDate?.toISOString() || null,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        updates: event.updates.map((update) => ({
          ...update,
          timestamp: update.timestamp.toISOString(),
          createdAt: update.createdAt.toISOString(),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get event error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

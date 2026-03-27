import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isNextResponse } from '@/lib/require-admin';
import { prisma } from '@/lib/prisma-client';
import { z } from 'zod';

const createEventSchema = z.object({
  title: z.string().min(1).max(255),
  artist: z.string().optional(),
  venue: z.string().min(1).max(255),
  location: z.string().min(1).max(255),
  date: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid date'),
  ticketSaleDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid ticket sale date'),
  presaleDate: z.string().optional().refine((v) => !v || !isNaN(Date.parse(v)), 'Invalid presale date'),
  category: z.enum(['concert', 'sports', 'theater', 'comedy', 'festival', 'nightlife']),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  ticketUrl: z.string().optional(),
  status: z.enum(['upcoming', 'presale', 'onsale', 'soldout']).optional(),
  externalId: z.string().optional(),
  source: z.string().optional(),
  ticketPhases: z.array(z.object({
    name: z.string(),
    date: z.string(),
    status: z.enum(['upcoming', 'active', 'completed']).default('upcoming'),
  })).optional(),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isNextResponse(admin)) return admin;

  try {
    const body = await req.json();
    const data = createEventSchema.parse(body);

    const now = new Date();
    const saleDate = new Date(data.ticketSaleDate);
    const presaleDate = data.presaleDate ? new Date(data.presaleDate) : null;

    let status = data.status ?? 'upcoming';
    if (!data.status) {
      if (saleDate <= now) status = 'onsale';
      else if (presaleDate && presaleDate <= now) status = 'presale';
    }

    const ticketPhases = data.ticketPhases ?? [
      ...(presaleDate ? [{ name: 'Presale', date: presaleDate.toISOString(), status: 'upcoming' as const }] : []),
      { name: presaleDate ? 'General Sale' : 'Sale', date: saleDate.toISOString(), status: 'upcoming' as const },
    ];

    // If externalId + source provided, upsert to avoid duplicates from syncs
    const eventData = {
      title: data.title,
      artist: data.artist,
      venue: data.venue,
      location: data.location,
      date: new Date(data.date),
      category: data.category,
      description: data.description ?? '',
      imageUrl: data.imageUrl ?? '/event-placeholder.png',
      ticketUrl: data.ticketUrl,
      ticketSaleDate: saleDate,
      presaleDate,
      status,
      ticketPhases: JSON.stringify(ticketPhases),
      isUserCreated: false,
      externalId: data.externalId ?? null,
      source: data.source ?? null,
    };

    let event;
    if (data.externalId && data.source) {
      event = await prisma.event.upsert({
        where: { externalId_source: { externalId: data.externalId, source: data.source } },
        create: eventData,
        update: {
          title: eventData.title,
          artist: eventData.artist,
          venue: eventData.venue,
          location: eventData.location,
          date: eventData.date,
          description: eventData.description,
          imageUrl: eventData.imageUrl,
          ticketUrl: eventData.ticketUrl,
          ticketSaleDate: eventData.ticketSaleDate,
          presaleDate: eventData.presaleDate,
          status: eventData.status,
          ticketPhases: eventData.ticketPhases,
        },
      });
    } else {
      event = await prisma.event.create({ data: eventData });
    }

    return NextResponse.json({
      event: {
        ...event,
        date: event.date.toISOString(),
        ticketSaleDate: event.ticketSaleDate?.toISOString() ?? null,
        presaleDate: event.presaleDate?.toISOString() ?? null,
        ticketPhases: JSON.parse(event.ticketPhases),
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Admin create event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

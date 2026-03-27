import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma-client';
import { z } from 'zod';

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  artist: z.string().optional(),
  venue: z.string().min(1, 'Venue is required').max(255),
  location: z.string().min(1, 'Location is required').max(255),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid event date'),
  ticketSaleDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid ticket sale date'),
  presaleDate: z.string().optional().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    'Invalid presale date'
  ),
  category: z.enum(['concert', 'sports', 'theater', 'comedy', 'festival', 'nightlife']),
  description: z.string().optional(),
  ticketUrl: z
    .string()
    .refine((val) => val === '' || /^https?:\/\/.+/.test(val), 'Must be empty or a valid URL')
    .transform((val) => val === '' ? undefined : val)
    .optional(),
  imageUrl: z
    .string()
    .refine((val) => val === '' || /^https?:\/\/.+/.test(val), 'Must be empty or a valid URL')
    .transform((val) => val === '' ? '/event-placeholder.png' : val)
    .default('/event-placeholder.png'),
  ticketPhases: z
    .array(
      z.object({
        name: z.string(),
        date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid phase date'),
        status: z.enum(['upcoming', 'active', 'completed']).default('upcoming'),
      })
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createEventSchema.parse(body);

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine event status based on ticket sale date
    const now = new Date();
    const ticketSaleDate = new Date(validatedData.ticketSaleDate);
    let status = 'upcoming';

    if (ticketSaleDate <= now) {
      status = 'onsale';
    } else if (validatedData.presaleDate && new Date(validatedData.presaleDate) <= now) {
      status = 'presale';
    }

    // Build ticket phases array
    const ticketPhases = validatedData.ticketPhases || [
      {
        name: validatedData.presaleDate ? 'Presale' : 'General Sale',
        date: validatedData.presaleDate || validatedData.ticketSaleDate,
        status: 'upcoming',
      },
      ...(validatedData.presaleDate
        ? [
            {
              name: 'General Sale',
              date: validatedData.ticketSaleDate,
              status: 'upcoming',
            },
          ]
        : []),
    ];

    const event = await prisma.event.create({
      data: {
        title: validatedData.title,
        artist: validatedData.artist,
        venue: validatedData.venue,
        location: validatedData.location,
        date: new Date(validatedData.date),
        category: validatedData.category,
        description: validatedData.description || '',
        imageUrl: validatedData.imageUrl || '/event-placeholder.png',
        ticketSaleDate: new Date(validatedData.ticketSaleDate),
        presaleDate: validatedData.presaleDate ? new Date(validatedData.presaleDate) : null,
        ticketUrl: validatedData.ticketUrl,
        status,
        ticketPhases: JSON.stringify(ticketPhases),
        isUserCreated: true,
        createdByUserId: user.id,
      },
    });

    return NextResponse.json(
      {
        event: {
          ...event,
          date: event.date.toISOString(),
          ticketSaleDate: event.ticketSaleDate?.toISOString() || null,
          presaleDate: event.presaleDate?.toISOString() || null,
          ticketPhases: JSON.parse(event.ticketPhases),
          createdAt: event.createdAt.toISOString(),
          updatedAt: event.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

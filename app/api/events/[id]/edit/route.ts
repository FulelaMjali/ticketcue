import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma-client';
import { z } from 'zod';

const updateEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255).optional(),
  artist: z.string().optional(),
  venue: z.string().min(1, 'Venue is required').max(255).optional(),
  location: z.string().min(1, 'Location is required').max(255).optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid event date').optional(),
  ticketSaleDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid ticket sale date')
    .optional(),
  presaleDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid presale date'),
  category: z.enum(['concert', 'sports', 'theater', 'comedy', 'festival', 'nightlife']).optional(),
  description: z.string().optional(),
  ticketUrl: z
    .string()
    .refine((val) => val === '' || /^https?:\/\/.+/.test(val), 'Must be empty or a valid URL')
    .transform((val) => val === '' ? undefined : val)
    .optional(),
  imageUrl: z
    .string()
    .refine((val) => val === '' || /^https?:\/\/.+/.test(val), 'Must be empty or a valid URL')
    .transform((val) => val === '' ? undefined : val)
    .optional(),
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

type Params = Promise<{ id: string }>;

export async function PATCH(req: NextRequest, props: { params: Params }) {
  try {
    const session = await auth();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await props.params;
    const body = await req.json();
    const validatedData = updateEventSchema.parse(body);

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if event exists and user created it
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.createdByUserId !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit events you created' },
        { status: 403 }
      );
    }

    // Determine event status based on ticket sale dates
    const ticketSaleDate = validatedData.ticketSaleDate
      ? new Date(validatedData.ticketSaleDate)
      : event.ticketSaleDate;
    const presaleDate = validatedData.presaleDate
      ? new Date(validatedData.presaleDate)
      : event.presaleDate;

    let status = event.status;
    if (validatedData.ticketSaleDate || validatedData.presaleDate) {
      const now = new Date();
      status = 'upcoming';

      if (ticketSaleDate && ticketSaleDate <= now) {
        status = 'onsale';
      } else if (presaleDate && presaleDate <= now) {
        status = 'presale';
      }
    }

    // Update ticket phases if provided
    let ticketPhases = event.ticketPhases;
    if (validatedData.ticketPhases) {
      ticketPhases = JSON.stringify(validatedData.ticketPhases);
    } else if (validatedData.presaleDate || validatedData.ticketSaleDate) {
      // Regenerate phases if dates changed
      const phases = [];
      if (presaleDate) {
        phases.push({
          name: 'Presale',
          date: presaleDate.toISOString(),
          status: 'upcoming',
        });
      }
      if (ticketSaleDate) {
        phases.push({
          name: ticketSaleDate === presaleDate ? 'Presale' : 'General Sale',
          date: ticketSaleDate.toISOString(),
          status: 'upcoming',
        });
      }
      ticketPhases = JSON.stringify(phases);
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        ...(validatedData.title && { title: validatedData.title }),
        ...(validatedData.artist !== undefined && { artist: validatedData.artist }),
        ...(validatedData.venue && { venue: validatedData.venue }),
        ...(validatedData.location && { location: validatedData.location }),
        ...(validatedData.date && { date: new Date(validatedData.date) }),
        ...(validatedData.category && { category: validatedData.category }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.imageUrl && { imageUrl: validatedData.imageUrl }),
        ...(validatedData.ticketUrl !== undefined && { ticketUrl: validatedData.ticketUrl }),
        ...(validatedData.ticketSaleDate && {
          ticketSaleDate: new Date(validatedData.ticketSaleDate),
        }),
        ...(validatedData.presaleDate && { presaleDate: new Date(validatedData.presaleDate) }),
        status,
        ticketPhases,
      },
    });

    return NextResponse.json(
      {
        event: {
          ...updatedEvent,
          date: updatedEvent.date.toISOString(),
          ticketSaleDate: updatedEvent.ticketSaleDate?.toISOString() || null,
          presaleDate: updatedEvent.presaleDate?.toISOString() || null,
          ticketPhases: JSON.parse(updatedEvent.ticketPhases),
          createdAt: updatedEvent.createdAt.toISOString(),
          updatedAt: updatedEvent.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

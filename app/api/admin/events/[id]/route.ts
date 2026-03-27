import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isNextResponse } from '@/lib/require-admin';
import { prisma } from '@/lib/prisma-client';
import { z } from 'zod';

const patchEventSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  artist: z.string().optional(),
  venue: z.string().min(1).max(255).optional(),
  location: z.string().min(1).max(255).optional(),
  date: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid date').optional(),
  ticketSaleDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid date').optional(),
  presaleDate: z.string().optional().refine((v) => !v || !isNaN(Date.parse(v)), 'Invalid date'),
  category: z.enum(['concert', 'sports', 'theater', 'comedy', 'festival', 'nightlife']).optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  ticketUrl: z.string().optional(),
  status: z.enum(['upcoming', 'presale', 'onsale', 'soldout']).optional(),
  externalId: z.string().optional(),
  source: z.string().optional(),
});

type Params = Promise<{ id: string }>;

export async function PATCH(req: NextRequest, props: { params: Params }) {
  const admin = await requireAdmin();
  if (isNextResponse(admin)) return admin;

  try {
    const { id } = await props.params;
    const body = await req.json();
    const data = patchEventSchema.parse(body);

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.artist !== undefined && { artist: data.artist }),
        ...(data.venue !== undefined && { venue: data.venue }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.ticketSaleDate !== undefined && { ticketSaleDate: new Date(data.ticketSaleDate) }),
        ...(data.presaleDate !== undefined && { presaleDate: data.presaleDate ? new Date(data.presaleDate) : null }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.ticketUrl !== undefined && { ticketUrl: data.ticketUrl }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.externalId !== undefined && { externalId: data.externalId }),
        ...(data.source !== undefined && { source: data.source }),
      },
    });

    return NextResponse.json({
      event: {
        ...updated,
        date: updated.date.toISOString(),
        ticketSaleDate: updated.ticketSaleDate?.toISOString() ?? null,
        presaleDate: updated.presaleDate?.toISOString() ?? null,
        ticketPhases: JSON.parse(updated.ticketPhases),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Admin patch event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Params }) {
  const admin = await requireAdmin();
  if (isNextResponse(admin)) return admin;

  try {
    const { id } = await props.params;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

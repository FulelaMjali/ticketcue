import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma-client';
import { NextResponse } from 'next/server';

type Params = Promise<{ id: string }>;

export async function GET(
  req: Request,
  props: { params: Params }
) {
  try {
    const params = await props.params;
    const { id: eventId } = params;
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const status = await prisma.eventUserStatus.findUnique({
      where: {
        userId_eventId: {
          userId: user.id,
          eventId,
        },
      },
    });

    return NextResponse.json({
      eventId,
      status: status?.status || null,
      ticketsSecured: status?.ticketsSecured || false,
      updatedAt: status?.updatedAt || null,
    });
  } catch (error) {
    console.error('Error fetching event status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  props: { params: Params }
) {
  try {
    const params = await props.params;
    const { id: eventId } = params;
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !['interested', 'secured'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be interested or secured.' },
        { status: 400 }
      );
    }

    const updatedStatus = await prisma.eventUserStatus.upsert({
      where: {
        userId_eventId: {
          userId: user.id,
          eventId,
        },
      },
      create: {
        userId: user.id,
        eventId,
        status,
        ticketsSecured: status === 'secured',
      },
      update: {
        status,
        ticketsSecured: status === 'secured',
      },
    });

    return NextResponse.json({
      eventId,
      status: updatedStatus.status,
      ticketsSecured: updatedStatus.ticketsSecured,
      updatedAt: updatedStatus.updatedAt,
    });
  } catch (error) {
    console.error('Error updating event status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  props: { params: Params }
) {
  try {
    const params = await props.params;
    const { id: eventId } = params;
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.eventUserStatus.deleteMany({
      where: {
        userId: user.id,
        eventId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

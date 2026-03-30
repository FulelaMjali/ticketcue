import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserId } from '@/lib/get-current-user-id';
import { prisma } from '@/lib/prisma-client';

const schema = z.object({
  action: z.enum(['accept', 'decline']),
});

type Params = Promise<{ id: string }>;

export async function PATCH(req: NextRequest, props: { params: Params }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await props.params;
    const friendship = await prisma.friendship.findUnique({ where: { id } });

    if (!friendship) {
      return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
    }
    if (friendship.addresseeId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (friendship.status !== 'pending') {
      return NextResponse.json({ error: 'Request is no longer pending' }, { status: 409 });
    }

    const body = await req.json();
    const { action } = schema.parse(body);

    const updated = await prisma.friendship.update({
      where: { id },
      data: { status: action === 'accept' ? 'accepted' : 'declined' },
    });

    return NextResponse.json({ friendship: { id: updated.id, status: updated.status } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    console.error('Respond to friend request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

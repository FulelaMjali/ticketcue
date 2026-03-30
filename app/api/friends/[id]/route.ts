import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/get-current-user-id';
import { prisma } from '@/lib/prisma-client';

type Params = Promise<{ id: string }>;

export async function DELETE(_req: Request, props: { params: Params }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await props.params;
    const friendship = await prisma.friendship.findUnique({ where: { id } });

    if (!friendship) {
      return NextResponse.json({ error: 'Friendship not found' }, { status: 404 });
    }
    if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.friendship.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove friend error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/get-current-user-id';
import { prisma } from '@/lib/prisma-client';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        addressee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const friends = friendships.map((f) => {
      const other = f.requesterId === userId ? f.addressee : f.requester;
      return {
        id: f.id,
        userId: other.id,
        name: other.name,
        email: other.email,
        color: f.color,
        status: f.status,
        createdAt: f.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

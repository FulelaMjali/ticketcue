import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/get-current-user-id';
import { prisma } from '@/lib/prisma-client';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requests = await prisma.friendship.findMany({
      where: { addresseeId: userId, status: 'pending' },
      include: {
        requester: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        requester: r.requester,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Get friend requests error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/get-current-user-id';
import { prisma } from '@/lib/prisma-client';

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
    if (q.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } },
          {
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
            ],
          },
        ],
      },
      select: { id: true, name: true, email: true },
      take: 20,
    });

    // Fetch all friendship records involving the current user and any of the results
    const resultIds = users.map((u) => u.id);
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId, addresseeId: { in: resultIds } },
          { requesterId: { in: resultIds }, addresseeId: userId },
        ],
      },
      select: { id: true, requesterId: true, addresseeId: true, status: true },
    });

    const friendshipMap = new Map<string, { id: string; status: string; isSender: boolean }>();
    for (const f of friendships) {
      const otherId = f.requesterId === userId ? f.addresseeId : f.requesterId;
      friendshipMap.set(otherId, { id: f.id, status: f.status, isSender: f.requesterId === userId });
    }

    const result = users.map((u) => {
      const f = friendshipMap.get(u.id);
      let friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted' = 'none';
      let friendshipId: string | null = null;

      if (f) {
        friendshipId = f.id;
        if (f.status === 'accepted') {
          friendshipStatus = 'accepted';
        } else if (f.status === 'pending') {
          friendshipStatus = f.isSender ? 'pending_sent' : 'pending_received';
        }
      }

      return { id: u.id, name: u.name, email: u.email, friendshipStatus, friendshipId };
    });

    return NextResponse.json({ users: result });
  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

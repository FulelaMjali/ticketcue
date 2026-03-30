import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserId } from '@/lib/get-current-user-id';
import { prisma } from '@/lib/prisma-client';
import { pickFriendColor } from '@/lib/friend-colors';

const schema = z.object({
  addresseeId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { addresseeId } = schema.parse(body);

    if (addresseeId === userId) {
      return NextResponse.json({ error: 'Cannot send a friend request to yourself' }, { status: 400 });
    }

    const addressee = await prisma.user.findUnique({
      where: { id: addresseeId },
      select: { id: true },
    });
    if (!addressee) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check for any existing friendship record in either direction
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId },
          { requesterId: addresseeId, addresseeId: userId },
        ],
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'Friendship already exists' }, { status: 409 });
    }

    // Pick a color not already used in this user's friendships
    const existingFriendships = await prisma.friendship.findMany({
      where: {
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: { color: true },
    });
    const usedColors = existingFriendships.map((f) => f.color);
    const color = pickFriendColor(usedColors);

    const friendship = await prisma.friendship.create({
      data: { requesterId: userId, addresseeId, status: 'pending', color },
    });

    return NextResponse.json(
      {
        friendship: {
          id: friendship.id,
          status: friendship.status,
          color: friendship.color,
          createdAt: friendship.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    console.error('Send friend request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

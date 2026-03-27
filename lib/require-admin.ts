import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma-client';

export type AdminSession = { userId: string; email: string; role: string };

/**
 * Call at the top of every admin route handler.
 * Returns an AdminSession on success, or a 401/403 NextResponse to return immediately.
 */
export async function requireAdmin(): Promise<AdminSession | NextResponse> {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Accept Vercel Cron calls authenticated via CRON_SECRET — they won't have a session
  // (handled separately in the sync route; this function is for session-based admin checks)

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { userId: user.id, email: user.email, role: user.role };
}

export function isNextResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}

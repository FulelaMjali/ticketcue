import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isNextResponse } from '@/lib/require-admin';
import { syncTicketmasterEvents } from '@/lib/ticketmaster/sync';

export async function POST(req: NextRequest) {
  // Accept either a valid admin session OR the CRON_SECRET (for Vercel Cron)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCronCall) {
    const admin = await requireAdmin();
    if (isNextResponse(admin)) return admin;
  }

  try {
    const result = await syncTicketmasterEvents();
    return NextResponse.json({
      ok: true,
      upserted: result.upserted,
      errors: result.errors,
    });
  } catch (err) {
    console.error('[Sync route] Unhandled error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

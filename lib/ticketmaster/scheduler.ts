/**
 * In-process hourly sync scheduler for non-Vercel environments.
 * Only runs in production Node.js runtime — see instrumentation.ts.
 */
export function startSyncScheduler() {
  const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  console.log('[TM Scheduler] Starting — will sync every hour');

  // Fire once immediately on startup, then on the interval
  runSync();
  setInterval(runSync, INTERVAL_MS);
}

async function runSync() {
  try {
    const { syncTicketmasterEvents } = await import('./sync');
    const result = await syncTicketmasterEvents();
    console.log(`[TM Scheduler] Sync complete — ${result.upserted} upserted, ${result.errors.length} errors`);
  } catch (err) {
    console.error('[TM Scheduler] Sync failed:', err);
  }
}

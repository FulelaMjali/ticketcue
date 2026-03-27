export async function register() {
  // Only run the in-process scheduler in production Node.js runtime.
  // In dev, trigger syncs manually via POST /api/admin/sync/ticketmaster.
  // On Vercel, the cron job in vercel.json handles scheduling instead.
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_RUNTIME === 'nodejs' &&
    !process.env.VERCEL // don't run scheduler when deployed on Vercel (cron handles it)
  ) {
    const { startSyncScheduler } = await import('./lib/ticketmaster/scheduler');
    startSyncScheduler();
  }
}

import { prisma } from '@/lib/prisma-client';
import { fetchTicketmasterEvents } from './client';
import { normalizeTicketmasterEvent } from './normalizer';

const SYNC_CATEGORIES = [
  { classificationName: 'Music' },
  { classificationName: 'Sports' },
  { classificationName: 'Arts & Theatre' },
];

export interface SyncResult {
  upserted: number;
  errors: string[];
}

export async function syncTicketmasterEvents(): Promise<SyncResult> {
  const log = await prisma.syncLog.create({
    data: { source: 'ticketmaster' },
  });

  let upserted = 0;
  const errors: string[] = [];

  try {
    for (const params of SYNC_CATEGORIES) {
      let rawEvents;
      try {
        rawEvents = await fetchTicketmasterEvents({ ...params, size: 100, page: 0 });
      } catch (err) {
        const msg = `Failed to fetch ${params.classificationName}: ${err instanceof Error ? err.message : String(err)}`;
        errors.push(msg);
        console.error(`[TM Sync] ${msg}`);
        continue;
      }

      for (const raw of rawEvents) {
        try {
          const normalized = normalizeTicketmasterEvent(raw);

          await prisma.event.upsert({
            where: {
              externalId_source: {
                externalId: normalized.externalId,
                source: normalized.source,
              },
            },
            create: {
              title: normalized.title,
              artist: normalized.artist,
              venue: normalized.venue,
              location: normalized.location,
              date: normalized.date,
              category: normalized.category,
              description: normalized.description,
              imageUrl: normalized.imageUrl,
              ticketUrl: normalized.ticketUrl,
              ticketSaleDate: normalized.ticketSaleDate,
              presaleDate: normalized.presaleDate,
              status: normalized.status,
              ticketPhases: JSON.stringify(normalized.ticketPhases),
              isUserCreated: false,
              externalId: normalized.externalId,
              source: normalized.source,
            },
            update: {
              // Update mutable fields — never overwrite reminders, user statuses, or internal id
              title: normalized.title,
              artist: normalized.artist,
              venue: normalized.venue,
              location: normalized.location,
              date: normalized.date,
              description: normalized.description,
              imageUrl: normalized.imageUrl,
              ticketUrl: normalized.ticketUrl,
              ticketSaleDate: normalized.ticketSaleDate,
              presaleDate: normalized.presaleDate,
              status: normalized.status,
              ticketPhases: JSON.stringify(normalized.ticketPhases),
            },
          });

          upserted++;
        } catch (err) {
          const msg = `Failed to upsert event ${raw.id}: ${err instanceof Error ? err.message : String(err)}`;
          errors.push(msg);
          console.error(`[TM Sync] ${msg}`);
        }
      }
    }
  } finally {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        finishedAt: new Date(),
        eventsUpserted: upserted,
        errorMessage: errors.length > 0 ? errors.slice(0, 5).join('; ') : null,
      },
    });
  }

  console.log(`[TM Sync] Done — ${upserted} upserted, ${errors.length} errors`);
  return { upserted, errors };
}

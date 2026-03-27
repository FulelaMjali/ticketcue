import { prisma } from '@/lib/prisma-client';
import { Prisma } from '@prisma/client';

export interface SearchEventsParams {
  search: string;
  category?: string;
  status?: string;
  skip?: number;
  take?: number;
}

interface RawEventRow {
  id: string;
  title: string;
  artist: string | null;
  venue: string;
  location: string;
  date: string;
  category: string;
  imageUrl: string;
  description: string;
  ticketSaleDate: string | null;
  presaleDate: string | null;
  ticketUrl: string | null;
  status: string;
  ticketPhases: string;
  createdByUserId: string | null;
  isUserCreated: number; // SQLite stores booleans as 0/1
  externalId: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Weighted LIKE search across title (4), artist (3), venue (2), location (1).
 * Returns events ordered by relevance desc, then date asc.
 *
 * NOTE: For catalogs > ~5,000 events, migrate to SQLite FTS5:
 *   CREATE VIRTUAL TABLE events_fts USING fts5(title, artist, venue, location, content='events', content_rowid='rowid');
 *   Then query: SELECT * FROM events JOIN events_fts ON events.rowid = events_fts.rowid WHERE events_fts MATCH ?
 *   with bm25(events_fts) for ranking. Requires a raw SQL migration outside Prisma.
 */
export async function searchEvents(params: SearchEventsParams) {
  const { search, category, status, skip = 0, take = 10 } = params;
  const term = `%${search}%`;

  // Build optional filters as raw SQL fragments
  const categoryClause = category ? Prisma.sql`AND category = ${category}` : Prisma.empty;
  const statusClause = status ? Prisma.sql`AND status = ${status}` : Prisma.empty;

  const rows = await prisma.$queryRaw<RawEventRow[]>`
    SELECT
      id, title, artist, venue, location, date, category, imageUrl, description,
      ticketSaleDate, presaleDate, ticketUrl, status, ticketPhases,
      createdByUserId, isUserCreated, externalId, source, createdAt, updatedAt,
      (
        CASE WHEN title    LIKE ${term} THEN 4 ELSE 0 END +
        CASE WHEN artist   LIKE ${term} THEN 3 ELSE 0 END +
        CASE WHEN venue    LIKE ${term} THEN 2 ELSE 0 END +
        CASE WHEN location LIKE ${term} THEN 1 ELSE 0 END
      ) AS relevance
    FROM events
    WHERE (
      title    LIKE ${term} OR
      artist   LIKE ${term} OR
      venue    LIKE ${term} OR
      location LIKE ${term}
    )
    ${categoryClause}
    ${statusClause}
    ORDER BY relevance DESC, date ASC
    LIMIT ${take} OFFSET ${skip}
  `;

  const countRows = await prisma.$queryRaw<[{ total: number }]>`
    SELECT COUNT(*) AS total
    FROM events
    WHERE (
      title    LIKE ${term} OR
      artist   LIKE ${term} OR
      venue    LIKE ${term} OR
      location LIKE ${term}
    )
    ${categoryClause}
    ${statusClause}
  `;

  const total = Number(countRows[0]?.total ?? 0);

  const events = rows.map((row) => {
    // Strip the computed `relevance` BigInt column — it's for ordering only, not part of the response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { relevance, ...fields } = row as RawEventRow & { relevance?: unknown };
    return {
      ...fields,
      isUserCreated: Boolean(fields.isUserCreated),
      date: new Date(fields.date).toISOString(),
      ticketSaleDate: fields.ticketSaleDate ? new Date(fields.ticketSaleDate).toISOString() : null,
      presaleDate: fields.presaleDate ? new Date(fields.presaleDate).toISOString() : null,
      createdAt: new Date(fields.createdAt).toISOString(),
      updatedAt: new Date(fields.updatedAt).toISOString(),
      ticketPhases: fields.ticketPhases ? JSON.parse(fields.ticketPhases) : [],
    };
  });

  return { events, total };
}

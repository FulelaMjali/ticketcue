import type { TicketmasterRawEvent } from './normalizer';
import { FIXTURE_EVENTS } from './fixtures';

const TM_BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

export interface FetchParams {
  keyword?: string;
  classificationName?: string;
  countryCode?: string;
  size?: number;
  page?: number;
}

interface TicketmasterApiResponse {
  _embedded?: { events?: TicketmasterRawEvent[] };
  page?: { totalElements: number; totalPages: number; number: number; size: number };
}

export async function fetchTicketmasterEvents(params: FetchParams): Promise<TicketmasterRawEvent[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    console.warn('[Ticketmaster] TICKETMASTER_API_KEY not set — using fixture data');
    return FIXTURE_EVENTS;
  }

  const qs = new URLSearchParams({
    apikey: apiKey,
    size: String(params.size ?? 100),
    page: String(params.page ?? 0),
    ...(params.keyword && { keyword: params.keyword }),
    ...(params.classificationName && { classificationName: params.classificationName }),
    ...(params.countryCode && { countryCode: params.countryCode }),
    sort: 'date,asc',
  });

  const url = `${TM_BASE_URL}/events.json?${qs}`;
  const res = await fetch(url, { next: { revalidate: 0 } });

  if (!res.ok) {
    throw new Error(`Ticketmaster API error: ${res.status} ${res.statusText}`);
  }

  const data: TicketmasterApiResponse = await res.json();
  return data._embedded?.events ?? [];
}

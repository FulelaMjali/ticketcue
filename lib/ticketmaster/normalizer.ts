export interface TicketmasterVenue {
  name: string;
  city?: { name: string };
  state?: { stateCode: string };
  country?: { countryCode: string };
}

export interface TicketmasterAttraction {
  name: string;
}

export interface TicketmasterRawEvent {
  id: string;
  name: string;
  url?: string;
  description?: string;
  info?: string;
  images?: Array<{ url: string; width: number; height: number; ratio?: string }>;
  dates?: {
    start?: { localDate?: string; dateTime?: string };
    status?: { code: string };
  };
  sales?: {
    public?: { startDateTime?: string; endDateTime?: string };
    presales?: Array<{ name: string; startDateTime?: string; endDateTime?: string }>;
  };
  classifications?: Array<{
    segment?: { name: string };
    genre?: { name: string };
  }>;
  _embedded?: {
    venues?: TicketmasterVenue[];
    attractions?: TicketmasterAttraction[];
  };
  priceRanges?: Array<{ min: number; max: number; currency: string }>;
}

export interface NormalizedEvent {
  externalId: string;
  source: 'ticketmaster';
  title: string;
  artist: string | null;
  venue: string;
  location: string;
  date: Date;
  category: 'concert' | 'sports' | 'theater' | 'comedy' | 'festival' | 'nightlife';
  description: string;
  imageUrl: string;
  ticketUrl: string | null;
  ticketSaleDate: Date | null;
  presaleDate: Date | null;
  status: 'upcoming' | 'presale' | 'onsale' | 'soldout';
  ticketPhases: Array<{ name: string; date: string; status: 'upcoming' | 'active' | 'completed' }>;
}

const SEGMENT_TO_CATEGORY: Record<string, NormalizedEvent['category']> = {
  Music: 'concert',
  Sports: 'sports',
  'Arts & Theatre': 'theater',
  'Film': 'theater',
  Comedy: 'comedy',
  Festival: 'festival',
  Miscellaneous: 'nightlife',
};

const TM_STATUS_MAP: Record<string, NormalizedEvent['status']> = {
  onsale: 'onsale',
  offsale: 'upcoming',
  cancelled: 'soldout',
  postponed: 'upcoming',
  rescheduled: 'upcoming',
};

function bestImage(images: TicketmasterRawEvent['images']): string {
  if (!images?.length) return '/event-placeholder.png';
  // Prefer 16:9 ratio, largest available
  const preferred = images
    .filter((i) => i.ratio === '16_9')
    .sort((a, b) => b.width - a.width);
  return (preferred[0] ?? images.sort((a, b) => b.width - a.width)[0]).url;
}

export function normalizeTicketmasterEvent(raw: TicketmasterRawEvent): NormalizedEvent {
  const venue = raw._embedded?.venues?.[0];
  const attraction = raw._embedded?.attractions?.[0];
  const segment = raw.classifications?.[0]?.segment?.name ?? '';
  const category: NormalizedEvent['category'] = SEGMENT_TO_CATEGORY[segment] ?? 'nightlife';

  const venueLocation = venue
    ? [venue.city?.name, venue.state?.stateCode ?? venue.country?.countryCode]
        .filter(Boolean)
        .join(', ')
    : 'TBD';

  // Event date
  const dateStr = raw.dates?.start?.dateTime ?? raw.dates?.start?.localDate;
  const date = dateStr ? new Date(dateStr) : new Date();

  // Sale dates
  const ticketSaleDate = raw.sales?.public?.startDateTime
    ? new Date(raw.sales.public.startDateTime)
    : null;
  const presaleDate = raw.sales?.presales?.[0]?.startDateTime
    ? new Date(raw.sales.presales[0].startDateTime)
    : null;

  // Status
  const tmStatus = raw.dates?.status?.code?.toLowerCase() ?? 'onsale';
  const now = new Date();
  let status: NormalizedEvent['status'] = TM_STATUS_MAP[tmStatus] ?? 'upcoming';
  // Refine with actual dates if status is ambiguous
  if (status === 'upcoming' && ticketSaleDate && ticketSaleDate <= now) status = 'onsale';
  if (status === 'upcoming' && presaleDate && presaleDate <= now && (!ticketSaleDate || ticketSaleDate > now)) status = 'presale';

  // Ticket phases
  const ticketPhases: NormalizedEvent['ticketPhases'] = [];
  if (presaleDate) {
    ticketPhases.push({
      name: raw.sales?.presales?.[0]?.name ?? 'Presale',
      date: presaleDate.toISOString(),
      status: presaleDate <= now ? 'completed' : 'upcoming',
    });
  }
  if (ticketSaleDate) {
    ticketPhases.push({
      name: presaleDate ? 'General Sale' : 'Sale',
      date: ticketSaleDate.toISOString(),
      status: ticketSaleDate <= now ? 'active' : 'upcoming',
    });
  }

  return {
    externalId: raw.id,
    source: 'ticketmaster',
    title: raw.name,
    artist: attraction?.name ?? null,
    venue: venue?.name ?? 'TBD',
    location: venueLocation,
    date,
    category,
    description: raw.description ?? raw.info ?? '',
    imageUrl: bestImage(raw.images),
    ticketUrl: raw.url ?? null,
    ticketSaleDate,
    presaleDate,
    status,
    ticketPhases,
  };
}

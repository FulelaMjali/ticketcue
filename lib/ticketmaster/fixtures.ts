import type { TicketmasterRawEvent } from './normalizer';

// Mock Ticketmaster API responses for local dev when TICKETMASTER_API_KEY is not set.
// Shape mirrors the real Discovery API v2 _embedded.events[] array.
export const FIXTURE_EVENTS: TicketmasterRawEvent[] = [
  {
    id: 'tm-fixture-001',
    name: 'Coldplay: Music of the Spheres World Tour',
    url: 'https://www.ticketmaster.com/event/coldplay',
    description: 'Coldplay brings their critically acclaimed Music of the Spheres World Tour to stadiums worldwide.',
    images: [{ url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80', width: 1200, height: 675, ratio: '16_9' }],
    dates: {
      start: { localDate: '2026-09-20', dateTime: '2026-09-20T20:00:00Z' },
      status: { code: 'onsale' },
    },
    sales: {
      public: { startDateTime: '2026-04-01T10:00:00Z' },
      presales: [{ name: 'Fan Club Presale', startDateTime: '2026-03-28T10:00:00Z' }],
    },
    classifications: [{ segment: { name: 'Music' }, genre: { name: 'Rock' } }],
    _embedded: {
      venues: [{ name: 'Wembley Stadium', city: { name: 'London' }, country: { countryCode: 'GB' } }],
      attractions: [{ name: 'Coldplay' }],
    },
  },
  {
    id: 'tm-fixture-002',
    name: 'US Open 2026 — Men\'s Final',
    url: 'https://www.ticketmaster.com/event/us-open-final',
    description: 'The biggest match of the tennis calendar. Court seats only.',
    images: [{ url: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=1200&q=80', width: 1200, height: 675, ratio: '16_9' }],
    dates: {
      start: { localDate: '2026-09-13', dateTime: '2026-09-13T17:00:00Z' },
      status: { code: 'onsale' },
    },
    sales: {
      public: { startDateTime: '2026-07-01T10:00:00Z' },
    },
    classifications: [{ segment: { name: 'Sports' }, genre: { name: 'Tennis' } }],
    _embedded: {
      venues: [{ name: 'Arthur Ashe Stadium', city: { name: 'New York' }, state: { stateCode: 'NY' } }],
      attractions: [{ name: 'USTA' }],
    },
  },
  {
    id: 'tm-fixture-003',
    name: 'Glastonbury Festival 2026',
    url: 'https://www.ticketmaster.com/event/glastonbury',
    description: 'The legendary five-day celebration of music, arts, and culture on Worthy Farm.',
    images: [{ url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80', width: 1200, height: 675, ratio: '16_9' }],
    dates: {
      start: { localDate: '2026-06-24', dateTime: '2026-06-24T12:00:00Z' },
      status: { code: 'offsale' },
    },
    sales: {
      public: { startDateTime: '2026-11-01T09:00:00Z' },
      presales: [{ name: 'Registration Presale', startDateTime: '2026-10-28T09:00:00Z' }],
    },
    classifications: [{ segment: { name: 'Festival' } }],
    _embedded: {
      venues: [{ name: 'Worthy Farm', city: { name: 'Pilton' }, country: { countryCode: 'GB' } }],
      attractions: [{ name: 'Various Artists' }],
    },
  },
];

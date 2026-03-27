import type { TicketmasterRawEvent } from './normalizer';

// Mock Ticketmaster API responses for local dev when TICKETMASTER_API_KEY is not set.
// Shape mirrors the real Discovery API v2 _embedded.events[] array.
export const FIXTURE_EVENTS: TicketmasterRawEvent[] = [
  {
    id: 'tm-fixture-001',
    name: 'Coldplay: Music of the Spheres World Tour',
    url: 'https://www.ticketmaster.com/event/coldplay',
    description: 'Coldplay brings their critically acclaimed Music of the Spheres World Tour.',
    images: [{ url: 'https://s1.ticketm.net/dam/a/coldplay.jpg', width: 1024, height: 576, ratio: '16_9' }],
    dates: {
      start: { localDate: '2026-07-15', dateTime: '2026-07-15T20:00:00Z' },
      status: { code: 'onsale' },
    },
    sales: {
      public: { startDateTime: '2025-12-01T10:00:00Z' },
      presales: [{ name: 'Fan Club Presale', startDateTime: '2025-11-28T10:00:00Z' }],
    },
    classifications: [{ segment: { name: 'Music' }, genre: { name: 'Rock' } }],
    _embedded: {
      venues: [{ name: 'Wembley Stadium', city: { name: 'London' }, country: { countryCode: 'GB' } }],
      attractions: [{ name: 'Coldplay' }],
    },
  },
  {
    id: 'tm-fixture-002',
    name: 'NBA Finals 2026 - Game 7',
    url: 'https://www.ticketmaster.com/event/nba-finals',
    description: 'The NBA Finals Game 7 — winner takes all.',
    images: [{ url: 'https://s1.ticketm.net/dam/a/nba.jpg', width: 1024, height: 576, ratio: '16_9' }],
    dates: {
      start: { localDate: '2026-06-20', dateTime: '2026-06-20T21:00:00Z' },
      status: { code: 'onsale' },
    },
    sales: {
      public: { startDateTime: '2026-05-01T10:00:00Z' },
    },
    classifications: [{ segment: { name: 'Sports' }, genre: { name: 'Basketball' } }],
    _embedded: {
      venues: [{ name: 'Chase Center', city: { name: 'San Francisco' }, state: { stateCode: 'CA' } }],
      attractions: [{ name: 'Golden State Warriors' }],
    },
  },
  {
    id: 'tm-fixture-003',
    name: 'Hamilton — Original Broadway Cast',
    url: 'https://www.ticketmaster.com/event/hamilton',
    description: 'Lin-Manuel Miranda\'s award-winning musical returns to Broadway.',
    images: [{ url: 'https://s1.ticketm.net/dam/a/hamilton.jpg', width: 1024, height: 576, ratio: '16_9' }],
    dates: {
      start: { localDate: '2026-09-10', dateTime: '2026-09-10T19:30:00Z' },
      status: { code: 'onsale' },
    },
    sales: {
      public: { startDateTime: '2026-03-01T10:00:00Z' },
      presales: [{ name: 'Members Presale', startDateTime: '2026-02-25T10:00:00Z' }],
    },
    classifications: [{ segment: { name: 'Arts & Theatre' }, genre: { name: 'Musical' } }],
    _embedded: {
      venues: [{ name: 'Richard Rodgers Theatre', city: { name: 'New York' }, state: { stateCode: 'NY' } }],
      attractions: [{ name: 'Hamilton' }],
    },
  },
  {
    id: 'tm-fixture-004',
    name: 'Dave Chappelle Live',
    url: 'https://www.ticketmaster.com/event/chappelle',
    description: 'Dave Chappelle returns to the stage for a limited run of live shows.',
    images: [{ url: 'https://s1.ticketm.net/dam/a/comedy.jpg', width: 1024, height: 576, ratio: '16_9' }],
    dates: {
      start: { localDate: '2026-08-05', dateTime: '2026-08-05T21:00:00Z' },
      status: { code: 'onsale' },
    },
    sales: {
      public: { startDateTime: '2026-04-15T10:00:00Z' },
    },
    classifications: [{ segment: { name: 'Comedy' } }],
    _embedded: {
      venues: [{ name: 'Madison Square Garden', city: { name: 'New York' }, state: { stateCode: 'NY' } }],
      attractions: [{ name: 'Dave Chappelle' }],
    },
  },
  {
    id: 'tm-fixture-005',
    name: 'Coachella Valley Music and Arts Festival 2027',
    url: 'https://www.ticketmaster.com/event/coachella',
    description: 'The world\'s most iconic music and arts festival returns to the desert.',
    images: [{ url: 'https://s1.ticketm.net/dam/a/coachella.jpg', width: 1024, height: 576, ratio: '16_9' }],
    dates: {
      start: { localDate: '2027-04-11', dateTime: '2027-04-11T12:00:00Z' },
      status: { code: 'offsale' },
    },
    sales: {
      public: { startDateTime: '2027-01-10T10:00:00Z' },
      presales: [{ name: 'Early Bird', startDateTime: '2027-01-07T10:00:00Z' }],
    },
    classifications: [{ segment: { name: 'Festival' } }],
    _embedded: {
      venues: [{ name: 'Empire Polo Club', city: { name: 'Indio' }, state: { stateCode: 'CA' } }],
      attractions: [{ name: 'Various Artists' }],
    },
  },
];

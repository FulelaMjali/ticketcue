import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

const d = (offset: number) => new Date(Date.now() + offset * 24 * 60 * 60 * 1000);

const mockEventsData = [
  {
    title: 'The Eras Tour — Final Leg',
    artist: 'Taylor Swift',
    venue: 'Wembley Stadium',
    location: 'London, UK',
    date: d(45),
    category: 'concert',
    imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&q=80',
    description: 'The record-breaking Eras Tour makes its final stop at Wembley Stadium for two sold-out nights.',
    ticketSaleDate: d(7),
    presaleDate: d(3),
    ticketUrl: 'https://example.com/tickets/eras-tour',
    status: 'presale',
  },
  {
    title: 'NBA Finals 2026 — Game 5',
    artist: null,
    venue: 'Chase Center',
    location: 'San Francisco, CA',
    date: d(30),
    category: 'sports',
    imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&q=80',
    description: 'The series returns to the Bay. Game 5 tips off at 9 PM ET.',
    ticketSaleDate: d(2),
    presaleDate: null,
    ticketUrl: 'https://example.com/tickets/nba-finals',
    status: 'onsale',
  },
  {
    title: 'Hamilton',
    artist: null,
    venue: 'Richard Rodgers Theatre',
    location: 'New York, NY',
    date: d(60),
    category: 'theater',
    imageUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200&q=80',
    description: "Lin-Manuel Miranda's award-winning musical about America's founding father.",
    ticketSaleDate: d(14),
    presaleDate: d(10),
    ticketUrl: 'https://example.com/tickets/hamilton',
    status: 'upcoming',
  },
  {
    title: 'Dave Chappelle: Live at MSG',
    artist: 'Dave Chappelle',
    venue: 'Madison Square Garden',
    location: 'New York, NY',
    date: d(21),
    category: 'comedy',
    imageUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=1200&q=80',
    description: 'Three nights only. Dave Chappelle returns to MSG for an unfiltered stand-up run.',
    ticketSaleDate: d(-2),
    presaleDate: null,
    ticketUrl: 'https://example.com/tickets/chappelle',
    status: 'onsale',
  },
  {
    title: 'Coachella Valley Music and Arts Festival',
    artist: 'Various Artists',
    venue: 'Empire Polo Club',
    location: 'Indio, CA',
    date: d(90),
    category: 'festival',
    imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80',
    description: 'The world-renowned festival returns across three weekends in the California desert.',
    ticketSaleDate: d(30),
    presaleDate: d(25),
    ticketUrl: 'https://example.com/tickets/coachella',
    status: 'upcoming',
  },
  {
    title: 'Club Night: Solomun b2b Dixon',
    artist: 'Solomun & Dixon',
    venue: 'Fabric London',
    location: 'London, UK',
    date: d(10),
    category: 'nightlife',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80',
    description: 'A rare back-to-back set from two of the biggest names in house music.',
    ticketSaleDate: d(-5),
    presaleDate: null,
    ticketUrl: 'https://example.com/tickets/fabric',
    status: 'onsale',
  },
];

function generateTicketPhases(ticketSaleDate: Date | null, presaleDate: Date | null): string {
  const phases = [];
  if (presaleDate) {
    phases.push({ name: 'Presale', date: presaleDate.toISOString(), status: 'upcoming' });
  }
  if (ticketSaleDate) {
    phases.push({ name: presaleDate ? 'General Sale' : 'Sale', date: ticketSaleDate.toISOString(), status: 'upcoming' });
  }
  return JSON.stringify(phases.length > 0 ? phases : [{ name: 'Sale', date: new Date().toISOString(), status: 'upcoming' }]);
}

async function main() {
  try {
    await prisma.eventUpdate.deleteMany();
    await prisma.eventUserStatus.deleteMany();
    await prisma.reminder.deleteMany();
    await prisma.pushSubscription.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
    await prisma.event.deleteMany();
    console.log('Cleared existing data');

    for (const eventData of mockEventsData) {
      const event = await prisma.event.create({
        data: {
          title: eventData.title,
          artist: eventData.artist,
          venue: eventData.venue,
          location: eventData.location,
          date: eventData.date,
          category: eventData.category,
          imageUrl: eventData.imageUrl,
          description: eventData.description,
          ticketSaleDate: eventData.ticketSaleDate,
          presaleDate: eventData.presaleDate,
          ticketUrl: eventData.ticketUrl,
          status: eventData.status,
          ticketPhases: generateTicketPhases(eventData.ticketSaleDate, eventData.presaleDate),
          isUserCreated: false,
        },
      });
      console.log(`Created event: ${event.title}`);
    }

    // Seed event updates
    const events = await prisma.event.findMany({ select: { id: true, title: true } });
    const byTitle = new Map(events.map((e) => [e.title, e.id]));

    const updates = [
      {
        eventTitle: 'The Eras Tour — Final Leg',
        type: 'tickets',
        title: 'Fan presale opens Thursday',
        description: 'Verified fan presale starts Thursday at 10 AM local time. Code required.',
        priority: 'important',
      },
      {
        eventTitle: 'NBA Finals 2026 — Game 5',
        type: 'schedule',
        title: 'Tip-off moved to 9:30 PM ET',
        description: 'Broadcast window pushed back 30 minutes. Gates open at 7 PM.',
        priority: 'normal',
      },
      {
        eventTitle: 'Coachella Valley Music and Arts Festival',
        type: 'logistics',
        title: 'Lineup announcement tomorrow',
        description: 'Headliners to be revealed at noon PST. Check the official site.',
        priority: 'normal',
      },
    ];

    for (const update of updates) {
      const eventId = byTitle.get(update.eventTitle);
      if (!eventId) continue;
      await prisma.eventUpdate.create({
        data: {
          eventId,
          eventTitle: update.eventTitle,
          type: update.type,
          title: update.title,
          description: update.description,
          priority: update.priority as 'normal' | 'important' | 'urgent',
        },
      });
      console.log(`Created update for ${update.eventTitle}`);
    }

    // Test user
    const hashedPassword = await bcryptjs.hash('password123', 10);
    const user = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        name: 'Alex Rivera',
        hashedPassword,
      },
    });
    console.log(`Created test user: ${user.email}`);

    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        preferredCategories: JSON.stringify(['concert', 'festival']),
        emailNotifications: true,
        pushNotifications: true,
      },
    });

    // Reminders for two events
    for (const title of ['The Eras Tour — Final Leg', 'Coachella Valley Music and Arts Festival']) {
      const eventId = byTitle.get(title);
      if (!eventId) continue;
      await prisma.reminder.create({
        data: {
          userId: user.id,
          eventId,
          intervals: JSON.stringify({ twoHours: true, oneHour: true, thirtyMinutes: false, tenMinutes: false }),
          notificationMethods: JSON.stringify({ browserPush: true, email: false }),
          status: 'active',
        },
      });
      console.log(`Created reminder for ${title}`);
    }

    // Event statuses
    const statuses: { title: string; status: 'interested' | 'going' | 'secured' }[] = [
      { title: 'The Eras Tour — Final Leg', status: 'secured' },
      { title: 'Coachella Valley Music and Arts Festival', status: 'interested' },
      { title: 'NBA Finals 2026 — Game 5', status: 'going' },
    ];

    for (const { title, status } of statuses) {
      const eventId = byTitle.get(title);
      if (!eventId) continue;
      await prisma.eventUserStatus.upsert({
        where: { userId_eventId: { userId: user.id, eventId } },
        update: {},
        create: {
          userId: user.id,
          eventId,
          status,
          ticketsSecured: status === 'secured',
        },
      });
      console.log(`Set status '${status}' for ${title}`);
    }

    console.log('\nSeeding complete!');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

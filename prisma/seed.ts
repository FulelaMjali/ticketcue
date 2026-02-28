import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

const mockEventsData = [
  {
    title: 'Neon Valley Festival 2024',
    artist: 'Multiple Artists',
    venue: 'Desert Grounds',
    location: 'Los Angeles, CA',
    date: new Date('2024-08-12T18:00:00'),
    category: 'festival',
    imageUrl: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/screen%20%287%29-S2lu5BRa7T5VNlWfLEHcN8z8QgGQB7.png',
    description: 'Get ready for the most immersive electronic music experience of the year.',
    ticketSaleDate: new Date('2024-06-15T10:00:00'),
    presaleDate: new Date('2024-06-10T10:00:00'),
    ticketUrl: 'https://example.com/tickets',
    status: 'upcoming',
  },
  {
    title: 'The Eras Tour',
    artist: 'Taylor Swift',
    venue: 'Wembley Stadium',
    location: 'London, UK',
    date: new Date('2024-08-05T19:00:00'),
    category: 'concert',
    imageUrl: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/screen%20%286%29-lnochKdTa5McsfZ94UdsbfnhNd5M60.png',
    description: 'Experience the journey through all musical eras.',
    ticketSaleDate: new Date('2024-05-20T10:00:00'),
    presaleDate: undefined,
    ticketUrl: undefined,
    status: 'onsale',
  },
  {
    title: 'Coachella 2024',
    artist: 'Various Artists',
    venue: 'Empire Polo Club',
    location: 'Indio, CA',
    date: new Date('2024-04-12T12:00:00'),
    category: 'festival',
    imageUrl: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/screen-r9GNl4tjjN2t38k53fA5mW9LTOsnZj.png',
    description: 'The premier music and arts festival returns.',
    ticketSaleDate: new Date('2024-01-15T12:00:00'),
    presaleDate: new Date('2024-01-12T12:00:00'),
    ticketUrl: undefined,
    status: 'soldout',
  },
  {
    title: 'Lakers vs. Warriors',
    artist: undefined,
    venue: 'Crypto.com Arena',
    location: 'Los Angeles, CA',
    date: new Date('2024-11-10T19:30:00'),
    category: 'sports',
    imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
    description: 'NBA Regular Season showdown.',
    ticketSaleDate: new Date('2024-09-01T10:00:00'),
    presaleDate: undefined,
    ticketUrl: undefined,
    status: 'upcoming',
  },
  {
    title: 'The Lion King',
    artist: undefined,
    venue: 'Lyceum Theatre',
    location: 'New York, NY',
    date: new Date('2024-12-04T20:00:00'),
    category: 'theater',
    imageUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800',
    description: 'The award-winning musical spectacular.',
    ticketSaleDate: new Date('2024-10-01T10:00:00'),
    presaleDate: undefined,
    ticketUrl: undefined,
    status: 'presale',
  },
  {
    title: 'Neon Music Festival',
    artist: 'Multiple DJs',
    venue: 'Central Park',
    location: 'New York, NY',
    date: new Date('2024-09-14T18:00:00'),
    category: 'nightlife',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    description: 'Electronic music under the stars.',
    ticketSaleDate: new Date('2024-07-10T10:00:00'),
    presaleDate: new Date('2024-07-05T10:00:00'),
    ticketUrl: undefined,
    status: 'upcoming',
  },
  {
    title: 'Global Tech Summit 2024',
    artist: undefined,
    venue: 'Convention Center',
    location: 'San Francisco, CA',
    date: new Date('2024-10-20T09:00:00'),
    category: 'festival',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    description: 'Leading tech conference and expo.',
    ticketSaleDate: new Date('2024-09-15T10:00:00'),
    presaleDate: undefined,
    ticketUrl: undefined,
    status: 'upcoming',
  },
  {
    title: 'Comedy Night Downtown',
    artist: 'Dave Chappelle',
    venue: 'Main St. Theater',
    location: 'Chicago, IL',
    date: new Date('2024-11-05T20:00:00'),
    category: 'comedy',
    imageUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800',
    description: 'An evening of stand-up comedy.',
    ticketSaleDate: new Date('2024-10-01T10:00:00'),
    presaleDate: undefined,
    ticketUrl: undefined,
    status: 'upcoming',
  },
  {
    title: 'Burning Man Festival',
    artist: undefined,
    venue: 'Black Rock Desert',
    location: 'Nevada',
    date: new Date('2024-08-25T12:00:00'),
    category: 'festival',
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
    description: 'Art, community, and self-expression.',
    ticketSaleDate: new Date('2024-04-20T12:00:00'),
    presaleDate: undefined,
    ticketUrl: undefined,
    status: 'soldout',
  },
  {
    title: 'Ultra Miami',
    artist: 'Multiple Artists',
    venue: 'Bayfront Park',
    location: 'Miami, FL',
    date: new Date('2024-03-22T14:00:00'),
    category: 'festival',
    imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
    description: 'Electronic music festival on the beach.',
    ticketSaleDate: new Date('2024-01-10T10:00:00'),
    presaleDate: undefined,
    ticketUrl: undefined,
    status: 'onsale',
  },
];

async function main() {
  try {
    // Delete existing data in dependency-safe order
    await prisma.eventUpdate.deleteMany();
    await prisma.eventUserStatus.deleteMany();
    await prisma.reminder.deleteMany();
    await prisma.pushSubscription.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
    await prisma.event.deleteMany();
    console.log('Cleared existing data');

    // Create events
    for (const eventData of mockEventsData) {
      const event = await prisma.event.create({
        data: {
          title: eventData.title,
          artist: eventData.artist || null,
          venue: eventData.venue,
          location: eventData.location,
          date: eventData.date,
          category: eventData.category,
          imageUrl: eventData.imageUrl,
          description: eventData.description,
          ticketSaleDate: eventData.ticketSaleDate || null,
          presaleDate: eventData.presaleDate || null,
          ticketUrl: eventData.ticketUrl || null,
          status: eventData.status,
        },
      });
      console.log(`Created event: ${event.title}`);
    }

    // Create a test user
    const hashedPassword = await bcryptjs.hash('password123', 10);
    const user = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        name: 'Test User',
        hashedPassword,
      },
    });
    console.log(`Created test user: ${user.email}`);

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

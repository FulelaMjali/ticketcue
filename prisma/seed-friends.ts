/**
 * seed-friends.ts
 * Adds test friend users and friendship records for the test user (test@example.com).
 * Safe to run multiple times — uses upsert throughout, won't duplicate data.
 * Run with: npx tsx prisma/seed-friends.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

const FRIEND_COLORS = [
  '#e05c5c',
  '#e08c3c',
  '#d4c43c',
  '#5cb85c',
  '#3ca8d4',
  '#7b5cd4',
];

const friendUsers = [
  { email: 'jamie.chen@example.com',   name: 'Jamie Chen',    password: 'password123' },
  { email: 'priya.sharma@example.com', name: 'Priya Sharma',  password: 'password123' },
  { email: 'marcus.obi@example.com',   name: 'Marcus Obi',    password: 'password123' },
  { email: 'sofia.lang@example.com',   name: 'Sofia Lang',    password: 'password123' },
  // One pending request — will show up in the Requests tab
  { email: 'dana.west@example.com',    name: 'Dana West',     password: 'password123' },
];

async function main() {
  // ── 1. Find test user ──────────────────────────────────────────────────────
  const testUser = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
  if (!testUser) {
    console.error('Test user not found. Run the main seed first: npx tsx prisma/seed.ts');
    process.exit(1);
  }
  console.log(`Found test user: ${testUser.name} (${testUser.email})`);

  // ── 2. Upsert friend user accounts ────────────────────────────────────────
  const hashedPassword = await bcryptjs.hash('password123', 10);
  const createdFriends: { id: string; email: string; name: string }[] = [];

  for (const f of friendUsers) {
    const user = await prisma.user.upsert({
      where: { email: f.email },
      update: { name: f.name },
      create: { email: f.email, name: f.name, hashedPassword },
    });
    // Ensure they have preferences
    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        preferredCategories: JSON.stringify([]),
        emailNotifications: true,
        pushNotifications: true,
      },
    });
    createdFriends.push({ id: user.id, email: f.email, name: f.name });
    console.log(`Upserted friend user: ${f.name}`);
  }

  // ── 3. Create accepted friendships (first 4) ───────────────────────────────
  const acceptedFriends = createdFriends.slice(0, 4);

  for (let i = 0; i < acceptedFriends.length; i++) {
    const friend = acceptedFriends[i];
    const color = FRIEND_COLORS[i % FRIEND_COLORS.length];

    await prisma.friendship.upsert({
      where: { requesterId_addresseeId: { requesterId: testUser.id, addresseeId: friend.id } },
      update: { status: 'accepted', color },
      create: { requesterId: testUser.id, addresseeId: friend.id, status: 'accepted', color },
    });
    console.log(`Accepted friendship: Alex ↔ ${friend.name} (${color})`);
  }

  // ── 4. Create a pending incoming request (Dana → Alex) ────────────────────
  const dana = createdFriends[4];
  await prisma.friendship.upsert({
    where: { requesterId_addresseeId: { requesterId: dana.id, addresseeId: testUser.id } },
    update: { status: 'pending' },
    create: { requesterId: dana.id, addresseeId: testUser.id, status: 'pending', color: FRIEND_COLORS[4] },
  });
  console.log(`Pending request: ${dana.name} → Alex`);

  // ── 5. Give friends event statuses so the calendar overlay has data ────────
  const events = await prisma.event.findMany({ select: { id: true, title: true } });
  const byTitle = new Map(events.map((e) => [e.title, e.id]));

  const friendStatuses: { friendEmail: string; eventTitle: string; status: 'interested' | 'going' | 'secured' }[] = [
    { friendEmail: 'jamie.chen@example.com',   eventTitle: 'The Eras Tour — Final Leg',                status: 'secured'    },
    { friendEmail: 'jamie.chen@example.com',   eventTitle: 'Coachella Valley Music and Arts Festival', status: 'interested' },
    { friendEmail: 'priya.sharma@example.com', eventTitle: 'The Eras Tour — Final Leg',                status: 'going'      },
    { friendEmail: 'priya.sharma@example.com', eventTitle: 'Hamilton',                                 status: 'secured'    },
    { friendEmail: 'marcus.obi@example.com',   eventTitle: 'NBA Finals 2026 — Game 5',                 status: 'secured'    },
    { friendEmail: 'marcus.obi@example.com',   eventTitle: 'Dave Chappelle: Live at MSG',              status: 'going'      },
    { friendEmail: 'sofia.lang@example.com',   eventTitle: 'Coachella Valley Music and Arts Festival', status: 'secured'    },
    { friendEmail: 'sofia.lang@example.com',   eventTitle: 'Club Night: Solomun b2b Dixon',            status: 'going'      },
  ];

  const friendUserMap = new Map(createdFriends.map((f) => [f.email, f.id]));

  for (const { friendEmail, eventTitle, status } of friendStatuses) {
    const userId = friendUserMap.get(friendEmail);
    const eventId = byTitle.get(eventTitle);
    if (!userId || !eventId) continue;

    await prisma.eventUserStatus.upsert({
      where: { userId_eventId: { userId, eventId } },
      update: { status, ticketsSecured: status === 'secured' },
      create: { userId, eventId, status, ticketsSecured: status === 'secured' },
    });
    console.log(`  ${friendEmail} → "${eventTitle}" (${status})`);
  }

  console.log('\nFriend seed complete!');
  console.log('\nTest accounts:');
  console.log('  Main user:  test@example.com / password123');
  for (const f of createdFriends) {
    console.log(`  ${f.name.padEnd(15)} ${f.email} / password123`);
  }
  console.log('\nFriendship state:');
  console.log('  Accepted:  Jamie Chen, Priya Sharma, Marcus Obi, Sofia Lang');
  console.log('  Pending:   Dana West sent a request to Alex (visible in Requests tab)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

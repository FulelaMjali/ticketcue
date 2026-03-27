import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma-client';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userPreferences: true,
        reminders: {
          where: { status: 'active' },
          include: { event: true },
        },
        eventStatuses: {
          where: { status: 'secured' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Count events this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const eventsThisMonth = await prisma.event.count({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        userStatuses: {
          some: {
            userId: user.id,
            status: { in: ['interested', 'going', 'secured'] },
          },
        },
      },
    });

    // Count active reminders for future events only
    const activeRemindersForFutureEvents = (user.reminders || []).filter((reminder) => {
      const event = reminder.event;
      if (!event) return false;
      const saleDate = event.presaleDate || event.ticketSaleDate;
      if (!saleDate) return false;
      return saleDate.getTime() > now.getTime();
    }).length;

    const profile = {
      id: user.id,
      name: user.name || '',
      email: user.email,
      preferences: user.userPreferences
        ? {
            preferredCategories: user.userPreferences.preferredCategories
              ? JSON.parse(user.userPreferences.preferredCategories)
              : [],
            emailNotifications: user.userPreferences.emailNotifications,
            pushNotifications: user.userPreferences.pushNotifications,
          }
        : {
            preferredCategories: [],
            emailNotifications: true,
            pushNotifications: true,
          },
      stats: {
        ticketsSecured: user.eventStatuses?.length || 0,
        activeReminders: activeRemindersForFutureEvents,
        eventsThisMonth,
      },
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, preferences } = body;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user name if provided
    if (name !== undefined) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name },
      });
    }

    // Update preferences if provided
    if (preferences) {
      const preferencesData: Record<string, unknown> = {};

      if (preferences.preferredCategories !== undefined) {
        preferencesData.preferredCategories = JSON.stringify(
          preferences.preferredCategories
        );
      }
      if (preferences.emailNotifications !== undefined) {
        preferencesData.emailNotifications = preferences.emailNotifications;
      }
      if (preferences.pushNotifications !== undefined) {
        preferencesData.pushNotifications = preferences.pushNotifications;
      }

      if (Object.keys(preferencesData).length > 0) {
        await prisma.userPreferences.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            preferredCategories: '[]',
            emailNotifications: true,
            pushNotifications: true,
            ...preferencesData,
          },
          update: preferencesData,
        });
      }
    }

    // Fetch and return updated profile
    const updatedUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userPreferences: true,
        reminders: {
          where: { status: 'active' },
          include: { event: true },
        },
        eventStatuses: {
          where: { status: 'secured' },
        },
      },
    });

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const eventsThisMonth = await prisma.event.count({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        userStatuses: {
          some: {
            userId: updatedUser.id,
            status: { in: ['interested', 'going', 'secured'] },
          },
        },
      },
    });

    // Count active reminders for future events only
    const activeRemindersForFutureEvents = (updatedUser.reminders || []).filter((reminder) => {
      const event = reminder.event;
      if (!event) return false;
      const saleDate = event.presaleDate || event.ticketSaleDate;
      if (!saleDate) return false;
      return saleDate.getTime() > now.getTime();
    }).length;

    const profile = {
      id: updatedUser.id,
      name: updatedUser.name || '',
      email: updatedUser.email,
      preferences: updatedUser.userPreferences
        ? {
            preferredCategories: updatedUser.userPreferences.preferredCategories
              ? JSON.parse(updatedUser.userPreferences.preferredCategories)
              : [],
            emailNotifications: updatedUser.userPreferences.emailNotifications,
            pushNotifications: updatedUser.userPreferences.pushNotifications,
          }
        : {
            preferredCategories: [],
            emailNotifications: true,
            pushNotifications: true,
          },
      stats: {
        ticketsSecured: updatedUser.eventStatuses?.length || 0,
        activeReminders: activeRemindersForFutureEvents,
        eventsThisMonth,
      },
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

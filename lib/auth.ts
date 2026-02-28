import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';
import Email from 'next-auth/providers/email';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from './prisma-client';
import bcryptjs from 'bcryptjs';

const providers = [Google, Apple];

// Add Email provider only when SMTP is configured to avoid runtime errors
if (process.env.EMAIL_SERVER && process.env.EMAIL_FROM) {
  providers.push(
    Email({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    })
  );
}

providers.push(
  Credentials({
    name: 'Credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email: credentials.email as string },
      });

      if (!user || !user.hashedPassword) {
        return null;
      }

      const valid = await bcryptjs.compare(
        credentials.password as string,
        user.hashedPassword
      );

      if (!valid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
      };
    },
  })
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
                             request.nextUrl.pathname.startsWith('/reminders') ||
                             request.nextUrl.pathname.startsWith('/api/reminders') ||
                             request.nextUrl.pathname.startsWith('/api/events/*/status');
      
      if (isProtectedRoute && !isLoggedIn) {
        return false;
      }

      return true;
    },
  },
});

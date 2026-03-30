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
        role: user.role,
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
    async jwt({ token, user }) {
      // On sign-in, `user` is populated — embed the role into the token
      if (user) {
        token.role = (user as { role?: string }).role ?? 'user';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role ?? 'user';
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
                             request.nextUrl.pathname.startsWith('/reminders') ||
                             request.nextUrl.pathname.startsWith('/friends') ||
                             request.nextUrl.pathname.startsWith('/api/reminders') ||
                             request.nextUrl.pathname.startsWith('/api/events/*/status') ||
                             request.nextUrl.pathname.startsWith('/api/friends') ||
                             request.nextUrl.pathname.startsWith('/api/users/search');

      if (isProtectedRoute && !isLoggedIn) {
        return false;
      }

      return true;
    },
  },
});

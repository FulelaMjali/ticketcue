import NextAuth from 'next-auth';

// Edge-safe auth that can validate JWT sessions issued by the main NextAuth config.
export const { auth } = NextAuth({
  providers: [], // decoding JWT does not require providers here
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
});

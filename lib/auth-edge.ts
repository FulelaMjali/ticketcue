import NextAuth from "next-auth";

// Lightweight auth config for Edge runtime (middleware). Avoids Node-only deps like nodemailer/Prisma.
export const { auth } = NextAuth({
  providers: [],
  session: { strategy: "jwt" },
});

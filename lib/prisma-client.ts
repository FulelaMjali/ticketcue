import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const getPrisma = () => {
  if (typeof globalThis !== 'undefined') {
    if (!globalThis.prisma) {
      globalThis.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query'] : [],
      });
    }
    return globalThis.prisma;
  }

  // Fallback for edge-like runtimes without globalThis
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });
};

export const prisma = getPrisma();

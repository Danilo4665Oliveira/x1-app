// =============================================================
// lib/prisma.ts — Singleton do PrismaClient
//
// Por que singleton?
//   Em desenvolvimento com hot-reload (ts-node-dev), cada vez
//   que o arquivo é recarregado o Node criaria uma nova conexão
//   com o PostgreSQL. O padrão globalThis evita isso,
//   reutilizando a instância já conectada.
//
// Em produção, o módulo é carregado uma única vez, então
//   globalThis não é necessário — mas não causa problema.
// =============================================================
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

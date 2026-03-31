import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (url) return url
  // `next build` local sin .env: no conecta a DB hasta runtime
  if (process.env.SKIP_ENV_VALIDATION === '1') {
    return 'postgresql://build:build@127.0.0.1:5432/build'
  }
  throw new Error(
    'DATABASE_URL no está definida. En local crea un .env con la URL de PostgreSQL (Neon u otro). En Vercel añádela en Project → Settings → Environment Variables.'
  )
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

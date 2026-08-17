import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

const url = process.env.TURSO_DATABASE_URL || 'file:local.db'
const authToken = process.env.TURSO_AUTH_TOKEN

export const tursoClient = createClient({
  url,
  ...(authToken ? { authToken } : {}),
})

export const db = drizzle(tursoClient)
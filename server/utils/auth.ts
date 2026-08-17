import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { eq, and, gt } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../db/client'
import { admins, adminSessions } from '../db/schema'

export interface SafeAdminUser {
  id: string
  name: string
  email: string
  username: string
  role: string
  provider: string
  avatarUrl: string | null
  createdAt?: Date | number
}

const COOKIE_NAME = 'gunget_session'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex')
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const calculatedHash = hashPassword(password, salt)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculatedHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    )
  } catch {
    return false
  }
}

export async function createAdminSession(userId: string, event: H3Event) {
  const token = generateToken()
  const now = new Date()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

  await db.insert(adminSessions).values({
    id: `sess-${nanoid(12)}`,
    token,
    userId,
    expiresAt,
    createdAt: now,
  })

  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === 'production',
  })

  return { token, expiresAt }
}

export async function destroyAdminSession(event: H3Event) {
  const token = getCookie(event, COOKIE_NAME)
  if (token) {
    try {
      await db.delete(adminSessions).where(eq(adminSessions.token, token))
    } catch {
      // Ignore database cleanup errors on logout
    }
  }

  deleteCookie(event, COOKIE_NAME, {
    path: '/',
  })
}

export async function getAdminFromSession(event: H3Event): Promise<SafeAdminUser | null> {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return null

  const now = new Date()

  // Find active session
  const sessionList = await db
    .select()
    .from(adminSessions)
    .where(and(eq(adminSessions.token, token), gt(adminSessions.expiresAt, now)))
    .limit(1)

  const activeSession = sessionList[0]
  if (!activeSession) {
    deleteCookie(event, COOKIE_NAME, { path: '/' })
    return null
  }

  // Find admin user
  const userList = await db
    .select()
    .from(admins)
    .where(eq(admins.id, activeSession.userId))
    .limit(1)

  const admin = userList[0]
  if (!admin) {
    deleteCookie(event, COOKIE_NAME, { path: '/' })
    return null
  }

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    username: admin.username,
    role: admin.role,
    provider: admin.provider,
    avatarUrl: admin.avatarUrl,
    createdAt: admin.createdAt,
  }
}

export async function requireAdminAuth(event: H3Event): Promise<SafeAdminUser> {
  const admin = await getAdminFromSession(event)
  if (!admin) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Obehörig – vänligen logga in som administratör',
    })
  }
  return admin
}

import { eq, or, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../db/client'
import { admins } from '../../db/schema'
import { generateSalt, hashPassword, requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  const name = (body.name || '').trim()
  const email = (body.email || '').trim().toLowerCase()
  const username = (body.username || email.split('@')[0] || '').trim().toLowerCase()
  const role = (body.role || 'Administratör').trim()
  const password = body.password || ''

  if (!name || !email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Namn, e-postadress och lösenord krävs',
    })
  }

  if (password.length < 6) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Lösenordet måste vara minst 6 tecken långt',
    })
  }

  // Check for duplicate email or username
  const existing = await db
    .select()
    .from(admins)
    .where(
      or(
        sql`lower(${admins.email}) = ${email}`,
        sql`lower(${admins.username}) = ${username}`
      )
    )
    .limit(1)

  if (existing.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: 'En administratör med denna e-post eller användarnamn finns redan',
    })
  }

  const salt = generateSalt()
  const passwordHash = hashPassword(password, salt)
  const id = `admin-${nanoid(8)}`
  const now = new Date()

  await db.insert(admins).values({
    id,
    name,
    email,
    username,
    role,
    passwordHash,
    salt,
    provider: 'credentials',
    avatarUrl: body.avatarUrl || '/media/brand/Logotyp_mini.webp',
    createdAt: now,
    updatedAt: now,
  })

  return {
    success: true,
    user: {
      id,
      name,
      email,
      username,
      role,
      provider: 'credentials',
      avatarUrl: body.avatarUrl || '/media/brand/Logotyp_mini.webp',
      createdAt: now,
    },
  }
})

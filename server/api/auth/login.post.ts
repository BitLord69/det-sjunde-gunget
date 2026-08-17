import { eq, or, sql } from 'drizzle-orm'
import { db } from '../../db/client'
import { admins } from '../../db/schema'
import { createAdminSession, verifyPassword } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const identifier = (body.identifier || '').trim().toLowerCase()
  const password = body.password || ''

  if (!identifier || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Vänligen ange både användarnamn/e-post och lösenord',
    })
  }

  // Find user by email or username (case-insensitive)
  const userList = await db
    .select()
    .from(admins)
    .where(
      or(
        sql`lower(${admins.email}) = ${identifier}`,
        sql`lower(${admins.username}) = ${identifier}`
      )
    )
    .limit(1)

  const admin = userList[0]

  if (!admin || !admin.passwordHash || !admin.salt) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Felaktigt användarnamn/e-post eller lösenord',
    })
  }

  const isValid = verifyPassword(password, admin.salt, admin.passwordHash)
  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Felaktigt användarnamn/e-post eller lösenord',
    })
  }

  // Create session and set HTTP-only cookie
  await createAdminSession(admin.id, event)

  return {
    success: true,
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      username: admin.username,
      role: admin.role,
      provider: admin.provider,
      avatarUrl: admin.avatarUrl,
    },
  }
})

import { and, eq, ne, or, sql } from 'drizzle-orm'
import { db } from '../../db/client'
import { admins } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const currentAdmin = await requireAdminAuth(event)
  const body = await readBody(event)

  const name = (body.name || currentAdmin.name || '').trim()
  const email = (body.email || '').trim().toLowerCase()
  const username = (body.username || currentAdmin.username || '').trim().toLowerCase()
  const avatarUrl = body.avatarUrl !== undefined ? body.avatarUrl : currentAdmin.avatarUrl

  if (!email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Vänligen ange en giltig e-postadress',
    })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Ogiltigt e-postformat',
    })
  }

  // Check if another admin already uses this email or username
  const existing = await db
    .select()
    .from(admins)
    .where(
      and(
        ne(admins.id, currentAdmin.id),
        or(
          sql`lower(${admins.email}) = ${email}`,
          sql`lower(${admins.username}) = ${username}`
        )
      )
    )
    .limit(1)

  if (existing.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: 'En annan administratör använder redan denna e-postadress eller användarnamn',
    })
  }

  const now = new Date()

  await db
    .update(admins)
    .set({
      name,
      email,
      username,
      avatarUrl,
      updatedAt: now,
    })
    .where(eq(admins.id, currentAdmin.id))

  const updatedAdmin = {
    id: currentAdmin.id,
    name,
    email,
    username,
    role: currentAdmin.role,
    provider: currentAdmin.provider,
    avatarUrl,
    createdAt: currentAdmin.createdAt,
  }

  return {
    success: true,
    user: updatedAdmin,
    message: 'Din profil och e-postadress har uppdaterats!',
  }
})

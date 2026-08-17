import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { admins } from '../../db/schema'
import {
  generateSalt,
  hashPassword,
  requireAdminAuth,
  verifyPassword,
} from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const currentAdmin = await requireAdminAuth(event)
  const body = await readBody(event)

  const currentPassword = body.currentPassword || ''
  const newPassword = body.newPassword || ''

  if (!currentPassword || !newPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Vänligen ange både nuvarande och nytt lösenord',
    })
  }

  if (newPassword.length < 6) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Det nya lösenordet måste innehålla minst 6 tecken',
    })
  }

  // Fetch full admin with hash and salt
  const userList = await db
    .select()
    .from(admins)
    .where(eq(admins.id, currentAdmin.id))
    .limit(1)

  const admin = userList[0]
  if (!admin || !admin.salt || !admin.passwordHash) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Konto saknar lösenord eller använder extern inloggning',
    })
  }

  const isCurrentValid = verifyPassword(currentPassword, admin.salt, admin.passwordHash)
  if (!isCurrentValid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Nuvarande lösenord stämmer inte',
    })
  }

  const newSalt = generateSalt()
  const newHash = hashPassword(newPassword, newSalt)
  const now = new Date()

  await db
    .update(admins)
    .set({
      passwordHash: newHash,
      salt: newSalt,
      updatedAt: now,
    })
    .where(eq(admins.id, currentAdmin.id))

  return {
    success: true,
    message: 'Ditt lösenord har uppdaterats',
  }
})

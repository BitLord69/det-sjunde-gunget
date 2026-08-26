import { and, eq, gt } from 'drizzle-orm'
import { db } from '../../db/client'
import { admins, verification } from '../../db/schema'
import { createAdminSession, generateSalt, hashPassword } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const token = (body.token || '').trim()
  const newPassword = body.newPassword || ''

  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Återställningstoken saknas',
    })
  }

  if (!newPassword || newPassword.length < 6) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Det nya lösenordet måste vara minst 6 tecken långt',
    })
  }

  const now = new Date()

  // Find matching, unexpired verification token
  const tokenList = await db
    .select()
    .from(verification)
    .where(and(eq(verification.value, token), gt(verification.expiresAt, now)))
    .limit(1)

  const verificationRecord = tokenList[0]

  if (!verificationRecord) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Återställningslänken är ogiltig eller har gått ut. Vänligen begär en ny länk.',
    })
  }

  // Extract adminId from identifier (format: password-reset:adminId)
  const adminId = verificationRecord.identifier.replace('password-reset:', '')

  const adminList = await db
    .select()
    .from(admins)
    .where(eq(admins.id, adminId))
    .limit(1)

  const admin = adminList[0]

  if (!admin) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Användarkontot kunde inte hittas.',
    })
  }

  // Generate new salt and password hash
  const salt = generateSalt()
  const passwordHash = hashPassword(newPassword, salt)

  // Update password in database
  await db
    .update(admins)
    .set({
      passwordHash,
      salt,
      updatedAt: now,
    })
    .where(eq(admins.id, admin.id))

  // Invalidate/delete the used token
  await db
    .delete(verification)
    .where(eq(verification.id, verificationRecord.id))

  // Create session to log user in immediately
  await createAdminSession(admin.id, event)

  return {
    success: true,
    message: 'Ditt lösenord har uppdaterats! Du är nu inloggad.',
  }
})

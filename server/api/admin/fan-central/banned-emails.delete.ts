import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { bannedEmails } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  const { id, email } = body
  if (!id && !email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID eller e-post krävs för att häva spärr.',
    })
  }

  if (id) {
    await db.delete(bannedEmails).where(eq(bannedEmails.id, id))
  } else if (email) {
    await db.delete(bannedEmails).where(eq(bannedEmails.email, email.trim().toLowerCase()))
  }

  return {
    success: true,
    message: 'Spärren har hävts för användaren.',
  }
})

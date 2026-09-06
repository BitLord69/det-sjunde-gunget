import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../../db/client'
import { bannedEmails, fanSubmissions } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminAuth(event)
  const body = await readBody(event)

  const email = body.email ? body.email.toString().trim().toLowerCase() : ''
  if (!email || !email.includes('@')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Giltig e-postadress krävs för att spärra.',
    })
  }

  const reason = body.reason || 'Regelbrott / olämpligt innehåll'
  const bannedBy = admin.name || admin.username || admin.email || 'Admin'
  const now = new Date()

  // Insert or ignore if already banned
  const existing = await db
    .select()
    .from(bannedEmails)
    .where(eq(bannedEmails.email, email))
    .limit(1)

  if (existing.length === 0) {
    await db.insert(bannedEmails).values({
      id: `ban-${nanoid(8)}`,
      email,
      reason,
      bannedBy,
      bannedAt: now,
      createdAt: now,
      updatedAt: now,
    })
  }

  // If requested, mark all submissions from this email as rejected
  if (body.rejectPendingPhotos !== false) {
    await db
      .update(fanSubmissions)
      .set({
        status: 'rejected',
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(fanSubmissions.uploaderEmail, email))
  }

  return {
    success: true,
    message: `E-postadressen ${email} har spärrats.`,
  }
})

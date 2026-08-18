import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { db } from '../db/client'
import { subscribers } from '../db/schema'
import { addOrUpdateContact } from '../utils/brevo'

const newsletterSchema = z.object({
  email: z.string().email('Ange en giltig e-postadress'),
  honeypot: z.string().optional().default(''),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parseResult = newsletterSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ogiltig e-postadress',
    })
  }

  const { email, honeypot } = parseResult.data

  if (honeypot && honeypot.trim().length > 0) {
    console.warn('[Newsletter] Honeypot triggered by bot signup:', email)
    return { success: true, message: 'Subscribed' }
  }

  const normalizedEmail = email.toLowerCase().trim()
  const now = new Date()

  try {
    // Check if subscriber exists
    const existing = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, normalizedEmail))
      .limit(1)

    if (existing.length > 0) {
      // Re-subscribe if previously unsubscribed
      await db
        .update(subscribers)
        .set({
          status: 'subscribed',
          unsubscribedAt: null,
          updatedAt: now,
        })
        .where(eq(subscribers.email, normalizedEmail))
    } else {
      // Insert new subscriber
      await db.insert(subscribers).values({
        id: `sub-${nanoid(10)}`,
        email: normalizedEmail,
        status: 'subscribed',
        subscribedAt: now,
      })
    }

    // Sync to Brevo contact list
    await addOrUpdateContact({
      email: normalizedEmail,
      attributes: {
        SIGNUP_DATE: now.toISOString().split('T')[0],
        SOURCE: 'Det 7:e Gunget Website',
      },
    })

    return {
      success: true,
      message: 'Tack för att du prenumererar! Du missar inte en enda spelning framöver.',
    }
  } catch (error: any) {
    console.error('[Newsletter] Error registering subscriber:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Kunde inte spara prenumerationen. Försök igen senare.',
    })
  }
})

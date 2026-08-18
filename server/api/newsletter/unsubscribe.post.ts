import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/client'
import { subscribers } from '../../db/schema'
import { unsubscribeContact } from '../../utils/brevo'

const unsubscribeSchema = z.object({
  email: z.string().email('Ange en giltig e-postadress'),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parseResult = unsubscribeSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ogiltig e-postadress',
    })
  }

  const { email } = parseResult.data
  const normalizedEmail = email.toLowerCase().trim()
  const now = new Date()

  try {
    // 1. Update database record
    await db
      .update(subscribers)
      .set({
        status: 'unsubscribed',
        unsubscribedAt: now,
        updatedAt: now,
      })
      .where(eq(subscribers.email, normalizedEmail))

    // 2. Sync unsubscribe to Brevo
    await unsubscribeContact(normalizedEmail)

    return {
      success: true,
      message: 'Du har blivit avregistrerad från nyhetsbrevet.',
    }
  } catch (error: any) {
    console.error('[Newsletter] Unsubscribe error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Kunde inte avregistrera. Kontakta kontakt@det7egunget.se för manuell hjälp.',
    })
  }
})

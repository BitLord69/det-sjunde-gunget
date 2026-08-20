import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { siteSettings } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)
  const now = new Date()

  if (body.newsletterEnabled !== undefined) {
    const val = body.newsletterEnabled ? 'true' : 'false'
    const existing = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'newsletter_enabled'))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(siteSettings)
        .set({ value: val, updatedAt: now })
        .where(eq(siteSettings.key, 'newsletter_enabled'))
    } else {
      await db
        .insert(siteSettings)
        .values({
          key: 'newsletter_enabled',
          value: val,
          createdAt: now,
          updatedAt: now,
        })
    }
  }

  return { success: true }
})

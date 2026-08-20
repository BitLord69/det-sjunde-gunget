import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { siteSettings } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)
  const now = new Date()

  const upsertSetting = async (key: string, value: string) => {
    await db
      .insert(siteSettings)
      .values({
        key,
        value,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: {
          value,
          updatedAt: now,
        },
      })
  }

  const tasks: Promise<any>[] = []

  if (body.newsletterEnabled !== undefined) {
    tasks.push(upsertSetting('newsletter_enabled', body.newsletterEnabled ? 'true' : 'false'))
  }

  if (body.landingSongCount !== undefined) {
    const songCountVal = String(Math.max(2, Math.min(10, parseInt(body.landingSongCount, 10) || 4)))
    tasks.push(upsertSetting('landing_song_count', songCountVal))
  }

  if (body.landingMerchCount !== undefined) {
    const merchCountVal = String(Math.max(2, Math.min(8, parseInt(body.landingMerchCount, 10) || 4)))
    tasks.push(upsertSetting('landing_merch_count', merchCountVal))
  }

  if (tasks.length > 0) {
    await Promise.all(tasks)
  }

  return { success: true }
})

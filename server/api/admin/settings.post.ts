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

  if (body.geminiApiKey !== undefined) {
    tasks.push(upsertSetting('gemini_api_key', body.geminiApiKey.trim()))
  }

  if (body.customCoverPrompt !== undefined) {
    tasks.push(upsertSetting('custom_cover_prompt', body.customCoverPrompt.trim()))
  }

  if (body.discordWebhookUrl !== undefined) {
    tasks.push(upsertSetting('discord_webhook_url', body.discordWebhookUrl.trim()))
  }

  if (body.discordNotifyBookings !== undefined) {
    tasks.push(upsertSetting('discord_notify_bookings', body.discordNotifyBookings ? 'true' : 'false'))
  }

  if (body.discordNotifyFanPhotos !== undefined) {
    tasks.push(upsertSetting('discord_notify_fan_photos', body.discordNotifyFanPhotos ? 'true' : 'false'))
  }

  if (body.discordNotifyGuestbook !== undefined) {
    tasks.push(upsertSetting('discord_notify_guestbook', body.discordNotifyGuestbook ? 'true' : 'false'))
  }

  if (body.notificationEmail !== undefined) {
    tasks.push(upsertSetting('notification_email', body.notificationEmail.trim()))
  }

  if (tasks.length > 0) {
    await Promise.all(tasks)
  }

  return { success: true }
})

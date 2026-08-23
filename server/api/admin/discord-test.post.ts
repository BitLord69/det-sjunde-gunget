import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { siteSettings } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'
import { sendDiscordWebhook } from '../../utils/discord'

export default defineEventHandler(async (event) => {
  const adminUser = await requireAdminAuth(event)
  const body = await readBody(event).catch(() => ({}))

  let webhookUrl = (body.webhookUrl || '').trim()

  // If no URL sent in body, check stored setting
  if (!webhookUrl) {
    const saved = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'discord_webhook_url'))
      .get()

    if (saved?.value) {
      webhookUrl = saved.value.trim()
    }
  }

  if (!webhookUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ingen Discord Webhook URL angiven. Fyll i fältet och spara först.',
    })
  }

  const now = new Date()
  const timeStr = now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString('sv-SE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const result = await sendDiscordWebhook(webhookUrl, {
    title: '🎸 Testnotis från Det 7:e Gunget!',
    description: 'Om du ser detta meddelande i kanalen fungerar kopplingen klockrent! 🎉\nFramtida bokningsförfrågningar och viktiga händelser kommer att plinga till här direkt.',
    color: 0xe2bd72,
    fields: [
      {
        name: '✅ Webhook Status',
        value: 'Koppling aktiv och verifierad',
        inline: true,
      },
      {
        name: '👤 Testat av',
        value: adminUser.name || adminUser.username,
        inline: true,
      },
      {
        name: '⏰ Tidpunkt',
        value: `${dateStr} kl ${timeStr}`,
        inline: false,
      },
      {
        name: '🎛️ Adminpanel',
        value: '[Öppna Admin](https://det7egunget.se/admin)',
        inline: false,
      },
    ],
    footerText: 'Det 7:e Gunget • Notistest',
  })

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: result.error || 'Kunde inte skicka testnotis till Discord',
    })
  }

  return {
    success: true,
    message: '✓ Testnotis har skickats till din Discord-kanal!',
  }
})

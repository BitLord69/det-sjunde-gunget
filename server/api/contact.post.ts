import { nanoid } from 'nanoid'
import { z } from 'zod'
import { db } from '../db/client'
import { messages, siteSettings } from '../db/schema'
import { sendTransactionalEmail } from '../utils/brevo'
import { sendDiscordBookingAlert } from '../utils/discord'

const contactSchema = z.object({
  name: z.string().min(2, 'Namn måste vara minst 2 tecken'),
  email: z.string().email('Ogiltig e-postadress'),
  phone: z.string().optional().default(''),
  eventType: z.string().optional().default('Klubb / Pub'),
  date: z.string().optional().default(''),
  location: z.string().optional().default(''),
  message: z.string().min(5, 'Meddelandet måste vara minst 5 tecken'),
  honeypot: z.string().optional().default(''),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parseResult = contactSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valideringsfel',
      data: parseResult.error.flatten(),
    })
  }

  const { name, email, phone, eventType, date, location, message, honeypot } = parseResult.data

  // Spam bot trap: if honeypot is filled, return success without saving or sending
  if (honeypot && honeypot.trim().length > 0) {
    console.warn('[Contact] Honeypot triggered by bot submission from email:', email)
    return { success: true, message: 'Inquiry received' }
  }

  const id = `msg-${nanoid(10)}`
  const now = new Date()

  // 1. Store in Database
  try {
    await db.insert(messages).values({
      id,
      name,
      email,
      phone: phone || null,
      eventType: eventType || null,
      eventDate: date || null,
      location: location || null,
      body: message,
      status: 'unread',
      createdAt: now,
    })
  } catch (dbError: any) {
    console.error('[Contact] Error saving message to database:', dbError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Kunde inte spara bokningsförfrågan i databasen.',
    })
  }

  // Fetch site settings for notifications
  const settingsList = await db.select().from(siteSettings).catch(() => [])
  const settingsMap: Record<string, string> = {}
  for (const s of settingsList) {
    settingsMap[s.key] = s.value
  }

  const rawBandEmails = settingsMap.notification_email || process.env.BREVO_CONTACT_EMAIL || 'kontakt@det7egunget.se'
  const recipientEmails = rawBandEmails
    .split(/[,;\s]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && e.includes('@'))

  const bandEmail = recipientEmails[0] || 'kontakt@det7egunget.se'
  const bandRecipients = recipientEmails.length > 0
    ? recipientEmails.map((email) => ({ email, name: 'Det 7:e Gunget' }))
    : [{ email: bandEmail, name: 'Det 7:e Gunget' }]

  const discordWebhookUrl = settingsMap.discord_webhook_url || process.env.DISCORD_WEBHOOK_URL || ''
  const discordNotifyBookings = settingsMap.discord_notify_bookings !== 'false'

  // 2. Dispatch Discord Webhook Alert (if configured)
  if (discordWebhookUrl && discordNotifyBookings) {
    try {
      await sendDiscordBookingAlert(
        discordWebhookUrl,
        {
          id,
          name,
          email,
          phone,
          eventType,
          eventDate: date,
          location,
          message,
        },
        `https://det7egunget.se/admin/messages/${id}`,
      )
    } catch (discordErr) {
      console.error('[Contact] Discord alert error:', discordErr)
    }
  }

  // 3. Send notification email to the band
  const bandNotificationHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #17120e; color: #f5eedc; border-radius: 12px; border: 1px solid #c87f3f;">
      <h2 style="color: #e2bd72; margin-top: 0; font-size: 22px;">🎸 Ny bokningsförfrågan mottagen!</h2>
      <p style="color: #d1c7b7; font-size: 14px;">En ny förfrågan har skickats via kontaktformuläret på <strong>det7egunget.se</strong>.</p>
      
      <div style="background-color: #241c16; padding: 18px; border-radius: 8px; border-left: 4px solid #e2bd72; margin: 20px 0;">
        <table style="width: 100%; font-size: 14px; border-collapse: collapse; color: #f5eedc;">
          <tr><td style="padding: 6px 0; width: 140px; color: #e2bd72; font-weight: bold;">Kontaktperson:</td><td>${escapeHtml(name)}</td></tr>
          <tr><td style="padding: 6px 0; color: #e2bd72; font-weight: bold;">E-post:</td><td><a href="mailto:${escapeHtml(email)}" style="color: #fca311; text-decoration: underline;">${escapeHtml(email)}</a></td></tr>
          <tr><td style="padding: 6px 0; color: #e2bd72; font-weight: bold;">Telefon:</td><td>${escapeHtml(phone || 'Ej angivet')}</td></tr>
          <tr><td style="padding: 6px 0; color: #e2bd72; font-weight: bold;">Typ av event:</td><td>${escapeHtml(eventType || 'Ej angivet')}</td></tr>
          <tr><td style="padding: 6px 0; color: #e2bd72; font-weight: bold;">Önskat datum:</td><td>${escapeHtml(date || 'Ej angivet')}</td></tr>
          <tr><td style="padding: 6px 0; color: #e2bd72; font-weight: bold;">Plats / stad:</td><td>${escapeHtml(location || 'Ej angivet')}</td></tr>
        </table>
      </div>

      <div style="background-color: #241c16; padding: 18px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #e2bd72; margin-top: 0; font-size: 15px;">Meddelande:</h3>
        <p style="white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #ffffff; margin-bottom: 0;">${escapeHtml(message)}</p>
      </div>

      <div style="margin: 24px 0 16px; text-align: center;">
        <a href="https://det7egunget.se/admin/messages/${id}" style="background-color: #e2bd72; color: #17120e; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(226, 189, 114, 0.35);">
          👉 Hantera förfrågan i Admin Panel
        </a>
      </div>

      <p style="font-size: 12px; color: #8c8275; margin-top: 20px; border-top: 1px solid #3d2f25; padding-top: 12px; text-align: center;">
        Detta meddelande skickades automatiskt från webbplatsen Det 7:e Gunget (ID: ${id}).
      </p>
    </div>
  `

  try {
    await sendTransactionalEmail({
      to: bandRecipients,
      replyTo: { email, name },
      subject: `🎸 Ny bokningsförfrågan från ${name} (${eventType || 'Spelning'})`,
      htmlContent: bandNotificationHtml,
    })
  } catch (emailErr) {
    console.error('[Contact] Failed to send band notification email:', emailErr)
  }

  // 3. Send confirmation email to the sender
  const confirmationHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #17120e; color: #f5eedc; border-radius: 12px; border: 1px solid #c87f3f;">
      <h2 style="color: #e2bd72; margin-top: 0; font-size: 22px;">Tack för din förfrågan, ${escapeHtml(name)}!</h2>
      <p style="color: #d1c7b7; font-size: 15px; line-height: 1.6;">
        Vi i <strong>Det 7:e Gunget</strong> har tagit emot ditt meddelande och återkommer till dig så snart som möjligt för att prata datum, upplägg och sväng!
      </p>
      
      <div style="background-color: #241c16; padding: 16px; border-radius: 8px; border-left: 4px solid #e2bd72; margin: 20px 0; font-size: 13px; color: #d1c7b7;">
        <strong style="color: #e2bd72; display: block; margin-bottom: 6px;">Sammanfattning av din förfrågan:</strong>
        <p style="margin: 3px 0;"><strong>Event:</strong> ${escapeHtml(eventType || 'Ej specificerat')}</p>
        <p style="margin: 3px 0;"><strong>Datum:</strong> ${escapeHtml(date || 'Ej specificerat')}</p>
        <p style="margin: 3px 0;"><strong>Plats:</strong> ${escapeHtml(location || 'Ej specificerat')}</p>
      </div>

      <p style="color: #d1c7b7; font-size: 14px; line-height: 1.6;">
        Har du brådskande funderingar kan du alltid nå oss direkt på <a href="mailto:${bandEmail}" style="color: #fca311;">${bandEmail}</a>.
      </p>

      <p style="margin-top: 24px; font-size: 14px; color: #e2bd72; font-weight: bold;">
        Bästa hälsningar,<br>
        Janis, Bosse, Marcus & Jonas<br>
        <span style="font-size: 12px; color: #8c8275; font-weight: normal;">Det 7:e Gunget • Blues & Rock 'n' Roll</span>
      </p>
    </div>
  `

  await sendTransactionalEmail({
    to: [{ email, name }],
    replyTo: { email: bandEmail, name: 'Det 7:e Gunget' },
    subject: `Tack för din bokningsförfrågan till Det 7:e Gunget!`,
    htmlContent: confirmationHtml,
  })

  return {
    success: true,
    messageId: id,
    message: 'Tack för er förfrågan! Vi har skickat en bekräftelse till er e-post.',
  }
})

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

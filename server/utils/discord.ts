import { db } from '../db/client'
import { siteSettings } from '../db/schema'
import {
  generateAnalyticsDashboardPng,
  getAnalyticsDashboardData,
  RANGE_LABELS,
} from './analyticsReport'

export interface DiscordEmbedField {
  name: string
  value: string
  inline?: boolean
}

export interface DiscordNotificationOptions {
  webhookUrl?: string
  title: string
  description?: string
  color?: number // Integer color, e.g. 0xe2bd72 (gold) or 0xc87f3f (amber)
  fields?: DiscordEmbedField[]
  url?: string
  footerText?: string
  authorName?: string
  authorIcon?: string
  attachment?: {
    buffer: Buffer
    filename: string
  }
}

const DEFAULT_AVATAR = 'https://sjundegunget.se/favicon.ico'
const EMBED_GOLD_COLOR = 0xe2bd72 // #e2bd72 brand gold

/**
 * Sends a rich embed message to a Discord Webhook (with optional PNG image attachment)
 */
export async function sendDiscordWebhook(
  webhookUrl: string,
  options: DiscordNotificationOptions,
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    return { success: false, error: 'Ogiltig Discord Webhook URL' }
  }

  const embedObj: Record<string, unknown> = {
    title: options.title,
    description: options.description || undefined,
    url: options.url || undefined,
    color: options.color || EMBED_GOLD_COLOR,
    fields: options.fields || [],
    author: options.authorName
      ? {
          name: options.authorName,
          icon_url: options.authorIcon || DEFAULT_AVATAR,
        }
      : undefined,
    footer: {
      text: options.footerText || 'Det 7:e Gunget • Notissystem',
      icon_url: DEFAULT_AVATAR,
    },
    timestamp: new Date().toISOString(),
  }

  if (options.attachment) {
    embedObj.image = {
      url: `attachment://${options.attachment.filename}`,
    }
  }

  const payload = {
    username: 'Det 7:e Gunget Alert',
    avatar_url: DEFAULT_AVATAR,
    embeds: [embedObj],
  }

  try {
    let res: Response

    if (options.attachment) {
      const formData = new FormData()
      formData.append('payload_json', JSON.stringify(payload))
      const blob = new Blob([new Uint8Array(options.attachment.buffer)], { type: 'image/png' })
      formData.append('files[0]', blob, options.attachment.filename)

      res = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      })
    } else {
      res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => '')
      console.error('[Discord Webhook] Failed to send message:', res.status, errorText)
      return { success: false, error: `Discord svarade med HTTP ${res.status}: ${errorText}` }
    }

    return { success: true }
  } catch (err: unknown) {
    console.error('[Discord Webhook] Network exception:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Nätverksfel vid anrop till Discord' }
  }
}

/**
 * Generates and sends the visual Analytics Dashboard PNG + summary embed to Discord
 */
export async function sendDiscordAnalyticsReport(options?: {
  webhookUrl?: string
  range?: string
  forceSend?: boolean
}): Promise<{ success: boolean; skipped?: boolean; reason?: string; range?: string; error?: string }> {
  const rows = await db.select().from(siteSettings)
  const settingsMap: Record<string, string> = {}
  for (const r of rows) {
    settingsMap[r.key] = r.value
  }

  const isEnabled = settingsMap.discord_notify_daily_stats !== 'false'
  if (!options?.forceSend && !isEnabled) {
    return { success: true, skipped: true, reason: 'Daglig statistikrapport är avstängd i inställningar' }
  }

  const webhookUrl = (options?.webhookUrl || settingsMap.discord_webhook_url || '').trim()
  if (!webhookUrl) {
    if (!options?.forceSend) {
      return { success: true, skipped: true, reason: 'Ingen Discord Webhook URL konfigurerad' }
    }
    return { success: false, error: 'Ingen Discord Webhook URL angiven. Fyll i fältet under Inställningar först.' }
  }

  const targetRange = options?.range || settingsMap.discord_stats_range || '7d'
  const rangeLabel = RANGE_LABELS[targetRange] || 'Senaste 7 dagarna'

  const data = await getAnalyticsDashboardData(targetRange)
  const pngBuffer = await generateAnalyticsDashboardPng(data)

  const visGrowthStr =
    data.summary.visitorsGrowthPct !== null && data.summary.visitorsGrowthPct !== undefined
      ? ` (${data.summary.visitorsGrowthPct >= 0 ? `+${data.summary.visitorsGrowthPct}%` : `${data.summary.visitorsGrowthPct}%`})`
      : ''

  const pvGrowthStr =
    data.summary.pageviewsGrowthPct !== null && data.summary.pageviewsGrowthPct !== undefined
      ? ` (${data.summary.pageviewsGrowthPct >= 0 ? `+${data.summary.pageviewsGrowthPct}%` : `${data.summary.pageviewsGrowthPct}%`})`
      : ''

  const topPageText =
    data.topPages.length > 0
      ? data.topPages
          .slice(0, 3)
          .map((p, idx) => `${idx + 1}. **${p.label}** (${p.views} visn.)`)
          .join('\n')
      : 'Inga sidvisningar ännu'

  const topSongText =
    data.bandTelemetry.topSongs.length > 0
      ? data.bandTelemetry.topSongs
          .slice(0, 3)
          .map((s, idx) => `${idx + 1}. **${s.title}** (${s.plays} speln. / ${s.lyricsViews} text)`)
          .join('\n')
      : 'Inga låtspelningar ännu'

  const fields: DiscordEmbedField[] = [
    {
      name: '👥 Unika besökare & Sidvisningar',
      value: `**${data.summary.uniqueVisitors}** unika besökare${visGrowthStr}\n**${data.summary.pageviews}** sidvisningar${pvGrowthStr}`,
      inline: true,
    },
    {
      name: '🎵 Jukebox, Gig & EPK',
      value: `**${data.summary.jukeboxPlays}** låtspelningar • **${data.summary.lyricsViews}** låttexter\n**${data.summary.gigInteractions}** gig-klick • **${data.summary.epkInteractions}** EPK-laddningar`,
      inline: true,
    },
    {
      name: '🔥 Populäraste sidorna',
      value: topPageText,
      inline: true,
    },
    {
      name: '🎸 Hetaste låtarna',
      value: topSongText,
      inline: true,
    },
    {
      name: '📊 Öppna fullständig statistik',
      value: '[Öppna Statistik & Publikpuls i Admin](https://sjundegunget.se/admin/analytics)',
      inline: false,
    },
  ]

  const sendRes = await sendDiscordWebhook(webhookUrl, {
    title: `📊 Statistikrapport — Det 7:e Gunget (${rangeLabel})`,
    description: `Här är en aktuell visuell sammanställning av besöksstatistiken och publikpulsen på **sjundegunget.se**.`,
    url: 'https://sjundegunget.se/admin/analytics',
    color: 0xe2bd72,
    fields,
    footerText: `Det 7:e Gunget • Besöksstatistik (${rangeLabel})`,
    attachment: {
      buffer: pngBuffer,
      filename: 'statistikrapport.png',
    },
  })

  return {
    ...sendRes,
    range: targetRange,
  }
}

/**
 * Formats and sends a rich booking / contact inquiry embed to Discord
 */
export async function sendDiscordBookingAlert(
  webhookUrl: string,
  data: {
    id: string
    name: string
    email: string
    phone?: string | null
    eventType?: string | null
    eventDate?: string | null
    venue?: string | null
    streetAddress?: string | null
    postalCode?: string | null
    city?: string | null
    website?: string | null
    location?: string | null
    message: string
  },
  adminUrl?: string,
): Promise<{ success: boolean; error?: string }> {
  const addressParts = [
    data.venue ? `**Lokal:** ${data.venue}` : null,
    data.streetAddress ? `**Adress:** ${data.streetAddress}` : null,
    [data.postalCode, data.city].filter(Boolean).length > 0 ? `**Ort:** ${[data.postalCode, data.city].filter(Boolean).join(' ')}` : null,
  ].filter(Boolean)

  const placeStr = addressParts.length > 0 ? addressParts.join('\n') : (data.location ? `**Plats:** ${data.location}` : 'Ej specificerat')
  const websiteLine = data.website ? `\n🌐 [${data.website}](${data.website.startsWith('http') ? data.website : `https://${data.website}`})` : ''

  const fields: DiscordEmbedField[] = [
    {
      name: '👤 Kontaktperson',
      value: `**${data.name}**\n📧 [${data.email}](mailto:${data.email})${data.phone ? `\n📞 ${data.phone}` : ''}${websiteLine}`,
      inline: true,
    },
    {
      name: '📅 Eventdetaljer',
      value: `**Typ:** ${data.eventType || 'Ej specificerat'}\n**Datum:** ${data.eventDate || 'Ej specificerat'}\n${placeStr}`,
      inline: true,
    },
    {
      name: '💬 Meddelande',
      value: data.message.length > 900 ? `${data.message.substring(0, 900)}...` : data.message,
      inline: false,
    },
  ]

  if (adminUrl) {
    fields.push({
      name: '🔗 Hantera förfrågan',
      value: `[Öppna Admin Panel](${adminUrl})`,
      inline: false,
    })
  }

  return sendDiscordWebhook(webhookUrl, {
    title: `🎸 Ny bokningsförfrågan från ${data.name}!`,
    description: `En ny förfrågan har skickats via kontaktformuläret på webbplatsen.`,
    color: 0xe2bd72,
    fields,
    footerText: `Det 7:e Gunget (ID: ${data.id})`,
  })
}

/**
 * Formats and sends a rich fan photo submission alert to Discord
 */
export async function sendDiscordFanPhotoAlert(
  webhookUrl: string,
  data: {
    id: string
    email: string
    name?: string | null
    caption?: string | null
    location?: string | null
    takenWhen?: string | null
    mediaUrl: string
  },
  adminUrl?: string,
): Promise<{ success: boolean; error?: string }> {
  const fields: DiscordEmbedField[] = [
    {
      name: '👤 Inskickat av',
      value: `${data.name ? `**${data.name}**\n` : ''}📧 [${data.email}](mailto:${data.email})`,
      inline: true,
    },
    {
      name: '📍 Plats & Tid',
      value: `**Var:** ${data.location || 'Ej angivet'}\n**När:** ${data.takenWhen || 'Ej angivet'}`,
      inline: true,
    },
  ]

  if (data.caption) {
    fields.push({
      name: '💬 Kommentar / Hälsning',
      value: data.caption.length > 500 ? `${data.caption.substring(0, 500)}...` : data.caption,
      inline: false,
    })
  }

  if (adminUrl) {
    fields.push({
      name: '🔍 Granska bild i admin',
      value: `[Klicka här för att godkänna eller avvisa fotot](${adminUrl})`,
      inline: false,
    })
  }

  return sendDiscordWebhook(webhookUrl, {
    title: `📸 Ny fan-bild inskickad till Fan Central!`,
    description: `En besökare har skickat in ett foto till korktavlan som väntar på godkännande i staging-kön.`,
    color: 0xf5b041, // warm amber/gold
    fields,
    footerText: `Det 7:e Gunget Fan Central (ID: ${data.id})`,
  })
}

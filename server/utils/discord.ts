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
}

const DEFAULT_AVATAR = 'https://det7egunget.se/favicon.ico'
const EMBED_GOLD_COLOR = 0xe2bd72 // #e2bd72 brand gold

/**
 * Sends a rich embed message to a Discord Webhook
 */
export async function sendDiscordWebhook(
  webhookUrl: string,
  options: DiscordNotificationOptions,
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    return { success: false, error: 'Ogiltig Discord Webhook URL' }
  }

  const payload = {
    username: 'Det 7:e Gunget Alert',
    avatar_url: DEFAULT_AVATAR,
    embeds: [
      {
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
      },
    ],
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => '')
      console.error('[Discord Webhook] Failed to send message:', res.status, errorText)
      return { success: false, error: `Discord svarade med HTTP ${res.status}: ${errorText}` }
    }

    return { success: true }
  } catch (err: any) {
    console.error('[Discord Webhook] Network exception:', err)
    return { success: false, error: err.message || 'Nätverksfel vid anrop till Discord' }
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
    location?: string | null
    message: string
  },
  adminUrl?: string,
): Promise<{ success: boolean; error?: string }> {
  const fields: DiscordEmbedField[] = [
    {
      name: '👤 Kontaktperson',
      value: `**${data.name}**\n📧 [${data.email}](mailto:${data.email})${data.phone ? `\n📞 ${data.phone}` : ''}`,
      inline: true,
    },
    {
      name: '📅 Eventdetaljer',
      value: `**Typ:** ${data.eventType || 'Ej specificerat'}\n**Datum:** ${data.eventDate || 'Ej specificerat'}\n**Plats:** ${data.location || 'Ej specificerat'}`,
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

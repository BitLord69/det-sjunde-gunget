import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../db/client'
import { siteSettings, videos } from '../db/schema'
import { publishToSocialMedia } from './social'

export interface ParsedYouTubeVideo {
  videoId: string
  title: string
  url: string
  publishedAt: number
  description?: string
  thumbnailUrl?: string
}

function unescapeXml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export function extractYouTubeId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim()
  // Direct 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed
  }

  // Matches youtu.be/<id>, watch?v=<id>, embed/<id>, shorts/<id>
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/,
  )
  return match && match[1] ? match[1] : null
}

export async function resolveChannelId(input: string): Promise<string> {
  const trimmed = input.trim()
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(trimmed)) {
    return trimmed
  }

  // Handle formats like "@det7egunget", "det7egunget", or full URL "https://youtube.com/@det7egunget"
  let handle = trimmed
  if (handle.includes('youtube.com/')) {
    const parts = handle.split('youtube.com/')
    const part = parts[1] || ''
    handle = part.replace(/^\/?@?/, '')
  } else {
    handle = handle.replace(/^@/, '')
  }

  // Pre-configured known channel ID for Det 7:e Gunget
  if (handle.toLowerCase() === 'det7egunget') {
    return 'UCFbpKRd0ggDlw4RPIXwIauQ'
  }

  try {
    const html = await $fetch<string>(`https://www.youtube.com/@${handle}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
      },
      timeout: 8000,
    })

    const idMatch =
      html.match(/itemprop="channelId"\s+content="(UC[a-zA-Z0-9_-]{22})"/) ||
      html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/) ||
      html.match(/"externalId":"(UC[a-zA-Z0-9_-]{22})"/)

    if (idMatch && idMatch[1]) {
      return idMatch[1]
    }
  } catch (err: any) {
    console.warn(`[YouTube] Kunde inte slå upp kanal-ID från @${handle}:`, err?.message || err)
  }

  // Fallback to raw input if resolution fails
  return trimmed
}

export async function fetchYouTubeFeed(channelId: string): Promise<ParsedYouTubeVideo[]> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  const xml = await $fetch<string>(feedUrl, {
    headers: {
      'User-Agent': 'DetSjundeGungetBot/1.0',
    },
    timeout: 10000,
  })

  const entries: ParsedYouTubeVideo[] = []
  const entryMatches = xml.match(/<entry>[\s\S]*?<\/entry>/g) || []

  for (const entryXml of entryMatches) {
    const videoIdMatch = entryXml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)
    if (!videoIdMatch || !videoIdMatch[1]) continue

    const videoId = videoIdMatch[1].trim()
    const titleMatch = entryXml.match(/<title>([^<]+)<\/title>/)
    const title = titleMatch && titleMatch[1] ? unescapeXml(titleMatch[1].trim()) : 'Ny video'

    const publishedMatch = entryXml.match(/<published>([^<]+)<\/published>/)
    const publishedAt = publishedMatch && publishedMatch[1] ? new Date(publishedMatch[1]).getTime() : Date.now()

    const descMatch = entryXml.match(/<media:description>([\s\S]*?)<\/media:description>/)
    const description = descMatch && descMatch[1] ? unescapeXml(descMatch[1].trim()) : undefined

    const thumbMatch = entryXml.match(/<media:thumbnail\s+[^>]*url="([^"]+)"/)
    const thumbnailUrl = thumbMatch && thumbMatch[1] ? thumbMatch[1] : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

    entries.push({
      videoId,
      title,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      publishedAt,
      description,
      thumbnailUrl,
    })
  }

  return entries
}

export async function fetchOEmbed(urlOrId: string) {
  const videoId = extractYouTubeId(urlOrId)
  if (!videoId) {
    throw new Error('Ogiltig YouTube-länk eller video-ID')
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
  const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`

  const data = await $fetch<{
    title: string
    author_name: string
    thumbnail_url: string
    html: string
  }>(oEmbedUrl, { timeout: 6000 })

  return {
    videoId,
    videoUrl,
    title: data.title || 'YouTube-video',
    authorName: data.author_name || 'Det 7:e Gunget',
    thumbnailUrl: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
  }
}

export async function syncYouTubeVideos(options?: { force?: boolean }) {
  // 1. Hämta inställningar från site_settings
  const settingsList = await db.select().from(siteSettings)
  const map: Record<string, string> = {}
  for (const s of settingsList) {
    map[s.key] = s.value
  }

  const rawChannel = map.youtube_channel_id || '@det7egunget'
  const autoImport = map.youtube_auto_import !== 'false' // default true
  const autoSocial = map.youtube_auto_social !== 'false' // default true

  if (!options?.force && !autoImport) {
    return {
      success: true,
      skipped: true,
      message: 'Automatisk YouTube-import är inaktiverad i inställningarna.',
      addedCount: 0,
      totalFound: 0,
    }
  }

  // 2. Slå upp unikt channel ID om det är ett @handle
  let channelId = map.youtube_channel_id_resolved
  if (!channelId || !channelId.startsWith('UC') || rawChannel !== map.youtube_channel_last_resolved_for) {
    channelId = await resolveChannelId(rawChannel)
    if (channelId.startsWith('UC')) {
      const now = new Date()
      await db
        .insert(siteSettings)
        .values({ key: 'youtube_channel_id_resolved', value: channelId, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value: channelId, updatedAt: now } })
      await db
        .insert(siteSettings)
        .values({ key: 'youtube_channel_last_resolved_for', value: rawChannel, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value: rawChannel, updatedAt: now } })
    }
  }

  if (!channelId || !channelId.startsWith('UC')) {
    throw new Error(`Kunde inte identifiera ett giltigt YouTube-kanal-ID (UC...) för "${rawChannel}".`)
  }

  // 3. Läs kanalens öppna RSS-feed
  const feedVideos = await fetchYouTubeFeed(channelId)

  // 4. Jämför med befintliga videor i databasen
  const existingRows = await db.select({ youtubeId: videos.youtubeId }).from(videos)
  const existingIds = new Set(existingRows.map((r) => r.youtubeId))

  const newVideos = feedVideos.filter((v) => !existingIds.has(v.videoId))
  const addedVideos: any[] = []
  const socialResults: any[] = []

  const now = new Date()

  // 5. Spara nya videor i databasen
  for (const item of newVideos) {
    const videoId = `vid-${nanoid(8)}`
    const newRow = {
      id: videoId,
      youtubeId: item.videoId,
      title: item.title,
      description: item.description || null,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
      publishedAt: new Date(item.publishedAt),
      isActive: true,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(videos).values(newRow)
    addedVideos.push(newRow)

    // 6. Skicka till sociala medier om aktiverat
    if (autoSocial) {
      try {
        const socialRes = await publishToSocialMedia({
          type: 'video',
          title: item.title,
          videoUrl: item.url,
          embedUrl: `https://www.youtube.com/embed/${item.videoId}`,
          notes: item.description ? item.description.slice(0, 250) : undefined,
        })
        socialResults.push({ videoId: item.videoId, socialRes })
      } catch (err: any) {
        console.error(`[Social] Fel vid auto-postning av YouTube-video ${item.videoId}:`, err?.message || err)
      }
    }
  }

  // 7. Uppdatera tidsstämpel för senaste synk
  const timestampStr = Date.now().toString()
  await db
    .insert(siteSettings)
    .values({ key: 'youtube_last_synced', value: timestampStr, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: timestampStr, updatedAt: now } })

  return {
    success: true,
    addedCount: addedVideos.length,
    totalFound: feedVideos.length,
    channelId,
    newVideos: addedVideos,
    socialResults,
    lastSyncedAt: Number(timestampStr),
  }
}

import fs from 'node:fs'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { siteSettings } from '../db/schema'

export interface SocialPostParams {
  type: 'gig' | 'song' | 'news' | 'gallery'
  title: string
  subtitle?: string
  venue?: string
  city?: string
  date?: string | Date
  ticketUrl?: string
  embedUrl?: string
  imageUrl?: string
  notes?: string
  hashtags?: string[]
}

export interface SocialPostResult {
  success: boolean
  facebook?: { success: boolean; id?: string; error?: string }
  instagram?: { success: boolean; id?: string; error?: string }
  webhook?: { success: boolean; error?: string }
  simulated?: boolean
  previewText: string
  message: string
}

export function formatSocialPost(params: SocialPostParams): { facebookText: string; instagramText: string } {
  const defaultTags = '#DetSjundeGunget #BluesRock #LiveMusik #SvenskBlues #BluesSverige'
  const activeTags = params.hashtags && params.hashtags.length > 0 ? params.hashtags.join(' ') : defaultTags

  if (params.type === 'gig') {
    const formattedDate = params.date
      ? new Date(params.date).toLocaleDateString('sv-SE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : ''

    const cityTag = params.city ? `#${params.city.replace(/\s+/g, '')}Blues` : ''

    const fbLines = [
      `🎸 NYTT GIG MED DET 7:E GUNGET! 🎸`,
      '',
      `📍 Spelplats: ${params.venue || 'TBA'}, ${params.city || ''}`,
      formattedDate ? `📅 Datum: ${formattedDate}` : '',
      params.notes ? `\n"${params.notes}"` : '',
      '',
      params.ticketUrl ? `🎟️ Biljetter & info: ${params.ticketUrl}` : `👉 Mer info: https://det7egunget.se/gigs`,
      '',
      `Kom och sväng med oss! 🎶`,
      `${activeTags} ${cityTag}`,
    ].filter(Boolean)

    const igLines = [
      `🎸 NY SPELNING UTANNONSERAD! 🎸`,
      '',
      `📍 ${params.venue}, ${params.city}`,
      formattedDate ? `📅 ${formattedDate}` : '',
      '',
      params.notes ? `"${params.notes}"\n` : '',
      `Länk i bion för biljetter och alla turnédatum! 🎟️👇`,
      `https://det7egunget.se/gigs`,
      '',
      `${activeTags} ${cityTag}`,
    ].filter(Boolean)

    return {
      facebookText: fbLines.join('\n'),
      instagramText: igLines.join('\n'),
    }
  }

  if (params.type === 'song') {
    const fbText = [
      `🎵 NY LÅT I JUKEBOXEN! 🎵`,
      '',
      `"${params.title}" ${params.subtitle ? `(${params.subtitle})` : ''} finns nu att lyssna på i vår retro jukebox på hemsidan!`,
      '',
      params.embedUrl ? `Lyssna direkt: ${params.embedUrl}` : `👉 Lyssna här: https://det7egunget.se/music`,
      '',
      `Släpp i en slant och höj volymen till 11! ⚡`,
      `${activeTags}`,
    ]
      .filter(Boolean)
      .join('\n')

    const igText = [
      `🎵 NY LÅT! "${params.title}" 🎵`,
      '',
      `Klicka in på länken i vår bio och dra igång vår interaktiva jukebox! 🎶`,
      '',
      `${activeTags}`,
    ].join('\n')

    return {
      facebookText: fbText,
      instagramText: igText,
    }
  }

  // Default news/general update
  const defaultText = [
    `📢 NYHET FRÅN DET 7:E GUNGET!`,
    '',
    params.title,
    params.notes || '',
    '',
    `Läs mer på https://det7egunget.se`,
    '',
    activeTags,
  ]
    .filter(Boolean)
    .join('\n')

  return {
    facebookText: defaultText,
    instagramText: defaultText,
  }
}

export async function publishToSocialMedia(params: SocialPostParams): Promise<SocialPostResult> {
  const { facebookText, instagramText } = formatSocialPost(params)
  const result: SocialPostResult = {
    success: true,
    previewText: facebookText,
    message: 'Inlägg förberett.',
  }

  let isMockMode = process.env.SOCIAL_MOCK_MODE === 'true' || process.env.SOCIAL_DRY_RUN === 'true'
  try {
    const settingRow = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'social_mock_mode'))
      .limit(1)
    if (settingRow[0]) {
      isMockMode = settingRow[0].value === 'true'
    }
  } catch {
    // Fallback to env variable
  }

  if (isMockMode) {
    console.log('\n[Social MOCK / TEST MODE - Inget skarpt inlägg skickas]:')
    console.log('--- FACEBOOK POST PREVIEW ---\n' + facebookText)
    console.log('--- INSTAGRAM POST PREVIEW ---\n' + instagramText)
    return {
      success: true,
      simulated: true,
      previewText: facebookText,
      message: 'Simulerad delning (Testläge/Mock Mode är aktivt i inställningarna — inget publiceras skarpt på Facebook/Instagram).',
    }
  }

  // Read fresh tokens (dynamically check .env on disk to avoid stale Node process.env cache)
  let fbToken = process.env.FB_PAGE_ACCESS_TOKEN || ''
  let fbPageId = process.env.FB_PAGE_ID || ''
  let igUserId = process.env.INSTAGRAM_ACCOUNT_ID || ''
  let webhookUrl = process.env.SOCIAL_WEBHOOK_URL || ''

  try {
    const envPath = path.resolve(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8')
      const tokenMatch = envContent.match(/FB_PAGE_ACCESS_TOKEN=(.*)/)
      if (tokenMatch && tokenMatch[1]) {
        fbToken = tokenMatch[1].trim().replace(/^["']|["']$/g, '')
      }
      const pageIdMatch = envContent.match(/FB_PAGE_ID=(.*)/)
      if (pageIdMatch && pageIdMatch[1]) {
        fbPageId = pageIdMatch[1].trim().replace(/^["']|["']$/g, '')
      }
      const igMatch = envContent.match(/INSTAGRAM_ACCOUNT_ID=(.*)/)
      if (igMatch && igMatch[1]) {
        igUserId = igMatch[1].trim().replace(/^["']|["']$/g, '')
      }
    }
  } catch (err: any) {
    console.warn('[Social] Could not read fresh .env from disk:', err?.message)
  }

  let hasExternalDispatch = false

  // 1. Post to Facebook Page (Photo post if imageUrl is available, otherwise Feed post)
  if (fbToken && fbPageId) {
    try {
      hasExternalDispatch = true
      let fbRes: Response

      let localFilePath: string | null = null
      if (params.imageUrl && !params.imageUrl.startsWith('http')) {
        const cleanPath = params.imageUrl.replace(/^\//, '')
        const candidate = path.resolve(process.cwd(), 'public', cleanPath)
        if (fs.existsSync(candidate)) {
          localFilePath = candidate
        }
      }

      if (localFilePath) {
        // Upload local image binary directly to Facebook
        const fileBuffer = fs.readFileSync(localFilePath)
        const ext = path.extname(localFilePath).toLowerCase()
        const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
        const fileBlob = new Blob([fileBuffer], { type: mimeType })

        const formData = new FormData()
        formData.append('source', fileBlob, path.basename(localFilePath))
        formData.append('caption', facebookText)
        formData.append('access_token', fbToken)

        fbRes = await fetch(`https://graph.facebook.com/v20.0/${fbPageId}/photos`, {
          method: 'POST',
          body: formData,
        })
      } else if (params.imageUrl && params.imageUrl.startsWith('http')) {
        // Upload via remote public URL
        const formData = new FormData()
        formData.append('url', params.imageUrl)
        formData.append('caption', facebookText)
        formData.append('access_token', fbToken)

        fbRes = await fetch(`https://graph.facebook.com/v20.0/${fbPageId}/photos`, {
          method: 'POST',
          body: formData,
        })
      } else {
        // Text / Link post to Feed
        fbRes = await fetch(`https://graph.facebook.com/v20.0/${fbPageId}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: facebookText,
            link: params.ticketUrl || params.embedUrl || 'https://det7egunget.se',
            access_token: fbToken,
          }),
        })
      }

      const fbData = await fbRes.json()
      if (fbRes.ok && (fbData.id || fbData.post_id)) {
        const publishedId = fbData.post_id || fbData.id
        result.facebook = { success: true, id: publishedId }
        console.log('[Social] ✓ Successfully posted to Facebook Page:', publishedId)
      } else {
        const errDetail = fbData.error?.message || 'FB API Error'
        result.facebook = { success: false, error: errDetail }
        console.error('[Social] ✕ Facebook post error:', fbData)
      }
    } catch (e: any) {
      result.facebook = { success: false, error: e.message }
      console.error('[Social] ✕ Facebook network error:', e.message)
    }
  }

  // 2. Post to Instagram Business (requires media container)
  if (fbToken && igUserId && params.imageUrl) {
    try {
      hasExternalDispatch = true
      const containerRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: params.imageUrl.startsWith('http') ? params.imageUrl : `https://det7egunget.se${params.imageUrl}`,
          caption: instagramText,
          access_token: fbToken,
        }),
      })

      const containerData = await containerRes.json()
      if (containerRes.ok && containerData.id) {
        const publishRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: containerData.id,
            access_token: fbToken,
          }),
        })
        const publishData = await publishRes.json()
        result.instagram = { success: true, id: publishData.id }
        console.log('[Social] Successfully posted to Instagram:', publishData.id)
      } else {
        result.instagram = { success: false, error: containerData.error?.message || 'IG Container Error' }
      }
    } catch (e: any) {
      result.instagram = { success: false, error: e.message }
    }
  }

  // 3. Post to Webhook (Buffer / Zapier / Make / Discord)
  if (webhookUrl) {
    try {
      hasExternalDispatch = true
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'Det 7:e Gunget Website',
          type: params.type,
          title: params.title,
          facebookText,
          instagramText,
          imageUrl: params.imageUrl,
          timestamp: new Date().toISOString(),
        }),
      })
      result.webhook = { success: true }
      console.log('[Social] Dispatched to social webhook')
    } catch (e: any) {
      result.webhook = { success: false, error: e.message }
    }
  }

  if (!hasExternalDispatch) {
    result.simulated = true
    result.success = true
    result.message = 'Simulerat läge: Inga API-tokens konfigurerade.'
    console.log('[Social Preview Generated]:\n', facebookText)
  } else {
    const fbOk = !result.facebook || result.facebook.success
    const igOk = !result.instagram || result.instagram.success
    const whOk = !result.webhook || result.webhook.success

    if (fbOk && igOk && whOk) {
      result.success = true
      result.message = 'Publicerat på Facebook!'
    } else {
      result.success = false
      const errors: string[] = []
      if (result.facebook && !result.facebook.success) {
        errors.push(`Facebook: ${result.facebook.error || 'Okänt fel'}`)
      }
      if (result.instagram && !result.instagram.success) {
        errors.push(`Instagram: ${result.instagram.error || 'Okänt fel'}`)
      }
      if (result.webhook && !result.webhook.success) {
        errors.push(`Webhook: ${result.webhook.error || 'Okänt fel'}`)
      }
      result.message = errors.join(' | ')
    }
  }

  return result
}

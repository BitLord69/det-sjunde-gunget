/**
 * Social Media Cross-Posting Utility
 * Formats and broadcasts updates to Facebook Page, Instagram Business, and Webhooks.
 */

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

  const isMockMode = process.env.SOCIAL_MOCK_MODE === 'true' || process.env.SOCIAL_DRY_RUN === 'true'
  if (isMockMode) {
    console.log('\n[Social MOCK / DRY RUN MODE - Inget skarpt inlägg skickas]:')
    console.log('--- FACEBOOK POST PREVIEW ---\n' + facebookText)
    console.log('--- INSTAGRAM POST PREVIEW ---\n' + instagramText)
    return {
      success: true,
      simulated: true,
      previewText: facebookText,
      message: 'Simulerad delning (Mock/Dry-run är aktivt i .env - inget publiceras skarpt på Facebook/Instagram).',
    }
  }

  const fbToken = process.env.FB_PAGE_ACCESS_TOKEN
  const fbPageId = process.env.FB_PAGE_ID
  const igUserId = process.env.INSTAGRAM_ACCOUNT_ID
  const webhookUrl = process.env.SOCIAL_WEBHOOK_URL

  let hasExternalDispatch = false

  // 1. Post to Facebook Page
  if (fbToken && fbPageId) {
    try {
      hasExternalDispatch = true
      const fbRes = await fetch(`https://graph.facebook.com/v20.0/${fbPageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: facebookText,
          link: params.ticketUrl || params.embedUrl || 'https://det7egunget.se',
          access_token: fbToken,
        }),
      })

      const fbData = await fbRes.json()
      if (fbRes.ok) {
        result.facebook = { success: true, id: fbData.id }
        console.log('[Social] Successfully posted to Facebook Page:', fbData.id)
      } else {
        result.facebook = { success: false, error: fbData.error?.message || 'FB API Error' }
        console.error('[Social] Facebook post error:', fbData)
      }
    } catch (e: any) {
      result.facebook = { success: false, error: e.message }
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
    result.message = 'Inlägg skapat och formaterat för Facebook & Instagram (simulerat läge tills Meta API-tokens lagts till i .env).'
    console.log('[Social Preview Generated]:\n', facebookText)
  } else {
    result.message = 'Inlägget har publicerats på sociala medier!'
  }

  return result
}

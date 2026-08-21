import { db } from '../../db/client'
import { siteSettings } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const list = await db.select().from(siteSettings)
  const map: Record<string, string> = {}
  for (const s of list) {
    map[s.key] = s.value
  }

  return {
    newsletterEnabled: map.newsletter_enabled === 'true',
    landingSongCount: map.landing_song_count ? Math.max(2, Math.min(10, parseInt(map.landing_song_count, 10))) : 4,
    landingMerchCount: map.landing_merch_count ? Math.max(2, Math.min(8, parseInt(map.landing_merch_count, 10))) : 4,
    lastMerchSync: map.last_merch_sync ? parseInt(map.last_merch_sync, 10) : null,
    geminiApiKey: map.gemini_api_key || process.env.GEMINI_API_KEY || '',
    customCoverPrompt: map.custom_cover_prompt || '',
    settings: map,
  }
})

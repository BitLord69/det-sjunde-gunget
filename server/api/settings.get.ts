import { db } from '../db/client'
import { siteSettings } from '../db/schema'

export default defineEventHandler(async () => {
  try {
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
      settings: map,
    }
  } catch (err: any) {
    // Graceful fallback if table is not yet queryable
    return {
      newsletterEnabled: false,
      landingSongCount: 4,
      landingMerchCount: 4,
      lastMerchSync: null,
      settings: {},
    }
  }
})

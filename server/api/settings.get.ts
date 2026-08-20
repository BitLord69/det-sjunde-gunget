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
      settings: map,
    }
  } catch (err: any) {
    // Graceful fallback if table is not yet queryable
    return {
      newsletterEnabled: false,
      settings: {},
    }
  }
})

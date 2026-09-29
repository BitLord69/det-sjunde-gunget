import { db } from '../db/client'
import { siteSettings } from '../db/schema'

export default defineEventHandler(async () => {
  try {
    const list = await db.select().from(siteSettings)
    const map: Record<string, string> = {}
    for (const s of list) {
      map[s.key] = s.value
    }

    const rawContactEmail = map.notification_email || process.env.BREVO_CONTACT_EMAIL || 'info@det7egunget.se'
    const contactEmail = rawContactEmail.split(/[,;]/)[0]?.trim() || 'info@det7egunget.se'

    return {
      contactEmail,
      newsletterEnabled: map.newsletter_enabled === 'true',
      landingSongCount: map.landing_song_count ? Math.max(2, Math.min(10, parseInt(map.landing_song_count, 10))) : 4,
      landingMerchCount: map.landing_merch_count ? Math.max(2, Math.min(8, parseInt(map.landing_merch_count, 10))) : 4,
      lastMerchSync: map.last_merch_sync ? parseInt(map.last_merch_sync, 10) : null,
      settings: {
        contact_email: contactEmail,
        newsletter_enabled: map.newsletter_enabled || 'false',
        landing_song_count: map.landing_song_count || '4',
        landing_merch_count: map.landing_merch_count || '4',
      },
    }
  } catch (err: any) {
    // Graceful fallback if table is not yet queryable
    return {
      contactEmail: 'info@det7egunget.se',
      newsletterEnabled: false,
      landingSongCount: 4,
      landingMerchCount: 4,
      lastMerchSync: null,
      settings: {},
    }
  }
})

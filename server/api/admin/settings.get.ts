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
    settings: map,
  }
})

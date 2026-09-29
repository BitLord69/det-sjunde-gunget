import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { siteSettings } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  // 1. Check for Gemini API key in env or siteSettings
  let hasKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY)

  if (!hasKey) {
    try {
      const setting = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, 'gemini_api_key'))
        .get()

      if (setting?.value && setting.value.trim().length > 10) {
        hasKey = true
      }
    } catch (dbErr) {
      console.warn('[CoverEngineStatus] Failed to read gemini_api_key from database:', dbErr)
    }
  }

  if (hasKey) {
    return {
      engine: 'gemini',
      available: true,
      message: 'Google Gemini 2.5 Flash är aktiv och redo',
    }
  }

  return {
    engine: 'fallback',
    available: false,
    message: 'Ingen Gemini API-nyckel konfigurerad – använder lokal bandgrafik',
  }
})

import fs from 'node:fs/promises'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { siteSettings } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY

  if (!apiKey) {
    try {
      const envContent = await fs.readFile(path.resolve(process.cwd(), '.env'), 'utf-8')
      const match = envContent.match(/^GEMINI_API_KEY=(.+)$/m)
      if (match?.[1]) {
        apiKey = match[1].trim()
      }
    } catch (_) {}
  }

  if (!apiKey) {
    try {
      const setting = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, 'gemini_api_key'))
        .get()
      if (setting?.value) {
        apiKey = setting.value
      }
    } catch (_) {}
  }

  if (!apiKey) {
    return {
      activeEngine: 'fallback',
      engineName: 'Gratis FLUX / Pollinations',
      tier: 'free',
      isPaidGemini: false,
      message: 'Ingen API-nyckel konfigurerad. Använder gratis bildmotor.',
    }
  }

  try {
    // Quick metadata check to verify API key validity and active models
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
    if (res.ok) {
      const data = await res.json()
      const models: any[] = data.models || []
      const hasImageModel = models.some((m: any) => m.name?.includes('flash') || m.name?.includes('imagen') || m.name?.includes('image'))

      return {
        activeEngine: 'gemini',
        engineName: 'Google Gemini 2.5 Image',
        tier: 'paid',
        isPaidGemini: true,
        modelsCount: models.length,
        hasImageModel,
        message: 'Google Gemini API är aktivt med högsta fotokvalitet och multimodal referens.',
      }
    } else {
      const errData = await res.json().catch(() => ({}))
      return {
        activeEngine: 'fallback',
        engineName: 'Gratis Fallback (FLUX)',
        tier: 'free',
        isPaidGemini: false,
        message: errData?.error?.message || 'Kunde inte ansluta till Google AI.',
      }
    }
  } catch (err: any) {
    return {
      activeEngine: 'fallback',
      engineName: 'Gratis Fallback (FLUX)',
      tier: 'free',
      isPaidGemini: false,
      message: err.message || 'Nätverksfel vid kontroll mot Google AI.',
    }
  }
})

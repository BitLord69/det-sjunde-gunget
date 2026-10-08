import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { siteSettings } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  const body = await readBody(event)
  const sourceText = typeof body?.text === 'string' ? body.text.trim() : ''

  if (!sourceText) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Ingen text angavs för översättning.',
    })
  }

  // 1. Kontrollera om Gemini API-nyckel finns
  let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY
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
    } catch {
      // Ignorera om databasen saknar nyckeln
    }
  }

  // 2. Försök med Google Gemini (högsta kvalitet & musikalisk anpassning)
  if (apiKey) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Du är en musikalisk översättare för det svenska bluesrockbandet "Det 7:e Gunget".
Översätt följande svenska text till naturlig, idiomatiskt träffsäker engelska (amerikansk engelska).
Behåll bandnamnet "Det 7:e Gunget" och musikalisk terminologi.
Svara ENDAST med den översatta texten, inga citattecken, introduktioner eller förklaringar.

Text:
"""
${sourceText}
"""`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (res.ok) {
        const data = await res.json()
        const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (candidate) {
          // Rensa eventuella omslutande citattecken
          const cleaned = candidate.replace(/^["'“”](.*)["'“”]$/s, '$1').trim()
          return { success: true, text: cleaned, engine: 'gemini' }
        }
      }
    } catch (gErr) {
      console.warn('[Translate] Gemini misslyckades, faller tillbaka till MyMemory:', gErr)
    }
  }

  // 3. Fallback: Gratis MyMemory Translate API
  try {
    const memoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(sourceText)}&langpair=sv|en`
    const res = await fetch(memoryUrl, { signal: AbortSignal.timeout(8000) })
    if (res.ok) {
      const data = await res.json()
      const translated = data?.responseData?.translatedText
      if (translated && typeof translated === 'string') {
        const cleaned = translated.replace(/^["'“”](.*)["'“”]$/s, '$1').trim()
        return { success: true, text: cleaned, engine: 'mymemory' }
      }
    }
  } catch (mErr) {
    console.error('[Translate] MyMemory misslyckades också:', mErr)
  }

  throw createError({
    statusCode: 502,
    statusMessage: 'Translation Failed',
    message: 'Kunde inte översätta texten. Försök igen eller skriv in manuellt.',
  })
})

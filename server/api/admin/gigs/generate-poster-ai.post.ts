import fs from 'node:fs/promises'
import path from 'node:path'
import { nanoid } from 'nanoid'
import { put } from '@vercel/blob'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { siteSettings } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'
import { getBlobToken } from '../../../utils/blob'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  const {
    venue = 'Live på scen',
    city = 'Sverige',
    motifPreset = 'club', // 'club' | 'stage' | 'folkpark' | 'rockbar' | 'chicago' | 'custom'
    customPrompt = '',
    includeBand = false,
  } = body

  // 1. Get Gemini API Key
  let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY

  if (!apiKey) {
    try {
      const envContent = await fs.readFile(path.resolve(process.cwd(), '.env'), 'utf-8')
      const match = envContent.match(/^GEMINI_API_KEY=(.+)$/m)
      if (match?.[1]) {
        apiKey = match[1].trim()
      }
    } catch {
      // Ignore
    }
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
    } catch {
      // Ignore
    }
  }

  // 2. Load Band Reference Photo if includeBand is true
  let bandRefBase64: string | null = null
  if (includeBand) {
    try {
      const defaultRefPath = path.resolve(process.cwd(), 'public/media/band/21..7de Gunget photoshoot1 21-6 26-3.jpg')
      try {
        const refBuffer = await fs.readFile(defaultRefPath)
        bandRefBase64 = refBuffer.toString('base64')
      } catch {
        const reqUrl = getRequestURL(event)
        const refRes = await fetch(`${reqUrl.origin}/media/band/21..7de Gunget photoshoot1 21-6 26-3.jpg`)
        if (refRes.ok) {
          const arr = await refRes.arrayBuffer()
          bandRefBase64 = Buffer.from(arr).toString('base64')
        }
      }
    } catch (refErr) {
      console.warn('[GeneratePosterAI] Could not load band reference photo:', refErr)
    }
  }

  // 3. Construct the scene prompt
  const presetPrompts: Record<string, string> = {
    club: `Intimate smoky 1970s Chicago blues nightclub in ${city || 'the city'} with rustic weathered brick walls, warm tungsten stage lighting, a glowing vintage guitar tube amplifier, microphones, atmospheric haze and analog 35mm film grain.`,
    stage: `Moody vintage 1970s concert stage at ${venue || 'a music venue'}, backlit with warm amber spotlights cutting through stage smoke, vintage Fender and Marshall tube amplifiers, electric guitars on stands, evocative live blues-rock atmosphere.`,
    folkpark: `Authentic 1970s Swedish folkpark outdoor dance pavilion stage at twilight in ${city || 'Sweden'}, warm festoon string lights, colored lanterns, weathered wood, summer dusk breeze, nostalgic Scandinavian retro mood.`,
    rockbar: `Sweaty legendary live music dive bar and rock tavern with dark wood panels, vintage neon signs glowing softly, beer taps in the shadows, guitars and amplifiers ready on a low wooden stage, authentic vintage soul.`,
    chicago: `Atmospheric rainy night outside a legendary 1970s Chicago blues club, wet cobblestone reflections, vintage neon sign, steam rising, moody cinematic urban blues aesthetic.`,
  }

  let sceneDesc = presetPrompts[motifPreset] || presetPrompts.club
  if (motifPreset === 'custom' && customPrompt && customPrompt.trim()) {
    sceneDesc = customPrompt.trim()
  }

  let prompt = ''
  if (includeBand) {
    prompt = `Award-winning landscape 35mm analog photograph of the 4 musicians in this reference photo performing live on stage at ${venue || 'a concert venue'} in ${city || 'Sweden'}. Environment: ${sceneDesc}. STRICT REQUIREMENT: Exactly four musicians on stage: lead singer cupping a harmonica to a vintage mic in a fedora hat, lead guitarist playing electric guitar, bassist in leather jacket, and drummer behind vintage Ludwig kit. CRITICAL: DO NOT render any text, words, venue names, or titles in the image. High-contrast Kodak 35mm film grain, 1970s concert poster photo, masterpiece.`
  } else {
    prompt = `Cinematic vintage 1970s analog photograph for a concert poster background at ${venue || 'a venue'} in ${city || 'Sweden'}. Scene: ${sceneDesc}. CRITICAL: DO NOT render any text, logos, venue names, or lettering anywhere in the image. Analog 35mm film aesthetics, authentic warmth, dust and grain, wide atmospheric composition, masterpiece photography.`
  }

  let imageBuffer: Buffer | null = null
  let usedEngine = 'gemini'

  // 4. Try Gemini 2.5 Flash Image Generation
  if (apiKey) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`
      const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = []

      if (bandRefBase64) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: bandRefBase64,
          },
        })
      }
      parts.push({ text: prompt })

      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      })

      if (res.ok) {
        const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }> }
        const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
        if (part?.inlineData?.data) {
          imageBuffer = Buffer.from(part.inlineData.data, 'base64')
          usedEngine = 'gemini'
        }
      }
    } catch (gErr) {
      console.warn('[GeneratePosterAI] Gemini API attempt failed, trying fallback:', gErr)
    }
  }

  // 5. Fallback generator (Pollinations AI)
  if (!imageBuffer) {
    try {
      const seed = Math.floor(Math.random() * 900000) + 100000
      const encodedPrompt = encodeURIComponent(prompt)
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=640&nologo=true&seed=${seed}`

      const pollRes = await fetch(pollinationsUrl)
      if (pollRes.ok) {
        const arrayBuf = await pollRes.arrayBuffer()
        imageBuffer = Buffer.from(arrayBuf)
        usedEngine = 'fallback'
      }
    } catch (pollErr) {
      console.error('[GeneratePosterAI] Fallback generator failed:', pollErr)
    }
  }

  if (!imageBuffer) {
    throw createError({
      statusCode: 500,
      message: 'Kunde inte generera AI-bild för affischen. Kontrollera nätverket och försök igen.',
    })
  }

  // 6. Save image to Vercel Blob or local storage
  const safeVenue = (venue || 'gig').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 25)
  const fileName = `poster-ai-${safeVenue}-${nanoid(6)}.jpg`
  let publicUrl = ''

  const blobToken = getBlobToken()
  if (blobToken) {
    try {
      const blob = await put(`posters/${fileName}`, imageBuffer, {
        access: 'public',
        token: blobToken,
        contentType: 'image/jpeg',
      })
      publicUrl = blob.url
    } catch {
      // Fallback
    }
  }

  if (!publicUrl) {
    try {
      const postersDir = path.resolve(process.cwd(), 'public/images/posters')
      await fs.mkdir(postersDir, { recursive: true })
      const filePath = path.join(postersDir, fileName)
      await fs.writeFile(filePath, imageBuffer)
      publicUrl = `/images/posters/${fileName}`
    } catch (fsErr) {
      console.warn('[GeneratePosterAI] Local write failed, using data URL:', fsErr)
      publicUrl = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
    }
  }

  return {
    success: true,
    imageUrl: publicUrl,
    prompt,
    engine: usedEngine,
  }
})

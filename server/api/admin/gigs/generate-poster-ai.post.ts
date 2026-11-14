import { requireAdminAuth } from '../../../utils/auth'
import { generateAiStudioImage, persistGeneratedStudioImage } from '../../../utils/aiImageStudio'

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

  // 1. Construct the scene prompt
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

  const prompt = includeBand
    ? `Award-winning landscape 35mm analog photograph of the 4 musicians in this reference photo performing live on stage at ${venue || 'a concert venue'} in ${city || 'Sweden'}. Environment: ${sceneDesc}. STRICT REQUIREMENT: Exactly four musicians on stage: lead singer cupping a harmonica to a vintage mic in a fedora hat, lead guitarist playing electric guitar, bassist in leather jacket, and drummer behind vintage Ludwig kit. CRITICAL: DO NOT render any text, words, venue names, or titles in the image. High-contrast Kodak 35mm film grain, 1970s concert poster photo, masterpiece.`
    : `Cinematic vintage 1970s analog photograph for a concert poster background at ${venue || 'a venue'} in ${city || 'Sweden'}. Scene: ${sceneDesc}. CRITICAL: DO NOT render any text, logos, venue names, or lettering anywhere in the image. Analog 35mm film aesthetics, authentic warmth, dust and grain, wide atmospheric composition, masterpiece photography.`

  // 2. Generate image via shared AI Image Studio engine (Gemini 2.5 Flash Image + Pollinations fallback)
  const { imageBuffer, usedEngine } = await generateAiStudioImage({
    event,
    prompt,
    includeBand: Boolean(includeBand),
    width: 1024,
    height: 640,
    logPrefix: 'GeneratePosterAI',
  })

  if (!imageBuffer) {
    throw createError({
      statusCode: 500,
      message: 'Kunde inte generera AI-bild för affischen. Kontrollera nätverket och försök igen.',
    })
  }

  // 3. Persist image to Vercel Blob, local storage, or data URL fallback
  const publicUrl = await persistGeneratedStudioImage({
    imageBuffer,
    folder: 'posters',
    filePrefix: 'poster-ai',
    slugSource: venue || 'gig',
    maxSlugLength: 25,
  })

  return {
    success: true,
    imageUrl: publicUrl,
    prompt,
    engine: usedEngine,
  }
})

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
    title,
    originalArtist,
    isOriginal,
    era = '70s',
    includeBand = false,
    promptMode = 'standard',
    customPrompt = '',
    source = 'photo', // 'photo' | 'ai'
    photoPath = '',
    photoUrl = '',
    stylePreset = 'auto', // 'auto' | 'sonet_gold' | 'chess_crimson' | 'stax_amber' | 'bluenote_navy' | 'vintage_cream' | 'harvest_green' | 'monochrome_accent'
    layout = 'top_bottom', // 'top_bottom' | 'diagonal_sash' | 'sidebar_modern' | 'poster_frame' | 'center_badge' | 'auto'
    agingEffect = 'ringwear', // 'none' | 'ringwear' | 'worn_cardboard' | 'both'
    photoFilter = 'vintage_warm', // 'natural' | 'vintage_warm' | 'bw' | 'punchy'
    badgeFormat = '45_rpm', // '45_rpm' | 'stereo' | 'mono'
    textRenderer = 'theme', // 'theme' | 'ai_native'
    catalogNumber = '',
    subtitle = '',
  } = body

  if (!title && promptMode === 'standard') {
    throw createError({
      statusCode: 400,
      message: 'Låttitel krävs för att generera ett omslag.',
    })
  }

  // Auto-save custom prompt to siteSettings if provided
  if (customPrompt && customPrompt.trim()) {
    try {
      const now = new Date()
      await db
        .insert(siteSettings)
        .values({
          key: 'custom_cover_prompt',
          value: customPrompt.trim(),
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: {
            value: customPrompt.trim(),
            updatedAt: now,
          },
        })
    } catch {
      // Ignore settings save error
    }
  }

  let imageBuffer: Buffer | null = null
  let usedEngine = 'vinyl'
  let chosenStyle = stylePreset || 'auto'
  let chosenLayout = layout || 'top_bottom'
  let chosenAging = agingEffect || 'ringwear'

  // Available style presets and layouts for 'auto' resolution
  const availableStyles = ['sonet_gold', 'chess_crimson', 'stax_amber', 'bluenote_navy', 'vintage_cream', 'harvest_green', 'monochrome_accent']
  const availableLayouts = ['top_bottom', 'diagonal_sash', 'sidebar_modern', 'poster_frame', 'center_badge']

  const titleHash = (title || 'det-7e-gunget').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
  if (!chosenStyle || chosenStyle === 'auto') {
    chosenStyle = availableStyles[titleHash % availableStyles.length]
  }
  if (!chosenLayout || chosenLayout === 'auto') {
    chosenLayout = availableLayouts[titleHash % availableLayouts.length]
  }

  // ----------------------------------------------------
  // BRANCH A: Direct Photo-to-Vinyl from Photoshoot or Uploaded Photo
  // ----------------------------------------------------
  if (source === 'photo') {
    try {
      const chosenPhoto = (photoUrl || photoPath || 'media/band/21..7de Gunget photoshoot1 21-6 26-3.jpg').trim()

      if (chosenPhoto.startsWith('data:image/')) {
        const base64Data = chosenPhoto.replace(/^data:image\/\w+;base64,/, '')
        imageBuffer = Buffer.from(base64Data, 'base64')
      } else if (chosenPhoto.startsWith('http://') || chosenPhoto.startsWith('https://')) {
        const fetchRes = await fetch(chosenPhoto)
        if (!fetchRes.ok) throw new Error(`Kunde inte läsa extern bild (${fetchRes.status})`)
        const arrBuf = await fetchRes.arrayBuffer()
        imageBuffer = Buffer.from(arrBuf)
      } else {
        const cleanRel = chosenPhoto.replace(/^\/+/, '')
        const absPath = path.resolve(process.cwd(), 'public', cleanRel)
        imageBuffer = await fs.readFile(absPath)
      }
      usedEngine = 'vinyl'
    } catch (photoErr) {
      console.error('[GenerateCover] Failed to read band photo:', photoErr)
      throw createError({
        statusCode: 400,
        message: 'Kunde inte läsa det valda fotot. Kontrollera att filen finns eller prova att ladda upp på nytt.',
      })
    }
  } else {
    // ----------------------------------------------------
    // BRANCH B: AI GENERATION with Multimodal Likeness Reference
    // ----------------------------------------------------
    let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY

    if (!apiKey) {
      try {
        const envContent = await fs.readFile(path.resolve(process.cwd(), '.env'), 'utf-8')
        const match = envContent.match(/^GEMINI_API_KEY=(.+)$/m)
        if (match?.[1]) {
          apiKey = match[1].trim()
        }
      } catch {
        // .env file might not exist or be accessible
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
        // Site setting table might not have key
      }
    }

    // Load authentic band reference photo for multimodal generation when includeBand is true
    let bandRefBase64: string | null = null
    if (includeBand) {
      try {
        const defaultRefPath = path.resolve(process.cwd(), 'public/media/band/21..7de Gunget photoshoot1 21-6 26-3.jpg')
        const refBuffer = await fs.readFile(defaultRefPath)
        bandRefBase64 = refBuffer.toString('base64')
      } catch (refErr) {
        console.warn('[GenerateCover] Could not load band reference photo:', refErr)
      }
    }

    // Accurate Prompt Construction
    let prompt: string
    if (promptMode === 'custom' && customPrompt && customPrompt.trim()) {
      prompt = customPrompt.trim()
    } else {
      const subject = includeBand
        ? `Award-winning square 35mm film photograph of the Swedish blues rock band in this reference photo performing on a 1970s stage. STRICT REQUIREMENT: Total count of human beings in the entire image is EXACTLY FOUR (4) MUSICIANS. Absolutely NO 5th person, NO second guitarist, NO backing musicians, NO stage extras.

The only 4 band members on stage:
1. Janis (left): Lead singer in fedora hat and dark shirt cupping blues harmonica to vintage microphone. (Vocalist only, no guitar).
2. Marcus (center-left): Lead guitarist playing vintage sunburst Fender electric guitar.
3. Bosse (center-right): Bassist wearing sunglasses & leather jacket playing bass guitar.
4. Jonas (background): Drummer seated behind a vintage Ludwig drum kit.`
        : `Moody cinematic 1970s analog still life blues album artwork for the song '${title}'. A vintage glowing Fender tube guitar amplifier with warm amber vacuum tubes, a vintage sunburst electric guitar, and a classic Hohner Marine Band harmonica on wooden floorboards, atmospheric smoky reflections and analog film grain.`

      let eraStyle = '1970s Scandinavian blues-rock record sleeve aesthetic (Sonet / Gazell Records) in warm analog Kodak film tones (amber ochre, deep navy, slate gray).'
      if (era === '60s') {
        eraStyle = '1960s raw Chicago blues club aesthetic (Chess Records), high contrast moody duotone with deep shadows and analog grain.'
      }

      let textInstr = 'CRITICAL: DO NOT render any text, logos, or words anywhere in the image (leave clean margin for cover jacket typography).'
      if (textRenderer === 'ai_native') {
        textInstr = `Typography on record cover: Authentic 1970s vintage vinyl single cover typography featuring band name 'DET 7:e GUNGET' and song title '${(title || '').toUpperCase()}'. Let the typography be artistically styled and positioned anywhere on the cover where it naturally fits the visual composition (such as stylized header, diagonal retro banner, vintage stamp, integrated club signage, or subtle corner letterpress).`
      }

      prompt = `Square format 1970s vintage album cover photo artwork. ${subject} Style: ${eraStyle} ${textInstr} Lighting: Warm tungsten spotlights, atmospheric haze, authentic 35mm film grain, analog color grading, masterpiece quality.`
    }

    // 1. Send Multimodal (Image + Prompt) to Gemini 2.5 Flash Image
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
        console.warn('[GenerateCover] Gemini direct image attempt:', gErr)
      }
    }

    // 2. Fallback Generator (Free Pollinations)
    if (!imageBuffer) {
      try {
        const seed = Math.floor(Math.random() * 900000) + 100000
        const encodedPrompt = encodeURIComponent(prompt)
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=800&nologo=true&seed=${seed}`

        const pollRes = await fetch(pollinationsUrl)
        if (pollRes.ok) {
          const arrayBuf = await pollRes.arrayBuffer()
          imageBuffer = Buffer.from(arrayBuf)
          usedEngine = 'fallback'
        }
      } catch (pollErr) {
        console.error('[GenerateCover] Fallback generator failed:', pollErr)
      }
    }
  }

  if (!imageBuffer) {
    throw createError({
      statusCode: 500,
      message: 'Kunde inte generera bild. Kontrollera internetanslutningen och försök igen.',
    })
  }

  // ----------------------------------------------------
  // 3. Dynamic & Varied Vintage Sleeve Typography Compositing
  // ----------------------------------------------------
  try {
    const sharp = (await import('sharp')).default
    const width = 800
    const height = 800

    if (source === 'photo' || textRenderer === 'theme') {
      const cleanBand = 'DET 7:e GUNGET'
      const rawTitle = (title || 'Det 7:e Gunget').toUpperCase()
      const cleanTitle = rawTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

      // Formulate subtitle
      let cleanSubtitle = (subtitle || '').trim()
      if (!cleanSubtitle) {
        if (isOriginal) {
          cleanSubtitle = 'ORIGINALKOMPOSITION • DET 7:e GUNGET'
        } else if (originalArtist) {
          cleanSubtitle = `COVER AV ${originalArtist.toUpperCase()}`
        } else {
          cleanSubtitle = 'SKANDINAVISK BLUESROCK'
        }
      }
      cleanSubtitle = cleanSubtitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

      // Formulate catalog number
      const catNum = (catalogNumber || `D7G-${String(titleHash % 89 + 10).padStart(2, '0')}`).toUpperCase()

      // Formulate badge string
      let badgeLabel = '45 RPM'
      if (badgeFormat === 'stereo') badgeLabel = 'STEREO'
      else if (badgeFormat === 'mono') badgeLabel = 'MONO'

      // Theme Colors Definition
      interface ThemePalette {
        primary: string
        secondary: string
        accent: string
        darkBg1: string
        darkBg2: string
        seriesTag: string
        fontFamilyTitle: string
        fontFamilyBand: string
      }

      const palettes: Record<string, ThemePalette> = {
        sonet_gold: {
          primary: '#f59e0b',
          secondary: '#fef08a',
          accent: '#b45309',
          darkBg1: '#0a0705',
          darkBg2: '#18110b',
          seriesTag: '★ SONET GRAMMOFON • 45 RPM ★',
          fontFamilyTitle: "'Impact', 'Arial Black', sans-serif",
          fontFamilyBand: "'Impact', 'Arial Black', sans-serif",
        },
        chess_crimson: {
          primary: '#dc2626',
          secondary: '#fef3c7',
          accent: '#7f1d1d',
          darkBg1: '#0a0302',
          darkBg2: '#3b0707',
          seriesTag: '★ CHESS BLUES SERIES ★',
          fontFamilyTitle: "'Georgia', 'Times New Roman', serif",
          fontFamilyBand: "'Georgia', 'Times New Roman', serif",
        },
        stax_amber: {
          primary: '#ea580c',
          secondary: '#fed7aa',
          accent: '#7c2d12',
          darkBg1: '#180a02',
          darkBg2: '#451a03',
          seriesTag: '★ STAX / VOLT SOUL-BLUES ★',
          fontFamilyTitle: "'Trebuchet MS', 'Arial Black', sans-serif",
          fontFamilyBand: "'Trebuchet MS', 'Arial Black', sans-serif",
        },
        bluenote_navy: {
          primary: '#38bdf8',
          secondary: '#bae6fd',
          accent: '#0284c7',
          darkBg1: '#030712',
          darkBg2: '#082f49',
          seriesTag: 'BLUE NOTE MIDNIGHT SESSION',
          fontFamilyTitle: "'Helvetica Neue', 'Arial Black', sans-serif",
          fontFamilyBand: "'Helvetica Neue', 'Arial Black', sans-serif",
        },
        vintage_cream: {
          primary: '#fbbf24',
          secondary: '#fef3c7',
          accent: '#78350f',
          darkBg1: '#0f0c08',
          darkBg2: '#291e10',
          seriesTag: '— VINTAGE RECORD ARCHIVE —',
          fontFamilyTitle: "'Palatino', 'Georgia', serif",
          fontFamilyBand: "'Palatino', 'Georgia', serif",
        },
        harvest_green: {
          primary: '#22c55e',
          secondary: '#bbf7d0',
          accent: '#14532d',
          darkBg1: '#05130b',
          darkBg2: '#064e3b',
          seriesTag: '★ HARVEST ROOTS & BLUES ★',
          fontFamilyTitle: "'Rockwell', 'Courier New', serif",
          fontFamilyBand: "'Rockwell', 'Georgia', serif",
        },
        monochrome_accent: {
          primary: '#f1f5f9',
          secondary: '#fbbf24',
          accent: '#334155',
          darkBg1: '#020617',
          darkBg2: '#0f172a',
          seriesTag: '• MONO DELUXE EDITION •',
          fontFamilyTitle: "'Arial Black', sans-serif",
          fontFamilyBand: "'Arial Black', sans-serif",
        },
      }

      const defaultPalette: ThemePalette = {
        primary: '#f59e0b',
        secondary: '#fef08a',
        accent: '#b45309',
        darkBg1: '#0a0705',
        darkBg2: '#18110b',
        seriesTag: '★ SONET GRAMMOFON • 45 RPM ★',
        fontFamilyTitle: "'Impact', 'Arial Black', sans-serif",
        fontFamilyBand: "'Impact', 'Arial Black', sans-serif",
      }
      const p: ThemePalette = palettes[chosenStyle] ?? defaultPalette

      // Patina / Aging SVG Elements
      let agingSvg = ''
      if (chosenAging === 'ringwear' || chosenAging === 'both') {
        agingSvg += `
          <!-- Vinyl Ringwear (Worn imprint of record circle) -->
          <circle cx="400" cy="400" r="340" fill="none" stroke="#ffffff" stroke-width="28" stroke-opacity="0.10" filter="url(#ringBlur)" />
          <circle cx="400" cy="400" r="340" fill="none" stroke="#000000" stroke-width="10" stroke-opacity="0.22" filter="url(#ringBlur)" />
          <circle cx="400" cy="400" r="140" fill="none" stroke="#ffffff" stroke-width="14" stroke-opacity="0.07" filter="url(#ringBlur)" />
        `
      }
      if (chosenAging === 'worn_cardboard' || chosenAging === 'both') {
        agingSvg += `
          <!-- Weathered Cardboard Edge Vignette & Corner Creases -->
          <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="#000000" stroke-width="20" stroke-opacity="0.35" filter="url(#ringBlur)" />
          <line x1="8" y1="60" x2="60" y2="8" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.25" />
          <line x1="${width - 60}" y1="8" x2="${width - 8}" y2="60" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.25" />
          <line x1="8" y1="${height - 60}" x2="60" y2="${height - 8}" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.25" />
          <line x1="${width - 60}" y1="${height - 8}" x2="${width - 8}" y2="${height - 60}" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.25" />
        `
      }

      const titleLen = cleanTitle.length
      const dynamicTitleSize = titleLen > 30 ? 28 : titleLen > 22 ? 34 : titleLen > 14 ? 42 : 50

      let layoutSvgContent = ''

      // ----------------------------------------------------------------------
      // LAYOUT 1: TOP & BOTTOM BANNERS (Classic 70s Record Sleeve)
      // ----------------------------------------------------------------------
      if (chosenLayout === 'top_bottom') {
        layoutSvgContent = `
          <!-- Top & Bottom Gradient Fields -->
          <rect x="0" y="0" width="${width}" height="175" fill="url(#topGrad)" />
          <rect x="0" y="${height - 180}" width="${width}" height="180" fill="url(#bottomGrad)" />

          <!-- Outer Double Border -->
          <rect x="14" y="14" width="${width - 28}" height="${height - 28}" fill="none" stroke="${p.primary}" stroke-width="2.5" stroke-opacity="0.75" rx="6" />
          <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="none" stroke="${p.secondary}" stroke-width="1" stroke-opacity="0.3" rx="4" />

          <!-- Speed & Cat Badge (Top Right) -->
          <g transform="translate(${width - 130}, 28)">
            <rect width="96" height="32" rx="6" fill="${p.accent}" fill-opacity="0.9" stroke="${p.secondary}" stroke-width="1.5" />
            <text x="48" y="21" font-family="'Courier New', monospace" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">
              ${badgeLabel}
            </text>
          </g>

          <!-- Top Cat Stamp (Top Left) -->
          <text x="36" y="48" font-family="'Courier New', monospace" font-size="11" font-weight="700" fill="${p.secondary}" fill-opacity="0.8" letter-spacing="2">
            ${catNum}
          </text>

          <!-- Band Name -->
          <text x="${width / 2}" y="78" font-family="${p.fontFamilyBand}" font-size="46" font-weight="900" fill="${p.secondary}" text-anchor="middle" letter-spacing="3" filter="url(#textShadow)">
            ${cleanBand}
          </text>
          <text x="${width / 2}" y="106" font-family="'Courier New', monospace" font-size="11" font-weight="700" fill="${p.primary}" text-anchor="middle" letter-spacing="3">
            ${p.seriesTag}
          </text>

          <!-- Bottom: Song Title & Subtitle -->
          <text x="${width / 2}" y="${height - 76}" font-family="${p.fontFamilyTitle}" font-size="${dynamicTitleSize}" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.5" filter="url(#textShadow)">
            ${cleanTitle}
          </text>
          <text x="${width / 2}" y="${height - 42}" font-family="'Courier New', monospace" font-size="12" font-weight="700" fill="${p.primary}" text-anchor="middle" letter-spacing="2">
            ${cleanSubtitle}
          </text>
        `
      }

      // ----------------------------------------------------------------------
      // LAYOUT 2: DIAGONAL SASH (Retro Corner Banner & Lower Placard)
      // ----------------------------------------------------------------------
      else if (chosenLayout === 'diagonal_sash') {
        layoutSvgContent = `
          <!-- Bottom Vignette -->
          <rect x="0" y="${height - 210}" width="${width}" height="210" fill="url(#bottomGrad)" />

          <!-- Outer Border -->
          <rect x="16" y="16" width="${width - 32}" height="${height - 32}" fill="none" stroke="${p.primary}" stroke-width="2" stroke-opacity="0.8" />

          <!-- Top Left Diagonal Sash (45deg Ribbon) -->
          <g transform="translate(-80, 50) rotate(-45)">
            <rect x="0" y="0" width="340" height="48" fill="${p.accent}" stroke="${p.secondary}" stroke-width="2" />
            <text x="170" y="24" font-family="${p.fontFamilyBand}" font-size="15" font-weight="900" fill="${p.secondary}" text-anchor="middle" letter-spacing="3">
              ${cleanBand}
            </text>
            <text x="170" y="40" font-family="'Courier New', monospace" font-size="9" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">
              ★ 45 RPM • ${catNum} ★
            </text>
          </g>

          <!-- Top Right Badge -->
          <g transform="translate(${width - 110}, 30)">
            <circle cx="24" cy="24" r="22" fill="${p.darkBg1}" stroke="${p.primary}" stroke-width="2" />
            <text x="24" y="28" font-family="'Courier New', monospace" font-size="10" font-weight="900" fill="${p.primary}" text-anchor="middle">
              ${badgeLabel}
            </text>
          </g>

          <!-- Bottom Placard -->
          <g transform="translate(36, ${height - 150})">
            <rect width="${width - 72}" height="108" rx="8" fill="${p.darkBg1}" fill-opacity="0.9" stroke="${p.primary}" stroke-width="1.5" />
            <text x="${(width - 72) / 2}" y="32" font-family="'Courier New', monospace" font-size="11" font-weight="700" fill="${p.primary}" text-anchor="middle" letter-spacing="3">
              ★ SINGELUTGÅVA ★
            </text>
            <text x="${(width - 72) / 2}" y="68" font-family="${p.fontFamilyTitle}" font-size="${dynamicTitleSize > 38 ? 38 : dynamicTitleSize}" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.5" filter="url(#textShadow)">
              ${cleanTitle}
            </text>
            <text x="${(width - 72) / 2}" y="92" font-family="'Courier New', monospace" font-size="11" font-weight="700" fill="${p.secondary}" text-anchor="middle" letter-spacing="2">
              ${cleanSubtitle}
            </text>
          </g>
        `
      }

      // ----------------------------------------------------------------------
      // LAYOUT 3: SIDEBAR MODERN (Blue Note / Prestige Vertical Column)
      // ----------------------------------------------------------------------
      else if (chosenLayout === 'sidebar_modern') {
        const sidebarWidth = 260
        layoutSvgContent = `
          <!-- Left Vertical Column -->
          <rect x="0" y="0" width="${sidebarWidth}" height="${height}" fill="${p.darkBg1}" fill-opacity="0.96" />
          <line x1="${sidebarWidth}" y1="0" x2="${sidebarWidth}" y2="${height}" stroke="${p.primary}" stroke-width="3" />
          <line x1="${sidebarWidth + 4}" y1="0" x2="${sidebarWidth + 4}" y2="${height}" stroke="${p.secondary}" stroke-width="1" stroke-opacity="0.4" />

          <!-- Outer Border around photo section -->
          <rect x="14" y="14" width="${width - 28}" height="${height - 28}" fill="none" stroke="${p.primary}" stroke-width="1.5" stroke-opacity="0.6" />

          <!-- Left Column Content -->
          <g transform="translate(24, 40)">
            <!-- Top Series Badge -->
            <rect width="120" height="26" fill="${p.accent}" rx="3" />
            <text x="60" y="17" font-family="'Courier New', monospace" font-size="10" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">
              ${badgeLabel} • 7"
            </text>

            <!-- Catalog Stamp -->
            <text x="0" y="60" font-family="'Courier New', monospace" font-size="12" font-weight="900" fill="${p.primary}" letter-spacing="2">
              ${catNum}
            </text>

            <!-- Band Name Stacked/Punched -->
            <text x="0" y="115" font-family="${p.fontFamilyBand}" font-size="32" font-weight="900" fill="${p.secondary}" letter-spacing="2">
              DET 7:e
            </text>
            <text x="0" y="152" font-family="${p.fontFamilyBand}" font-size="34" font-weight="900" fill="${p.secondary}" letter-spacing="2">
              GUNGET
            </text>

            <line x1="0" y1="180" x2="200" y2="180" stroke="${p.primary}" stroke-width="2" />

            <!-- Song Title in Sidebar -->
            <text x="0" y="240" font-family="${p.fontFamilyTitle}" font-size="${dynamicTitleSize > 32 ? 30 : dynamicTitleSize}" font-weight="900" fill="#ffffff" letter-spacing="1">
              ${cleanTitle.length > 18 ? cleanTitle.slice(0, 18) + '...' : cleanTitle}
            </text>

            <!-- Subtitle -->
            <text x="0" y="280" font-family="'Courier New', monospace" font-size="10" font-weight="700" fill="${p.primary}" letter-spacing="1">
              ${cleanSubtitle.slice(0, 26)}
            </text>

            <!-- Record Label / Series Tag -->
            <g transform="translate(0, ${height - 180})">
              <text x="0" y="0" font-family="'Courier New', monospace" font-size="9" font-weight="700" fill="${p.secondary}" fill-opacity="0.7" letter-spacing="1">
                LTD COLLECTOR'S 45
              </text>
              <text x="0" y="20" font-family="'Courier New', monospace" font-size="9" font-weight="700" fill="${p.primary}" letter-spacing="1">
                MALMÖ • SWEDEN
              </text>
            </g>
          </g>
        `
      }

      // ----------------------------------------------------------------------
      // LAYOUT 4: POSTER FRAME (Minimalist Vintage Exhibition Border)
      // ----------------------------------------------------------------------
      else if (chosenLayout === 'poster_frame') {
        layoutSvgContent = `
          <!-- Bottom & Top Shading -->
          <rect x="0" y="0" width="${width}" height="120" fill="url(#topGrad)" />
          <rect x="0" y="${height - 160}" width="${width}" height="160" fill="url(#bottomGrad)" />

          <!-- Fine Inset Borders with Corner Ornaments -->
          <rect x="18" y="18" width="${width - 36}" height="${height - 36}" fill="none" stroke="${p.primary}" stroke-width="3" rx="4" />
          <rect x="26" y="26" width="${width - 52}" height="${height - 52}" fill="none" stroke="${p.secondary}" stroke-width="1" stroke-opacity="0.4" rx="2" />

          <!-- Top Letterpress -->
          <text x="${width / 2}" y="62" font-family="${p.fontFamilyBand}" font-size="34" font-weight="900" fill="${p.secondary}" text-anchor="middle" letter-spacing="5" filter="url(#textShadow)">
            ${cleanBand}
          </text>
          <text x="${width / 2}" y="84" font-family="'Courier New', monospace" font-size="11" font-weight="700" fill="${p.primary}" text-anchor="middle" letter-spacing="3">
            — ${catNum} • ${badgeLabel} —
          </text>

          <!-- Bottom Plaque with Border -->
          <g transform="translate(60, ${height - 130})">
            <rect width="${width - 120}" height="82" rx="4" fill="${p.darkBg1}" fill-opacity="0.92" stroke="${p.primary}" stroke-width="1.5" />
            <text x="${(width - 120) / 2}" y="42" font-family="${p.fontFamilyTitle}" font-size="${dynamicTitleSize > 36 ? 36 : dynamicTitleSize}" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2" filter="url(#textShadow)">
              ${cleanTitle}
            </text>
            <text x="${(width - 120) / 2}" y="66" font-family="'Courier New', monospace" font-size="11" font-weight="700" fill="${p.secondary}" text-anchor="middle" letter-spacing="2">
              ${cleanSubtitle}
            </text>
          </g>
        `
      }

      // ----------------------------------------------------------------------
      // LAYOUT 5: CENTER BADGE (Round Vinyl Label Center Stamp)
      // ----------------------------------------------------------------------
      else if (chosenLayout === 'center_badge') {
        const badgeRadius = 135
        layoutSvgContent = `
          <!-- Perimeter Border -->
          <rect x="16" y="16" width="${width - 32}" height="${height - 32}" fill="none" stroke="${p.primary}" stroke-width="2.5" stroke-opacity="0.8" rx="6" />

          <!-- Top Band Name Ribbon -->
          <rect x="0" y="0" width="${width}" height="100" fill="url(#topGrad)" />
          <text x="${width / 2}" y="56" font-family="${p.fontFamilyBand}" font-size="38" font-weight="900" fill="${p.secondary}" text-anchor="middle" letter-spacing="4" filter="url(#textShadow)">
            ${cleanBand}
          </text>
          <text x="${width / 2}" y="80" font-family="'Courier New', monospace" font-size="11" font-weight="700" fill="${p.primary}" text-anchor="middle" letter-spacing="3">
            ★ ÄKTA SKANDINAVISK BLUESROCK ★
          </text>

          <!-- Center Vinyl Rondell Badge -->
          <g transform="translate(400, 430)">
            <circle cx="0" cy="0" r="${badgeRadius}" fill="${p.darkBg1}" fill-opacity="0.94" stroke="${p.primary}" stroke-width="4" filter="url(#textShadow)" />
            <circle cx="0" cy="0" r="${badgeRadius - 12}" fill="none" stroke="${p.secondary}" stroke-width="1.5" stroke-opacity="0.5" />
            <circle cx="0" cy="0" r="${badgeRadius - 20}" fill="none" stroke="${p.primary}" stroke-width="1" stroke-dasharray="4 3" stroke-opacity="0.4" />

            <!-- Spindle Center Hole -->
            <circle cx="0" cy="0" r="16" fill="#000000" stroke="${p.secondary}" stroke-width="2" />

            <!-- Rondell Typography -->
            <text x="0" y="-85" font-family="'Courier New', monospace" font-size="10" font-weight="900" fill="${p.primary}" text-anchor="middle" letter-spacing="3">
              ${catNum}
            </text>
            <text x="0" y="-62" font-family="${p.fontFamilyBand}" font-size="14" font-weight="900" fill="${p.secondary}" text-anchor="middle" letter-spacing="2">
              DET 7:e GUNGET
            </text>

            <!-- Horizontal Split Bar -->
            <line x1="-90" y1="-44" x2="90" y2="-44" stroke="${p.primary}" stroke-width="1.5" />

            <text x="0" y="-22" font-family="'Courier New', monospace" font-size="10" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">
              ${badgeLabel} • SIDA ${isOriginal ? 'A' : 'B'}
            </text>

            <!-- Song Title in Lower Arc of Center Label -->
            <text x="0" y="48" font-family="${p.fontFamilyTitle}" font-size="${dynamicTitleSize > 24 ? 22 : dynamicTitleSize}" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">
              ${cleanTitle}
            </text>
            <text x="0" y="74" font-family="'Courier New', monospace" font-size="9" font-weight="700" fill="${p.secondary}" text-anchor="middle" letter-spacing="1.5">
              ${cleanSubtitle.slice(0, 32)}
            </text>
          </g>
        `
      }

      const svgOverlay = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${p.darkBg1}" stop-opacity="0.96" />
            <stop offset="65%" stop-color="${p.darkBg2}" stop-opacity="0.80" />
            <stop offset="100%" stop-color="${p.darkBg2}" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="bottomGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="${p.darkBg1}" stop-opacity="0.97" />
            <stop offset="65%" stop-color="${p.darkBg2}" stop-opacity="0.85" />
            <stop offset="100%" stop-color="${p.darkBg2}" stop-opacity="0" />
          </linearGradient>
          <filter id="textShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="3" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.95" />
          </filter>
          <filter id="ringBlur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        ${layoutSvgContent}
        ${agingSvg}
      </svg>
      `

      // Photo Filters & Resizing with Sharp
      let sharpChain = sharp(imageBuffer).resize(width, height, { fit: 'cover', position: 'center' })

      if (photoFilter === 'bw') {
        sharpChain = sharpChain.grayscale().modulate({ brightness: 0.98 })
      } else if (photoFilter === 'vintage_warm') {
        sharpChain = sharpChain.modulate({ brightness: 0.96, saturation: 1.22, hue: -4 })
      } else if (photoFilter === 'punchy') {
        sharpChain = sharpChain.modulate({ brightness: 1.02, saturation: 1.35 })
      } else {
        // Natural
        sharpChain = sharpChain.modulate({ brightness: 0.98, saturation: 1.05 })
      }

      imageBuffer = await sharpChain
        .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
        .jpeg({ quality: 94 })
        .toBuffer()
    } else {
      // Pure native AI text: Just format cleanly to 800x800 without SVG overlay
      imageBuffer = await sharp(imageBuffer)
        .resize(width, height, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 94 })
        .toBuffer()
    }
  } catch (compErr) {
    console.warn('[GenerateCover] Sharp compositing warning:', compErr)
  }

  const safeTitle = (title || 'omslag').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)
  const fileName = `cover-${safeTitle}-${nanoid(6)}.jpg`

  let publicUrl = ''

  // 4. Save Image: Try Vercel Blob in production, or local public/images/records/
  const blobToken = getBlobToken()
  if (blobToken) {
    try {
      const blob = await put(`records/${fileName}`, imageBuffer, {
        access: 'public',
        token: blobToken,
        contentType: 'image/jpeg',
      })
      publicUrl = blob.url
    } catch {
      // Fallback to local storage if blob upload fails
    }
  }

  if (!publicUrl) {
    try {
      const recordsDir = path.resolve(process.cwd(), 'public/images/records')
      await fs.mkdir(recordsDir, { recursive: true })
      const filePath = path.join(recordsDir, fileName)
      await fs.writeFile(filePath, imageBuffer)
      publicUrl = `/images/records/${fileName}`
    } catch (fsErr) {
      console.warn('[GenerateCover] Local disk write failed (serverless environment), falling back to base64 data URL:', fsErr)
      publicUrl = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
    }
  }

  return {
    success: true,
    url: publicUrl,
    coverUrl: publicUrl,
    engine: usedEngine,
    styleName: chosenStyle,
    layout: chosenLayout,
    agingEffect: chosenAging,
    title: title || 'Det 7:e Gunget',
    prompt: source === 'photo' ? 'Skapat från Det 7:e Gungets photoshoot' : 'AI-genererad bluesrock-illustration',
  }
})

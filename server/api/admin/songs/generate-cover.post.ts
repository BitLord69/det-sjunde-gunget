import fs from 'node:fs/promises'
import path from 'node:path'
import { nanoid } from 'nanoid'
import { put } from '@vercel/blob'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { siteSettings } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

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
    stylePreset = 'auto', // 'auto' | 'sonet_gold' | 'chess_crimson' | 'stax_amber' | 'bluenote_navy' | 'vintage_cream'
    textRenderer = 'theme', // 'theme' | 'ai_native'
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
    } catch (_) {}
  }

  let imageBuffer: Buffer | null = null

  // ----------------------------------------------------
  // BRANCH A: Direct Photo-to-Vinyl from Photoshoot
  // ----------------------------------------------------
  if (source === 'photo' && photoPath) {
    try {
      const cleanRel = photoPath.replace(/^\/+/, '')
      const absPath = path.resolve(process.cwd(), 'public', cleanRel)
      imageBuffer = await fs.readFile(absPath)
    } catch (photoErr) {
      console.error('[GenerateCover] Failed to read band photo:', photoErr)
      throw createError({
        statusCode: 400,
        message: 'Kunde inte läsa det valda bandfotot.',
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
    let prompt = ''
    if (promptMode === 'custom' && customPrompt && customPrompt.trim()) {
      prompt = customPrompt.trim()
    } else {
      let subject = ''
      if (includeBand) {
        subject = `Award-winning square 35mm film photograph of the Swedish blues rock band in this reference photo performing on a 1970s stage. STRICT REQUIREMENT: Total count of human beings in the entire image is EXACTLY FOUR (4) MUSICIANS. Absolutely NO 5th person, NO second guitarist, NO backing musicians, NO stage extras.

The only 4 band members on stage:
1. Janis (left): Lead singer in fedora hat and dark shirt cupping blues harmonica to vintage microphone. (Vocalist only, no guitar).
2. Marcus (center-left): Lead guitarist playing vintage sunburst Fender electric guitar.
3. Bosse (center-right): Bassist wearing sunglasses & leather jacket playing bass guitar.
4. Jonas (background): Drummer seated behind a vintage Ludwig drum kit.`
      } else {
        subject = `Moody cinematic 1970s analog still life blues album artwork for the song '${title}'. A vintage glowing Fender tube guitar amplifier with warm amber vacuum tubes, a vintage sunburst electric guitar, and a classic Hohner Marine Band harmonica on wooden floorboards, atmospheric smoky reflections and analog film grain.`
      }

      let eraStyle = '1970s Scandinavian blues-rock record sleeve aesthetic (Sonet / Gazell Records) in warm analog Kodak film tones (amber ochre, deep navy, slate gray).'
      if (era === '60s') {
        eraStyle = '1960s raw Chicago blues club aesthetic (Chess Records), high contrast moody duotone with deep shadows and analog grain.'
      }

      let textInstr = 'CRITICAL: DO NOT render any text, logos, or words anywhere in the image (leave clean margin for cover jacket typography).'
      if (textRenderer === 'ai_native') {
        textInstr = `Typography on record cover: Authentic 1970s vintage vinyl single cover typography featuring band name 'DET 7:E GUNGET' and song title '${(title || '').toUpperCase()}'. Let the typography be artistically styled and positioned anywhere on the cover where it naturally fits the visual composition (such as stylized header, diagonal retro banner, vintage stamp, integrated club signage, or subtle corner letterpress).`
      }

      prompt = `Square format 1970s vintage album cover photo artwork. ${subject} Style: ${eraStyle} ${textInstr} Lighting: Warm tungsten spotlights, atmospheric haze, authentic 35mm film grain, analog color grading, masterpiece quality.`
    }

    // 1. Send Multimodal (Image + Prompt) to Gemini 2.5 Flash Image
    if (apiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`
        
        const parts: any[] = []
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
          const data = await res.json()
          const part = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data)
          if (part?.inlineData?.data) {
            imageBuffer = Buffer.from(part.inlineData.data, 'base64')
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
      const cleanBand = 'DET 7:E GUNGET'
      const rawTitle = (title || 'Det 7:e Gunget').toUpperCase()
      const cleanTitle = rawTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      
      let subtitleText = isOriginal ? 'ORIGINALKOMPOSITION' : (originalArtist ? `ORIGINAL AV ${originalArtist.toUpperCase()}` : 'SKANDINAVISK BLUESROCK')
      subtitleText = subtitleText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

      // Choose style preset (randomize if 'auto')
      const styles = ['sonet_gold', 'chess_crimson', 'stax_amber', 'bluenote_navy', 'vintage_cream']
      let chosenStyle = stylePreset
      if (!chosenStyle || chosenStyle === 'auto') {
        const hash = (title || 'det-7e-gunget').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
        chosenStyle = styles[hash % styles.length]
      }

    let svgOverlay = ''

    if (chosenStyle === 'chess_crimson') {
      // STIL 2: CHESS RECORDS (Röd / Vintage Serif / Klassisk 60-tal)
      let titleSize = cleanTitle.length > 24 ? 32 : 44
      svgOverlay = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0a0302" stop-opacity="0.95" />
            <stop offset="70%" stop-color="#3b0707" stop-opacity="0.75" />
            <stop offset="100%" stop-color="#3b0707" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="bottomGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="#0a0302" stop-opacity="0.96" />
            <stop offset="70%" stop-color="#3b0707" stop-opacity="0.85" />
            <stop offset="100%" stop-color="#3b0707" stop-opacity="0" />
          </linearGradient>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.95" />
          </filter>
        </defs>

        <rect x="0" y="0" width="${width}" height="170" fill="url(#topGrad)" />
        <rect x="0" y="${height - 180}" width="${width}" height="180" fill="url(#bottomGrad)" />

        <!-- Weathered Outer Border -->
        <rect x="14" y="14" width="${width - 28}" height="${height - 28}" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-opacity="0.8" rx="4" />
        <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="none" stroke="#fef3c7" stroke-width="1" stroke-opacity="0.3" rx="2" />

        <!-- Top Red Accent Bar with Serif Band Header -->
        <g transform="translate(${width - 120}, 26)">
          <circle cx="20" cy="20" r="18" fill="#dc2626" stroke="#fef3c7" stroke-width="1.5" />
          <text x="20" y="24" font-family="'Courier New', monospace" font-size="10" font-weight="900" fill="#ffffff" text-anchor="middle">45</text>
        </g>

        <text x="${width / 2}" y="78" font-family="'Georgia', 'Times New Roman', serif" font-size="44" font-weight="900" fill="#fef3c7" text-anchor="middle" letter-spacing="3" filter="url(#shadow)">
          ${cleanBand}
        </text>
        <text x="${width / 2}" y="106" font-family="'Courier New', monospace" font-size="11" font-weight="700" fill="#ef4444" text-anchor="middle" letter-spacing="4">
          ★ CHESS BLUES SERIES ★
        </text>

        <!-- Bottom Title in Heavy Serif -->
        <text x="${width / 2}" y="${height - 76}" font-family="'Georgia', 'Times New Roman', serif" font-size="${titleSize}" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.5" filter="url(#shadow)">
          ${cleanTitle}
        </text>
        <text x="${width / 2}" y="${height - 42}" font-family="'Courier New', monospace" font-size="12" font-weight="700" fill="#f87171" text-anchor="middle" letter-spacing="2">
          ${subtitleText}
        </text>
      </svg>
      `
    } else if (chosenStyle === 'bluenote_navy') {
      // STIL 3: BLUE NOTE / PRESTIGE (Minimalistisk Asymmetrisk / Cyan / Midnatt)
      let titleSize = cleanTitle.length > 24 ? 30 : 42
      svgOverlay = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#030712" stop-opacity="0.94" />
            <stop offset="70%" stop-color="#082f49" stop-opacity="0.75" />
            <stop offset="100%" stop-color="#082f49" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="bottomGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="#030712" stop-opacity="0.95" />
            <stop offset="70%" stop-color="#082f49" stop-opacity="0.8" />
            <stop offset="100%" stop-color="#082f49" stop-opacity="0" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="${width}" height="160" fill="url(#topGrad)" />
        <rect x="0" y="${height - 170}" width="${width}" height="170" fill="url(#bottomGrad)" />

        <!-- Double Fine Cyan Lines -->
        <rect x="16" y="16" width="${width - 32}" height="${height - 32}" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-opacity="0.7" />

        <!-- Left-Aligned Bold Modernist Typography -->
        <text x="36" y="68" font-family="'Helvetica Neue', 'Arial Black', sans-serif" font-size="42" font-weight="900" fill="#38bdf8" letter-spacing="2">
          ${cleanBand}
        </text>
        <text x="36" y="94" font-family="'Courier New', monospace" font-size="11" font-weight="700" fill="#bae6fd" letter-spacing="3">
          MIDNIGHT SESSION • 45 RPM
        </text>

        <!-- Right Badge -->
        <g transform="translate(${width - 110}, 34)">
          <rect width="74" height="28" fill="#0284c7" rx="3" />
          <text x="37" y="19" font-family="'Arial Black', sans-serif" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle">45 RPM</text>
        </g>

        <!-- Bottom Title Left-Aligned -->
        <text x="36" y="${height - 68}" font-family="'Helvetica Neue', 'Arial Black', sans-serif" font-size="${titleSize}" font-weight="900" fill="#ffffff" letter-spacing="1">
          ${cleanTitle}
        </text>
        <text x="36" y="${height - 38}" font-family="'Courier New', monospace" font-size="12" font-weight="700" fill="#38bdf8" letter-spacing="2">
          ${subtitleText}
        </text>
      </svg>
      `
    } else if (chosenStyle === 'stax_amber') {
      // STIL 4: STAX / ATLANTIC 70s SOUL-BLUES (Bärnsten / Tangerine / Varm Sepia)
      let titleSize = cleanTitle.length > 24 ? 32 : 46
      svgOverlay = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#180a02" stop-opacity="0.95" />
            <stop offset="70%" stop-color="#451a03" stop-opacity="0.75" />
            <stop offset="100%" stop-color="#451a03" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="bottomGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="#180a02" stop-opacity="0.96" />
            <stop offset="70%" stop-color="#451a03" stop-opacity="0.85" />
            <stop offset="100%" stop-color="#451a03" stop-opacity="0" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="${width}" height="175" fill="url(#topGrad)" />
        <rect x="0" y="${height - 180}" width="${width}" height="180" fill="url(#bottomGrad)" />

        <rect x="14" y="14" width="${width - 28}" height="${height - 28}" fill="none" stroke="#f97316" stroke-width="3" stroke-opacity="0.75" rx="8" />

        <g transform="translate(${width - 125}, 28)">
          <rect width="90" height="32" rx="16" fill="#ea580c" stroke="#fef08a" stroke-width="1.5" />
          <text x="45" y="21" font-family="'Trebuchet MS', sans-serif" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle">45 RPM</text>
        </g>

        <text x="${width / 2}" y="76" font-family="'Trebuchet MS', 'Arial Black', sans-serif" font-size="48" font-weight="900" fill="#fed7aa" text-anchor="middle" letter-spacing="3">
          ${cleanBand}
        </text>
        <text x="${width / 2}" y="104" font-family="'Courier New', monospace" font-size="12" font-weight="700" fill="#f97316" text-anchor="middle" letter-spacing="3">
          ★ SCANDINAVIAN GROOVE &amp; BLUES ★
        </text>

        <text x="${width / 2}" y="${height - 76}" font-family="'Trebuchet MS', 'Arial Black', sans-serif" font-size="${titleSize}" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">
          ${cleanTitle}
        </text>
        <text x="${width / 2}" y="${height - 42}" font-family="'Courier New', monospace" font-size="13" font-weight="700" fill="#fdba74" text-anchor="middle" letter-spacing="2">
          ${subtitleText}
        </text>
      </svg>
      `
    } else if (chosenStyle === 'vintage_cream') {
      // STIL 5: VINTAGE CREAM & SEPIA DELUXE (Ornamenterad / Klassisk Skivfodral)
      let titleSize = cleanTitle.length > 24 ? 30 : 42
      svgOverlay = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0f0c08" stop-opacity="0.94" />
            <stop offset="70%" stop-color="#291e10" stop-opacity="0.75" />
            <stop offset="100%" stop-color="#291e10" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="bottomGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="#0f0c08" stop-opacity="0.95" />
            <stop offset="70%" stop-color="#291e10" stop-opacity="0.80" />
            <stop offset="100%" stop-color="#291e10" stop-opacity="0" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="${width}" height="175" fill="url(#topGrad)" />
        <rect x="0" y="${height - 180}" width="${width}" height="180" fill="url(#bottomGrad)" />

        <rect x="16" y="16" width="${width - 32}" height="${height - 32}" fill="none" stroke="#d97706" stroke-width="2" stroke-opacity="0.6" />
        <rect x="22" y="22" width="${width - 44}" height="${height - 44}" fill="none" stroke="#fef3c7" stroke-width="1" stroke-opacity="0.3" />

        <text x="${width / 2}" y="74" font-family="'Palatino', 'Georgia', serif" font-size="46" font-weight="900" fill="#fef3c7" text-anchor="middle" letter-spacing="4">
          ${cleanBand}
        </text>
        <text x="${width / 2}" y="102" font-family="'Palatino', serif" font-size="12" font-style="italic" fill="#fbbf24" text-anchor="middle" letter-spacing="3">
          — 45 R.P.M. • ÄKTA BLUESROCK —
        </text>

        <text x="${width / 2}" y="${height - 76}" font-family="'Palatino', 'Georgia', serif" font-size="${titleSize}" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">
          ${cleanTitle}
        </text>
        <text x="${width / 2}" y="${height - 44}" font-family="'Courier New', monospace" font-size="12" font-weight="700" fill="#fde68a" text-anchor="middle" letter-spacing="2">
          ${subtitleText}
        </text>
      </svg>
      `
    } else {
      // STIL 1: SONET GOLD (Standard Klassisk Guld Letterpress)
      let titleSize = cleanTitle.length > 28 ? 30 : cleanTitle.length > 18 ? 38 : 46
      const eraAccentColor = '#f59e0b'
      const eraSubText = era === '60s' ? '★ CHICAGO BLUES • 45 RPM ★' : '★ SKANDINAVISK BLUESROCK ★'

      svgOverlay = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0a0705" stop-opacity="0.94" />
            <stop offset="60%" stop-color="#140e0a" stop-opacity="0.75" />
            <stop offset="100%" stop-color="#140e0a" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="bottomGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="#0a0705" stop-opacity="0.95" />
            <stop offset="65%" stop-color="#140e0a" stop-opacity="0.80" />
            <stop offset="100%" stop-color="#140e0a" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="goldText" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="${eraAccentColor}" />
            <stop offset="50%" stop-color="#fef08a" />
            <stop offset="100%" stop-color="#d97706" />
          </linearGradient>
          <filter id="textShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="3" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.95" />
          </filter>
        </defs>

        <rect x="0" y="0" width="${width}" height="175" fill="url(#topGrad)" />
        <rect x="0" y="${height - 180}" width="${width}" height="180" fill="url(#bottomGrad)" />

        <rect x="12" y="12" width="${width - 24}" height="${height - 24}" fill="none" stroke="${eraAccentColor}" stroke-width="3" stroke-opacity="0.6" rx="6" />
        <rect x="18" y="18" width="${width - 36}" height="${height - 36}" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.25" rx="4" />

        <g transform="translate(${width - 130}, 28)">
          <rect width="98" height="34" rx="6" fill="#b45309" fill-opacity="0.85" stroke="#fef08a" stroke-width="1" />
          <text x="49" y="22" font-family="'Impact', 'Arial Black', sans-serif" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">
            45 RPM
          </text>
        </g>

        <text x="${width / 2}" y="76" font-family="'Impact', 'Arial Black', sans-serif" font-size="50" font-weight="900" fill="url(#goldText)" text-anchor="middle" letter-spacing="4" filter="url(#textShadow)">
          ${cleanBand}
        </text>
        <text x="${width / 2}" y="104" font-family="'Courier New', monospace" font-size="12" font-weight="700" fill="#fef08a" text-anchor="middle" letter-spacing="4" fill-opacity="0.9">
          ${eraSubText}
        </text>

        <text x="${width / 2}" y="${height - 76}" font-family="'Impact', 'Arial Black', sans-serif" font-size="${titleSize}" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2" filter="url(#textShadow)">
          ${cleanTitle}
        </text>
        <text x="${width / 2}" y="${height - 42}" font-family="'Courier New', monospace" font-size="13" font-weight="700" fill="${eraAccentColor}" text-anchor="middle" letter-spacing="2.5">
          ${subtitleText}
        </text>
      </svg>
      `
      }

      let sharpChain = sharp(imageBuffer).resize(width, height, { fit: 'cover', position: 'center' })
      if (source === 'photo') {
        sharpChain = sharpChain.modulate({
          brightness: 0.95,
          saturation: 1.15,
        })
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
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(`records/${fileName}`, imageBuffer, {
        access: 'public',
        contentType: 'image/jpeg',
      })
      publicUrl = blob.url
    } catch (_) {}
  }

  if (!publicUrl) {
    const recordsDir = path.resolve(process.cwd(), 'public/images/records')
    await fs.mkdir(recordsDir, { recursive: true })
    const filePath = path.join(recordsDir, fileName)
    await fs.writeFile(filePath, imageBuffer)
    publicUrl = `/images/records/${fileName}`
  }

  return {
    success: true,
    url: publicUrl,
    title: title || 'Det 7:e Gunget',
    prompt: source === 'photo' ? 'Skapat från Det 7:e Gungets photoshoot' : 'AI-genererad bluesrock-illustration',
  }
})

import fs from 'node:fs/promises'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { siteSettings } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  const { title = 'Låt', audioUrl = '', lyrics = '', duration = 180 } = body

  if (!lyrics || !lyrics.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Ingen låttext angiven att synkronisera.',
    })
  }

  // 1. Resolve Gemini API Key
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
      // database might not be initialized
    }
  }

  if (!apiKey) {
    throw createError({
      statusCode: 400,
      message: 'Google Gemini API-nyckel saknas. Konfigurera den i Inställningar eller i .env.',
    })
  }

  // 2. Prepare request parts for Gemini 2.5 Flash
  const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = []

  let audioLoaded = false
  if (audioUrl && (audioUrl.startsWith('http://') || audioUrl.startsWith('https://'))) {
    try {
      const res = await fetch(audioUrl)
      if (res.ok) {
        const contentType = res.headers.get('content-type') || 'audio/mpeg'
        const arrayBuf = await res.arrayBuffer()
        // If file is reasonable size for inline transfer (< 25MB)
        if (arrayBuf.byteLength > 0 && arrayBuf.byteLength < 22 * 1024 * 1024) {
          const base64Audio = Buffer.from(arrayBuf).toString('base64')
          parts.push({
            inlineData: {
              mimeType: contentType.includes('wav') ? 'audio/wav' : 'audio/mp3',
              data: base64Audio,
            },
          })
          audioLoaded = true
        }
      }
    } catch (audioErr) {
      console.warn('[SyncLyricsAI] Could not fetch audio file for inline analysis:', audioErr)
    }
  }

  const promptText = `Du är en expert på musikanalys och synkronisering av sångtexter i standard LRC-format ([mm:ss.xx] Textrad).

Låtens titel: "${title}"
${duration ? `Låtens totala längd: ca ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s.` : ''}
${audioLoaded ? 'En bifogad ljudfil finns. Lyssna noggrant på var varje textrad sjungs och sätt exakta tidsstämplar.' : 'Ingen ljudfil bifogad. Uppskatta och fördela tidsstämplarna realistiskt baserat på blues/rock-strukturen med ett intro på ca 15–25 sekunder, verser, refränger och eventuella solon.'}

Här är låttexten som ska tidsstämplas:
---
${lyrics.trim()}
---

REGLER:
1. Returnera ENBART texten i standard LRC-format ([mm:ss.xx] Textrad).
2. Varje sjungen rad MÅSTE ha en tidsstämpel i början, t.ex. [00:18.50] Näsan rinner, halsen brinner
3. Inkludera [Intro], [Vers 1], [Refräng], [Solo] eller liknande sektionsmarkeringar om de finns.
4. Om det är ett längre gitarr- eller munspelssolo i låten, lägg gärna till en rad som t.ex. [01:24.00] (Munspelssolo)
5. Skriv INGEN ingress, inga förklaringar och inga markdown-kodblock (som \`\`\`lrc). Returnera endast den råa texten.`

  parts.push({ text: promptText })

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[SyncLyricsAI] Gemini error response:', errText)
      throw new Error(`Gemini API-fel (${response.status})`)
    }

    const data = await response.json()
    let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Clean up any markdown codeblocks if model wrapped them
    resultText = resultText
      .replace(/^```[a-zA-Z]*\n?/, '')
      .replace(/\n?```$/, '')
      .trim()

    if (!resultText) {
      throw new Error('Inget textresultat mottogs från AI-motorn.')
    }

    return {
      success: true,
      syncedLyrics: resultText,
      audioAnalyzed: audioLoaded,
    }
  } catch (err: unknown) {
    console.error('[SyncLyricsAI Error]:', err)
    const msg = err instanceof Error ? err.message : 'Kunde inte synkronisera texten med AI.'
    throw createError({
      statusCode: 500,
      message: msg,
    })
  }
})

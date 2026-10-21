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

  // 1. Resolve Gemini API Key (prioritera databasen siteSettings, därefter miljövariabler)
  let apiKey = ''

  try {
    const setting = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'gemini_api_key'))
      .get()
    if (setting?.value && setting.value.trim().length > 0) {
      apiKey = setting.value.trim()
    }
  } catch (dbErr) {
    console.warn('[SyncLyricsAI] Could not read gemini_api_key from database:', dbErr)
  }

  if (!apiKey) {
    apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY || ''
  }

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

Här är HELA den fullständiga låttexten som SKA synkroniseras:
---
${lyrics.trim()}
---

ABSOLUT OVIKLIGA REGLER:
1. DU MÅSTE INKLUDERA EXAKT ALLA RADER OCH VERSER FRÅN ORIGINALTEXTEN OVAN. Du får UNDER INGA OMSTÄNDIGHETER korta ner, utelämna, sammanfatta eller klippa av texten efter halva låten.
2. Från första raden till sista raden: Hela texten måste finnas med i svaret.
3. Varje sjungen rad MÅSTE ha en tidsstämpel i början i formatet [mm:ss.xx] eller [mm:ss], t.ex. [00:18.50] Näsan rinner, halsen brinner
4. Om låten fortsätter längre än vad du hör tydligt i ljudfilen, MÅSTE du ändå skriva ut resten av raderna med rimligt uppskattade tidsstämplar i takt till låtens tempo. TEXT FÅR ALDRIG TAPPAS BORT!
5. Inkludera [Intro], [Vers 1], [Refräng], [Solo] eller sektionsmarkeringar om de finns i originalet.
6. Om det är ett längre solo i låten kan du lägga till en rad som [01:45.00] (Gitarrsolo) eller (Munspelssolo).
7. Returnera ENBART texten i standard LRC-format utan markdown-kodblock (\`\`\`lrc) och utan inledande eller avslutande kommentarer.`

  parts.push({ text: promptText })

  try {
    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash']
    let response: Response | null = null
    let lastErrText = ''

    for (const model of candidateModels) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      try {
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 8192,
            },
          }),
        })

        if (res.ok) {
          response = res
          break
        } else {
          lastErrText = await res.text()
          console.warn(`[SyncLyricsAI] Model ${model} failed (${res.status}):`, lastErrText)
        }
      } catch (fetchErr) {
        console.warn(`[SyncLyricsAI] Model ${model} fetch exception:`, fetchErr)
      }
    }

    if (!response || !response.ok) {
      console.error('[SyncLyricsAI] All Gemini models failed:', lastErrText)
      throw new Error(`Gemini API-fel (${response ? response.status : '500'})`)
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

    // Safeguard: Compare original lines with synced lines to guarantee no text truncation
    const rawOriginalLines = lyrics.split('\n')
    const originalNonEmpty = rawOriginalLines.filter((l: string) => l.trim().length > 0)
    const resultLines = resultText.split('\n').filter((l: string) => l.trim().length > 0)

    // Clean timestamp brackets for matching: [00:12.34]
    const cleanSyncedTexts = resultLines.map((l: string) =>
      l.replace(/\[\s*(?:\d{1,2}\s*:\s*)?\d{1,2}\s*:\s*\d{1,2}(?:[\.,:]\d{1,3})?\s*\]\s*/g, '').trim().toLowerCase()
    )

    // Find the latest original line found in the synced output
    let lastMatchedOrigIdx = -1
    for (let i = 0; i < originalNonEmpty.length; i++) {
      const origClean = originalNonEmpty[i]!
        .replace(/\[\s*(?:\d{1,2}\s*:\s*)?\d{1,2}\s*:\s*\d{1,2}(?:[\.,:]\d{1,3})?\s*\]\s*/g, '')
        .trim()
        .toLowerCase()
      if (origClean && cleanSyncedTexts.some((s: string) => s.includes(origClean) || origClean.includes(s))) {
        lastMatchedOrigIdx = i
      }
    }

    let wasAppended = false
    let finalSyncedText = resultText

    // If AI cut off and missed lines at the end of the song, recover them
    if (lastMatchedOrigIdx >= 0 && lastMatchedOrigIdx < originalNonEmpty.length - 1) {
      const missingLines = originalNonEmpty.slice(lastMatchedOrigIdx + 1)
      if (missingLines.length > 0) {
        console.warn(`[SyncLyricsAI] AI truncated ${missingLines.length} lines at end. Appending missing lines...`)
        wasAppended = true

        // Find last timestamp in resultLines to continue progression
        let lastSeconds = 120
        for (let j = resultLines.length - 1; j >= 0; j--) {
          const match = resultLines[j]!.match(/\[\s*(\d{1,2})\s*:\s*(\d{1,2})(?:[\.,:](\d{1,3}))?\s*\]/)
          if (match) {
            const m = parseInt(match[1] || '0', 10)
            const s = parseInt(match[2] || '0', 10)
            lastSeconds = m * 60 + s
            break
          }
        }

        const maxTotal = duration && duration > lastSeconds ? duration : lastSeconds + missingLines.length * 5
        const stepSec = Math.max(3, Math.min(8, (maxTotal - lastSeconds) / (missingLines.length + 1)))

        const appendedLines: string[] = []
        missingLines.forEach((mLine: string, mIdx: number) => {
          const curSec = Math.min(maxTotal - 2, Math.round(lastSeconds + (mIdx + 1) * stepSec))
          const mins = Math.floor(curSec / 60)
          const secs = Math.floor(curSec % 60)
          const stamp = `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.00]`
          appendedLines.push(`${stamp} ${mLine}`)
        })

        finalSyncedText = `${resultText}\n\n${appendedLines.join('\n')}`
      }
    }

    return {
      success: true,
      syncedLyrics: finalSyncedText,
      audioAnalyzed: audioLoaded,
      wasAppended,
      originalCount: originalNonEmpty.length,
      syncedCount: resultLines.length,
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

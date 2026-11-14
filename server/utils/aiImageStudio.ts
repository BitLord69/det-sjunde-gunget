import fs from 'node:fs/promises'
import path from 'node:path'
import type { H3Event } from 'h3'
import { getRequestURL } from 'h3'
import { nanoid } from 'nanoid'
import { put } from '@vercel/blob'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { siteSettings } from '../db/schema'
import { getBlobToken } from './blob'

export const DEFAULT_BAND_REFERENCE_REL_PATH = 'media/band/21..7de Gunget photoshoot1 21-6 26-3.jpg'

/**
 * Resolves the Gemini API key from environment variables, local .env file, or database siteSettings.
 */
export async function resolveGeminiApiKey(): Promise<string | undefined> {
  let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY

  if (!apiKey) {
    try {
      const envContent = await fs.readFile(path.resolve(process.cwd(), '.env'), 'utf-8')
      const match = envContent.match(/^GEMINI_API_KEY=(.+)$/m)
      if (match?.[1]) {
        apiKey = match[1].trim()
      }
    } catch {
      // .env file might not exist in serverless production
    }
  }

  if (!apiKey) {
    try {
      const setting = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, 'gemini_api_key'))
        .get()
      if (setting?.value && setting.value.trim()) {
        apiKey = setting.value.trim()
      }
    } catch {
      // Ignore DB lookup errors
    }
  }

  return apiKey
}

/**
 * Loads a public media image (or the default band reference photo) as a Buffer,
 * supporting both local filesystem and Vercel serverless origin fetch fallback.
 */
export async function loadPublicMediaBuffer(event: H3Event, relativeOrUrlPath: string): Promise<Buffer> {
  const trimmed = relativeOrUrlPath.trim()

  if (trimmed.startsWith('data:image/')) {
    const base64Data = trimmed.replace(/^data:image\/\w+;base64,/, '')
    return Buffer.from(base64Data, 'base64')
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const fetchRes = await fetch(trimmed)
    if (!fetchRes.ok) {
      throw new Error(`Kunde inte läsa extern bild (${fetchRes.status})`)
    }
    const arrBuf = await fetchRes.arrayBuffer()
    return Buffer.from(arrBuf)
  }

  const cleanRel = trimmed.replace(/^\/+/, '')
  const absPath = path.resolve(process.cwd(), 'public', cleanRel)
  try {
    return await fs.readFile(absPath)
  } catch (fsErr) {
    const reqUrl = getRequestURL(event)
    const fallbackUrl = `${reqUrl.origin}/${cleanRel}`
    const fetchRes = await fetch(fallbackUrl)
    if (fetchRes.ok) {
      const arrBuf = await fetchRes.arrayBuffer()
      return Buffer.from(arrBuf)
    }
    throw fsErr
  }
}

/**
 * Loads the official band reference photo as a base64 string for multimodal AI generation.
 */
export async function loadBandReferencePhotoBase64(event: H3Event): Promise<string | null> {
  try {
    const buf = await loadPublicMediaBuffer(event, DEFAULT_BAND_REFERENCE_REL_PATH)
    return buf.toString('base64')
  } catch (err) {
    console.warn('[AIImageStudio] Could not load band reference photo:', err)
    return null
  }
}

export interface GenerateAiStudioImageOptions {
  event: H3Event
  prompt: string
  includeBand?: boolean
  width: number
  height: number
  logPrefix?: string
}

export interface GenerateAiStudioImageResult {
  imageBuffer: Buffer | null
  usedEngine: 'gemini' | 'fallback'
}

/**
 * Generates an image using Gemini 2.5 Flash Image (with optional multimodal band reference photo)
 * and automatically falls back to Pollinations AI if Gemini is unavailable or fails.
 */
export async function generateAiStudioImage(
  options: GenerateAiStudioImageOptions,
): Promise<GenerateAiStudioImageResult> {
  const { event, prompt, includeBand = false, width, height, logPrefix = 'AIImageStudio' } = options

  const apiKey = await resolveGeminiApiKey()
  const bandRefBase64 = includeBand ? await loadBandReferencePhotoBase64(event) : null

  let imageBuffer: Buffer | null = null
  let usedEngine: 'gemini' | 'fallback' = 'gemini'

  // 1. Try Gemini 2.5 Flash Image Generation
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
        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>
        }
        const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
        if (part?.inlineData?.data) {
          imageBuffer = Buffer.from(part.inlineData.data, 'base64')
          usedEngine = 'gemini'
        }
      }
    } catch (gErr) {
      console.warn(`[${logPrefix}] Gemini API attempt failed, trying fallback:`, gErr)
    }
  }

  // 2. Fallback generator (Pollinations AI)
  if (!imageBuffer) {
    try {
      const seed = Math.floor(Math.random() * 900000) + 100000
      const encodedPrompt = encodeURIComponent(prompt)
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}`

      const pollRes = await fetch(pollinationsUrl)
      if (pollRes.ok) {
        const arrayBuf = await pollRes.arrayBuffer()
        imageBuffer = Buffer.from(arrayBuf)
        usedEngine = 'fallback'
      }
    } catch (pollErr) {
      console.error(`[${logPrefix}] Fallback generator failed:`, pollErr)
    }
  }

  return { imageBuffer, usedEngine }
}

export interface PersistStudioImageOptions {
  imageBuffer: Buffer
  folder: 'posters' | 'records'
  filePrefix: string
  slugSource: string
  maxSlugLength?: number
}

/**
 * Saves a generated studio JPEG Buffer to Vercel Blob (in production),
 * local `public/images/<folder>/` (in dev), or a base64 data URL fallback.
 */
export async function persistGeneratedStudioImage(options: PersistStudioImageOptions): Promise<string> {
  const { imageBuffer, folder, filePrefix, slugSource, maxSlugLength = 25 } = options
  const safeSlug = (slugSource || 'item').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, maxSlugLength)
  const fileName = `${filePrefix}-${safeSlug}-${nanoid(6)}.jpg`

  const blobToken = getBlobToken()
  if (blobToken) {
    try {
      const blob = await put(`${folder}/${fileName}`, imageBuffer, {
        access: 'public',
        token: blobToken,
        contentType: 'image/jpeg',
      })
      return blob.url
    } catch {
      // Fallback to local storage if blob upload fails
    }
  }

  try {
    const targetDir = path.resolve(process.cwd(), `public/images/${folder}`)
    await fs.mkdir(targetDir, { recursive: true })
    const filePath = path.join(targetDir, fileName)
    await fs.writeFile(filePath, imageBuffer)
    return `/images/${folder}/${fileName}`
  } catch (fsErr) {
    console.warn(`[AIImageStudio] Local write failed for ${folder}/${fileName}, using data URL:`, fsErr)
    return `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
  }
}

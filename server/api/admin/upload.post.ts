import fs from 'node:fs/promises'
import path from 'node:path'
import { put } from '@vercel/blob'
import { nanoid } from 'nanoid'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  let multipartData
  try {
    multipartData = await readMultipartFormData(event)
  } catch (parseError: any) {
    console.error('[Upload] Multipart parse error:', parseError)
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: `Kunde inte läsa uppladdad fil: ${parseError?.message || 'Ogiltigt format'}`,
    })
  }

  if (!multipartData || multipartData.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Ingen fil skickades med.',
    })
  }

  const fileItem = multipartData.find((item) => item.name === 'file' || item.filename)
  if (!fileItem || !fileItem.data || fileItem.data.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Ingen giltig fil skickades med.',
    })
  }

  // Admin file size limit: 50 MB (allows full lossless or uncompressed audio files)
  const MAX_ADMIN_FILE_SIZE = 50 * 1024 * 1024
  if (fileItem.data.length > MAX_ADMIN_FILE_SIZE) {
    const sizeMb = (fileItem.data.length / (1024 * 1024)).toFixed(1)
    throw createError({
      statusCode: 413,
      statusMessage: 'Payload Too Large',
      message: `Filen är för stor (${sizeMb} MB). Maximal tillåten storlek är 50 MB.`,
    })
  }

  const originalName = fileItem.filename || 'upload.bin'
  const rawExt = path.extname(originalName).toLowerCase() || '.bin'
  // Sanitize file extension to remove any illegal characters (such as :, ?, *, quotes)
  const cleanExt = rawExt.replace(/[^a-z0-9.]/g, '') || '.bin'
  const safeFilename = `${Date.now()}-${nanoid(6)}${cleanExt}`

  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV)
  const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN)

  // 1. Production / Vercel Blob storage
  if (hasBlobToken) {
    try {
      const blob = await put(`media/${safeFilename}`, fileItem.data, {
        access: 'public',
        contentType: fileItem.type || 'application/octet-stream',
      })
      return {
        success: true,
        url: blob.url,
        provider: 'vercel-blob',
      }
    } catch (blobError: any) {
      console.error('[Upload] Vercel Blob error:', blobError)
      // When deployed to Vercel, the filesystem is read-only so we cannot fall back to local disk
      if (isVercel) {
        throw createError({
          statusCode: 502,
          statusMessage: 'Blob Storage Error',
          message: `Uppladdning till Vercel Blob misslyckades: ${blobError?.message || String(blobError)}`,
        })
      }
      console.warn('[Upload] Vercel Blob misslyckades i utvecklingsmiljö, faller tillbaka till lokal disk...')
    }
  } else if (isVercel) {
    // We are running on Vercel without a Blob token configured
    console.error('[Upload] Vercel runtime detected but BLOB_READ_WRITE_TOKEN is missing.')
    throw createError({
      statusCode: 500,
      statusMessage: 'Storage Not Configured',
      message: 'Vercel Blob Storage är inte konfigurerat (BLOB_READ_WRITE_TOKEN saknas i Vercels miljövariabler).',
    })
  }

  // 2. Local File System Fallback (for local development)
  try {
    const uploadDir = path.resolve(process.cwd(), 'public/media/uploads')
    await fs.mkdir(uploadDir, { recursive: true })

    const filePath = path.join(uploadDir, safeFilename)
    await fs.writeFile(filePath, fileItem.data)

    return {
      success: true,
      url: `/media/uploads/${safeFilename}`,
      provider: 'local',
    }
  } catch (fsError: any) {
    console.error('[Upload] Local save error:', fsError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: `Kunde inte spara filen på servern: ${fsError?.message || String(fsError)}`,
    })
  }
})

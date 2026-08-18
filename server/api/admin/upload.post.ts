import fs from 'node:fs/promises'
import path from 'node:path'
import { put } from '@vercel/blob'
import { nanoid } from 'nanoid'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  const multipartData = await readMultipartFormData(event)
  if (!multipartData || multipartData.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ingen fil skickades med.',
    })
  }

  const fileItem = multipartData.find((item) => item.name === 'file' || item.filename)
  if (!fileItem || !fileItem.data || fileItem.data.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ingen giltig bildfil hittades.',
    })
  }

  const originalName = fileItem.filename || 'upload.jpg'
  const ext = path.extname(originalName).toLowerCase() || '.jpg'
  const safeFilename = `${Date.now()}-${nanoid(6)}${ext}`

  // 1. If Vercel Blob token is configured (e.g. production)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(`media/${safeFilename}`, fileItem.data, {
        access: 'public',
        contentType: fileItem.type || 'image/jpeg',
      })
      return {
        success: true,
        url: blob.url,
        provider: 'vercel-blob',
      }
    } catch (blobError: any) {
      console.warn('[Upload] Vercel Blob upload failed, falling back to local:', blobError.message)
    }
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
      statusMessage: 'Kunde inte spara filen på servern.',
    })
  }
})

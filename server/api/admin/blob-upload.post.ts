import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { requireAdminAuth } from '../../utils/auth'
import { getBlobToken } from '../../utils/blob'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  const token = getBlobToken()
  if (!token) {
    throw createError({
      statusCode: 501,
      statusMessage: 'Blob Storage Not Configured',
      message: 'Vercel Blob Storage är inte konfigurerat (BLOB_READ_WRITE_TOKEN saknas).',
    })
  }

  let body: HandleUploadBody
  try {
    body = (await readBody(event)) as HandleUploadBody
  } catch (parseError: unknown) {
    const msg = parseError instanceof Error ? parseError.message : 'Kunde inte läsa request body'
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: `Ogiltigt anrop: ${msg}`,
    })
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request: event.node.req,
      token,
      onBeforeGenerateToken: async (_pathname) => {
        // Dubbelkolla admin-auktorisering
        await requireAdminAuth(event)

        return {
          maximumSizeInBytes: 50 * 1024 * 1024, // 50 MB
          addRandomSuffix: true,
        }
      },
    })

    return jsonResponse
  } catch (error: unknown) {
    console.error('[Blob Upload Error]:', error)
    const errObj = error as { statusCode?: number; statusMessage?: string; message?: string }
    throw createError({
      statusCode: errObj?.statusCode || 400,
      statusMessage: errObj?.statusMessage || 'Upload Error',
      message: errObj?.message || 'Kunde inte initiera Vercel Blob-uppladdning.',
    })
  }
})

import { requireAdminAuth } from '../../../utils/auth'
import { syncYouTubeVideos } from '../../../utils/youtubeSync'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  try {
    const result = await syncYouTubeVideos({ force: true })
    return {
      ...result,
      syncedCount: result.addedCount,
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'YouTube Sync Error',
      message: err?.message || 'Ett fel uppstod vid synkning från YouTube',
    })
  }
})

import { syncMerchFromSpreadshop } from '../../utils/merchSync'

export default defineEventHandler(async (event) => {
  // Check authorization for Vercel Cron if CRON_SECRET is configured
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Return 401 if CRON_SECRET is provided but invalid
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Unauthorized cron trigger',
    })
  }

  const merchResult = await syncMerchFromSpreadshop()
  let youtubeResult = null
  try {
    youtubeResult = await syncYouTubeVideos()
  } catch (err: any) {
    console.error('[Cron sync-merch] YouTube sync failed:', err?.message || err)
  }

  return {
    job: 'sync-merch',
    timestamp: new Date().toISOString(),
    merch: merchResult,
    youtube: youtubeResult,
  }
})

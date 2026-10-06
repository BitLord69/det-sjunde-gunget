import { syncMerchFromSpreadshop } from '../../utils/merchSync'
import { syncYouTubeVideos } from '../../utils/youtubeSync'

export default defineEventHandler(async (event) => {
  // Kontrollera auktorisering för Vercel Cron om CRON_SECRET är satt
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Unauthorized cron trigger',
    })
  }

  // 1. Synka Merch från Spreadshop
  let merchResult: any = null
  let merchError: string | null = null
  try {
    merchResult = await syncMerchFromSpreadshop()
  } catch (err: any) {
    merchError = err?.message || String(err)
    console.error('[Daily Cron] Fel vid merch-synk:', merchError)
  }

  // 2. Synka YouTube-kanalen
  let youtubeResult: any = null
  let youtubeError: string | null = null
  try {
    youtubeResult = await syncYouTubeVideos()
  } catch (err: any) {
    youtubeError = err?.message || String(err)
    console.error('[Daily Cron] Fel vid YouTube-synk:', youtubeError)
  }

  return {
    job: 'daily-sync',
    timestamp: new Date().toISOString(),
    merch: merchResult || { error: merchError },
    youtube: youtubeResult || { error: youtubeError },
  }
})

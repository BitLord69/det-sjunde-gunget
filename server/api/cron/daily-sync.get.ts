import { sendDiscordAnalyticsReport } from '../../utils/discord'
import { syncMerchFromSpreadshop } from '../../utils/merchSync'
import { syncYouTubeVideos } from '../../utils/youtubeSync'

export default defineEventHandler(async (event) => {
  // Kontrollera auktorisering för Vercel Cron (kräv CRON_SECRET i produktion eller när CRON_SECRET är satt)
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  const isProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'

  if ((isProd && !cronSecret) || (cronSecret && authHeader !== `Bearer ${cronSecret}`)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Unauthorized cron trigger',
    })
  }

  // 1. Synka Merch från Spreadshop
  let merchResult: unknown = null
  let merchError: string | null = null
  try {
    merchResult = await syncMerchFromSpreadshop()
  } catch (err: unknown) {
    merchError = err instanceof Error ? err.message : String(err)
    console.error('[Daily Cron] Fel vid merch-synk:', merchError)
  }

  // 2. Synka YouTube-kanalen
  let youtubeResult: unknown = null
  let youtubeError: string | null = null
  try {
    youtubeResult = await syncYouTubeVideos()
  } catch (err: unknown) {
    youtubeError = err instanceof Error ? err.message : String(err)
    console.error('[Daily Cron] Fel vid YouTube-synk:', youtubeError)
  }

  // 3. Publicera daglig statistikrapport till Discord (om aktiverat)
  let discordStatsResult: unknown = null
  let discordStatsError: string | null = null
  try {
    discordStatsResult = await sendDiscordAnalyticsReport({ forceSend: false })
  } catch (err: unknown) {
    discordStatsError = err instanceof Error ? err.message : String(err)
    console.error('[Daily Cron] Fel vid Discord-statistikrapport:', discordStatsError)
  }

  return {
    job: 'daily-sync',
    timestamp: new Date().toISOString(),
    merch: merchResult || { error: merchError },
    youtube: youtubeResult || { error: youtubeError },
    discordStats: discordStatsResult || { error: discordStatsError },
  }
})

import { syncMerchFromSpreadshop } from '../../utils/merchSync'

export default defineEventHandler(async (event) => {
  // Check authorization for Vercel Cron if CRON_SECRET is configured
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Return 401 if CRON_SECRET is provided but invalid
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized cron trigger',
    })
  }

  const result = await syncMerchFromSpreadshop()

  return {
    job: 'sync-merch',
    timestamp: new Date().toISOString(),
    ...result,
  }
})

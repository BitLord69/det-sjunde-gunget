import { requireAdminAuth } from '../../utils/auth'
import { sendDiscordAnalyticsReport } from '../../utils/discord'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event).catch(() => ({}))

  const webhookUrl = typeof body?.webhookUrl === 'string' ? body.webhookUrl.trim() : undefined
  const range = typeof body?.range === 'string' ? body.range.trim() : undefined

  const result = await sendDiscordAnalyticsReport({
    webhookUrl,
    range,
    forceSend: true,
  })

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: result.error || 'Kunde inte skicka statistikrapporten till Discord',
    })
  }

  return {
    success: true,
    range: result.range,
    message: '✓ Statistikrapport med grafer har publicerats i Discord!',
  }
})

import { requireAdminAuth } from '../../../utils/auth'
import { resolveGeminiApiKey } from '../../../utils/aiImageStudio'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  const apiKey = await resolveGeminiApiKey()

  if (apiKey && apiKey.length > 10) {
    return {
      engine: 'gemini',
      available: true,
      message: 'Google Gemini AI är aktiv och redo',
    }
  }

  return {
    engine: 'fallback',
    available: false,
    message: 'Ingen Gemini API-nyckel konfigurerad – använder lokal bandgrafik',
  }
})

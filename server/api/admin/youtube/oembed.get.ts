import { requireAdminAuth } from '../../../utils/auth'
import { fetchOEmbed } from '../../../utils/youtubeSync'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const query = getQuery(event)
  const url = query.url as string

  if (!url) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Parameter "url" saknas',
    })
  }

  try {
    const data = await fetchOEmbed(url)
    return {
      success: true,
      data,
    }
  } catch (err: any) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Lookup Failed',
      message: err?.message || 'Kunde inte hämta videoinformation från YouTube',
    })
  }
})

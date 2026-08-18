import { formatSocialPost, type SocialPostParams } from '../../utils/social'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = (await readBody(event)) as SocialPostParams

  if (!body.type) {
    throw createError({ statusCode: 400, message: 'Type is required' })
  }

  const formatted = formatSocialPost(body)
  return {
    success: true,
    ...formatted,
  }
})

import { getAdminSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  // Session metadata is never an offline credential or a cacheable response.
  setResponseHeader(event, 'Cache-Control', 'no-store, private')
  const session = await getAdminSession(event)
  return {
    authenticated: !!session,
    user: session?.user ?? null,
    sessionExpiresAt: session?.expiresAt.toISOString() ?? null,
  }
})

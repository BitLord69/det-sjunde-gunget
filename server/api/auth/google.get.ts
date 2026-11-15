import { beginSocialAuth } from '../../utils/social-auth'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const action = query.action === 'connect' ? 'connect' : 'login'
  const clientId = process.env.GOOGLE_CLIENT_ID || ''

  const host = getRequestHeader(event, 'host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const redirectUri = `${protocol}://${host}/api/auth/callback/google`

  const state = await beginSocialAuth(event, 'google', action, query.offlineChallenge)
  if (!state) return sendRedirect(event, '/admin/login?error=social_session_expired')

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  googleAuthUrl.searchParams.set('client_id', clientId)
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri)
  googleAuthUrl.searchParams.set('response_type', 'code')
  googleAuthUrl.searchParams.set('scope', 'openid email profile')
  googleAuthUrl.searchParams.set('access_type', 'online')
  googleAuthUrl.searchParams.set('prompt', 'select_account')
  googleAuthUrl.searchParams.set('state', state)

  return sendRedirect(event, googleAuthUrl.toString())
})

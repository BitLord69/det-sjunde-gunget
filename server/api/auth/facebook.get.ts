import { beginSocialAuth } from '../../utils/social-auth'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const action = query.action === 'connect' ? 'connect' : 'login'
  const clientId = process.env.FACEBOOK_CLIENT_ID || process.env.FACEBOOK_APP_ID || ''

  const host = getRequestHeader(event, 'host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const redirectUri = `${protocol}://${host}/api/auth/callback/facebook`

  const state = await beginSocialAuth(event, 'facebook', action, query.offlineChallenge)
  if (!state) return sendRedirect(event, '/admin/login?error=social_session_expired')

  const facebookAuthUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  facebookAuthUrl.searchParams.set('client_id', clientId)
  facebookAuthUrl.searchParams.set('redirect_uri', redirectUri)
  facebookAuthUrl.searchParams.set('scope', 'email,public_profile')
  facebookAuthUrl.searchParams.set('state', state)

  return sendRedirect(event, facebookAuthUrl.toString())
})

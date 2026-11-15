import { beginSocialAuth } from '../../utils/social-auth'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const action = query.action === 'connect' ? 'connect' : 'login'
  const clientId = process.env.GITHUB_CLIENT_ID || ''
  const host = getRequestHeader(event, 'host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const redirectUri = `${protocol}://${host}/api/auth/callback/github`

  const state = await beginSocialAuth(event, 'github', action, query.offlineChallenge)
  if (!state) return sendRedirect(event, '/admin/login?error=social_session_expired')

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize')
  githubAuthUrl.searchParams.set('client_id', clientId)
  githubAuthUrl.searchParams.set('redirect_uri', redirectUri)
  githubAuthUrl.searchParams.set('scope', 'read:user user:email')
  githubAuthUrl.searchParams.set('state', state)

  return sendRedirect(event, githubAuthUrl.toString())
})

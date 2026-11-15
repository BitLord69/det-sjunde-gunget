import { completeSocialAuth, consumeSocialState } from '../../../utils/social-auth'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  let connecting = false
  try {
    const state = await consumeSocialState(event, 'google', query.state)
    if (!state) return sendRedirect(event, '/admin/login?error=social_invalid_state')
    connecting = state.action === 'connect'
    if (typeof query.code !== 'string' || !query.code) return sendRedirect(event, state.action === 'connect' ? '/admin/profile?error=social_auth_failed' : '/admin/login?error=google_auth_failed')

    const host = getRequestHeader(event, 'host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const token = await $fetch<{ access_token: string }>('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({ code: query.code, client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '', redirect_uri: `${protocol}://${host}/api/auth/callback/google`, grant_type: 'authorization_code' }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    const user = await $fetch<{ sub?: string; name?: string; email?: string; picture?: string }>('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })
    if (typeof user.sub !== 'string' || !user.sub.trim()) throw new Error('Missing Google subject')
    return await completeSocialAuth(event, 'google', state, { providerAccountId: user.sub, email: user.email?.toLowerCase().trim() || null, name: user.name || null, avatarUrl: user.picture || null })
  } catch {
    console.error('Google OAuth callback failed')
    return sendRedirect(event, connecting ? '/admin/profile?error=social_auth_failed' : '/admin/login?error=google_auth_failed')
  }
})

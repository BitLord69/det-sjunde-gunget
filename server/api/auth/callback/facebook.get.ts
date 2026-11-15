import { completeSocialAuth, consumeSocialState } from '../../../utils/social-auth'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  let connecting = false
  try {
    const state = await consumeSocialState(event, 'facebook', query.state)
    if (!state) return sendRedirect(event, '/admin/login?error=social_invalid_state')
    connecting = state.action === 'connect'
    if (typeof query.code !== 'string' || !query.code) return sendRedirect(event, state.action === 'connect' ? '/admin/profile?error=social_auth_failed' : '/admin/login?error=facebook_auth_failed')

    const host = getRequestHeader(event, 'host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const token = await $fetch<{ access_token: string }>('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: { client_id: process.env.FACEBOOK_CLIENT_ID || process.env.FACEBOOK_APP_ID || '', client_secret: process.env.FACEBOOK_CLIENT_SECRET || process.env.FACEBOOK_APP_SECRET || '', redirect_uri: `${protocol}://${host}/api/auth/callback/facebook`, code: query.code },
    })
    const user = await $fetch<{ id?: string; name?: string; email?: string; picture?: { data?: { url?: string } } }>('https://graph.facebook.com/me', {
      params: { fields: 'id,name,email,picture.type(large)', access_token: token.access_token },
    })
    if (typeof user.id !== 'string' || !user.id.trim()) throw new Error('Missing Facebook ID')
    return await completeSocialAuth(event, 'facebook', state, { providerAccountId: user.id, email: user.email?.toLowerCase().trim() || null, name: user.name || null, avatarUrl: user.picture?.data?.url || null })
  } catch {
    console.error('Facebook OAuth callback failed')
    return sendRedirect(event, connecting ? '/admin/profile?error=social_auth_failed' : '/admin/login?error=facebook_auth_failed')
  }
})

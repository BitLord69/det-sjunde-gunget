import { completeSocialAuth, consumeSocialState } from '../../../utils/social-auth'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  let connecting = false
  try {
    const state = await consumeSocialState(event, 'github', query.state)
    if (!state) return sendRedirect(event, '/admin/login?error=social_invalid_state')
    connecting = state.action === 'connect'
    if (typeof query.code !== 'string' || !query.code) return sendRedirect(event, state.action === 'connect' ? '/admin/profile?error=social_auth_failed' : '/admin/login?error=github_auth_failed')

    const token = await $fetch<{ access_token: string }>('https://github.com/login/oauth/access_token', {
      method: 'POST',
      body: { client_id: process.env.GITHUB_CLIENT_ID || '', client_secret: process.env.GITHUB_CLIENT_SECRET || '', code: query.code },
      headers: { Accept: 'application/json' },
    })
    const user = await $fetch<{ id?: number; name?: string; login?: string; email?: string; avatar_url?: string }>('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token.access_token}`, 'User-Agent': 'Det-Sjunde-Gunget-App' },
    })
    if (!Number.isSafeInteger(user.id) || !user.id || user.id < 1) throw new Error('Missing GitHub ID')
    return await completeSocialAuth(event, 'github', state, { providerAccountId: String(user.id), email: user.email?.toLowerCase().trim() || null, username: user.login || null, name: user.name || user.login || null, avatarUrl: user.avatar_url || null })
  } catch {
    console.error('GitHub OAuth callback failed')
    return sendRedirect(event, connecting ? '/admin/profile?error=social_auth_failed' : '/admin/login?error=github_auth_failed')
  }
})

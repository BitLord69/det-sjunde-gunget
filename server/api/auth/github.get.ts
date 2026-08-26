export default defineEventHandler((event) => {
  const query = getQuery(event)
  const action = query.action === 'connect' ? 'connect' : 'login'
  const clientId = process.env.GITHUB_CLIENT_ID || ''
  const host = getRequestHeader(event, 'host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const redirectUri = `${protocol}://${host}/api/auth/callback/github`

  const state = JSON.stringify({ action })

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize')
  githubAuthUrl.searchParams.set('client_id', clientId)
  githubAuthUrl.searchParams.set('redirect_uri', redirectUri)
  githubAuthUrl.searchParams.set('scope', 'read:user user:email')
  githubAuthUrl.searchParams.set('state', encodeURIComponent(state))

  return sendRedirect(event, githubAuthUrl.toString())
})

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const action = query.action === 'connect' ? 'connect' : 'login'
  const clientId = process.env.FACEBOOK_CLIENT_ID || process.env.FACEBOOK_APP_ID || ''

  const host = getRequestHeader(event, 'host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const redirectUri = `${protocol}://${host}/api/auth/callback/facebook`

  const state = JSON.stringify({ action })

  const facebookAuthUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  facebookAuthUrl.searchParams.set('client_id', clientId)
  facebookAuthUrl.searchParams.set('redirect_uri', redirectUri)
  facebookAuthUrl.searchParams.set('scope', 'email,public_profile')
  facebookAuthUrl.searchParams.set('state', encodeURIComponent(state))

  return sendRedirect(event, facebookAuthUrl.toString())
})

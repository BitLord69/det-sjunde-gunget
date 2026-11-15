import assert from 'node:assert/strict'
import crypto from 'node:crypto'

// Never use the configured production database for these tests.
process.env.TURSO_DATABASE_URL = 'file::memory:'
delete process.env.TURSO_AUTH_TOKEN
process.env.NODE_ENV = 'production'

globalThis.getCookie = (event, name) => event.cookies[name]
globalThis.setCookie = (event, name, value, options) => { event.cookies[name] = value; event.options[name] = options }
globalThis.deleteCookie = (event, name) => { delete event.cookies[name] }
globalThis.getRequestHeader = () => 'localhost:3000'
globalThis.sendRedirect = (event, location) => { event.location = location; return location }
globalThis.defineEventHandler = handler => handler
globalThis.getQuery = event => event.query || {}
globalThis.readBody = async event => event.body
globalThis.enforceRateLimit = () => {}
globalThis.createError = data => Object.assign(new Error(data.message), data)

const event = (cookies = {}) => ({ cookies: { ...cookies }, options: {} })
const { tursoClient, db } = await import('../server/db/client.ts')
const { createAdminSession, generateSalt, hashPassword, getAdminSession } = await import('../server/utils/auth.ts')
const { beginSocialAuth, consumeSocialState, completeSocialAuth, consumeOfflineLoginProof } = await import('../server/utils/social-auth.ts')

try {
  await tursoClient.executeMultiple(`
    CREATE TABLE admins (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, username TEXT NOT NULL UNIQUE, role TEXT NOT NULL, password_hash TEXT, salt TEXT, provider TEXT NOT NULL DEFAULT 'credentials', avatar_url TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE admin_sessions (id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
    INSERT INTO admins (id, name, email, username, role, provider, created_at, updated_at) VALUES ('a', 'A', 'a@example.com', 'a', 'admin', 'google', 1, 1), ('b', 'B', 'b@example.com', 'b', 'admin', 'credentials', 1, 1);
  `)
  const a = event()
  const b = event()
  await createAdminSession('a', a)
  await createAdminSession('b', b)
  const salt = generateSalt()
  await tursoClient.execute({ sql: 'UPDATE admins SET password_hash = ?, salt = ? WHERE id = ?', args: [hashPassword('test-password', salt), salt, 'b'] })
  const passwordLogin = (await import('../server/api/auth/login.post.ts')).default
  const passwordEvent = event()
  passwordEvent.body = { identifier: 'b', password: 'test-password' }
  assert.equal((await passwordLogin(passwordEvent)).user.id, 'b')
  assert.ok(passwordEvent.cookies.gunget_session)
  console.log('PASS lösenordsinloggning för befintligt konto')

  const logoutHandler = (await import('../server/api/auth/logout.post.ts')).default
  const logoutEvent = event(passwordEvent.cookies)
  const stolenCookie = { ...logoutEvent.cookies }
  const originalDelete = db.delete
  try {
    db.delete = () => ({ where: async () => { throw new Error('simulated database failure') } })
    await assert.rejects(logoutHandler(logoutEvent), error => error.statusCode === 503)
    assert.equal(logoutEvent.cookies.gunget_session, stolenCookie.gunget_session)
    assert.ok(await getAdminSession(event(stolenCookie)))
  } finally { db.delete = originalDelete }
  assert.equal((await logoutHandler(logoutEvent)).revoked, true)
  assert.equal(logoutEvent.cookies.gunget_session, undefined)
  assert.equal(await getAdminSession(event(stolenCookie)), null)
  assert.equal((await logoutHandler(event())).revoked, false)
  console.log('PASS serverutloggning: databasfel behåller cookie, återförsök återkallar även stulen kopia')

  for (const provider of ['google', 'github', 'facebook']) {
    const anonymous = event()
    assert.equal(await beginSocialAuth(anonymous, provider, 'connect'), null)
    const state = await beginSocialAuth(anonymous, provider, 'login')
    assert.match(state, /^[a-f0-9]{64}$/)
    assert.deepEqual({ httpOnly: anonymous.options[`gunget_oauth_${provider}`].httpOnly, secure: anonymous.options[`gunget_oauth_${provider}`].secure, sameSite: anonymous.options[`gunget_oauth_${provider}`].sameSite }, { httpOnly: true, secure: true, sameSite: 'lax' })
    const savedCookies = { ...anonymous.cookies }
    assert.equal(await consumeSocialState(event(savedCookies), provider, 'f'.repeat(64)), null)
    assert.equal(await consumeSocialState(event(), provider, state), null)
    const validated = await consumeSocialState(anonymous, provider, state)
    assert.equal(validated.action, 'login')
    assert.equal(await consumeSocialState(event(savedCookies), provider, state), null)
    assert.equal(await completeSocialAuth(event(), provider, validated, { providerAccountId: 'unknown', email: 'a@example.com', username: 'a' }), '/admin/login?error=social_not_linked')
    console.log(`PASS ${provider}: cookie, CSRF, engångsvärde och ingen matchning via e-post/användarnamn`)
  }

  const cross = event()
  const crossState = await beginSocialAuth(cross, 'google', 'login')
  cross.cookies.gunget_oauth_github = crossState
  assert.equal(await consumeSocialState(cross, 'github', crossState), null)
  const expired = event()
  const expiredState = await beginSocialAuth(expired, 'facebook', 'login')
  await tursoClient.execute('UPDATE admin_oauth_states SET expires_at = 0')
  assert.equal(await consumeSocialState(expired, 'facebook', expiredState), null)
  const replay = event()
  const replayNonce = await beginSocialAuth(replay, 'github', 'login')
  const replayResults = await Promise.all([
    consumeSocialState(event(replay.cookies), 'github', replayNonce),
    consumeSocialState(event(replay.cookies), 'github', replayNonce),
  ])
  assert.equal(replayResults.filter(Boolean).length, 1)

  const connect = event(a.cookies)
  const connectNonce = await beginSocialAuth(connect, 'google', 'connect')
  const changedSession = event({ ...connect.cookies, gunget_session: b.cookies.gunget_session })
  assert.equal(await consumeSocialState(changedSession, 'google', connectNonce), null)
  assert.equal(await consumeSocialState(event(connect.cookies), 'google', connectNonce), null)
  const noSession = event(a.cookies)
  const noSessionNonce = await beginSocialAuth(noSession, 'google', 'connect')
  delete noSession.cookies.gunget_session
  assert.equal(await consumeSocialState(noSession, 'google', noSessionNonce), null)
  const changedAfterValidation = event(a.cookies)
  const nonceBeforeChange = await beginSocialAuth(changedAfterValidation, 'google', 'connect')
  const stateBeforeChange = await consumeSocialState(changedAfterValidation, 'google', nonceBeforeChange)
  changedAfterValidation.cookies.gunget_session = b.cookies.gunget_session
  assert.equal(await completeSocialAuth(changedAfterValidation, 'google', stateBeforeChange, { providerAccountId: 'stolen' }), '/admin/login?error=social_session_expired')

  async function connectAccount(adminEvent, identity) {
    const e = event(adminEvent.cookies)
    const nonce = await beginSocialAuth(e, 'google', 'connect')
    const state = await consumeSocialState(e, 'google', nonce)
    return completeSocialAuth(e, 'google', state, identity)
  }
  assert.equal(await connectAccount(a, { providerAccountId: 'google-123', email: 'a@example.com' }), '/admin/profile?connected=google')
  assert.equal(await connectAccount(b, { providerAccountId: 'google-123' }), '/admin/profile?error=social_conflict')
  assert.equal(await connectAccount(a, { providerAccountId: 'another' }), '/admin/profile?error=social_already_connected')
  const login = event()
  const nonce = await beginSocialAuth(login, 'google', 'login')
  const loginState = await consumeSocialState(login, 'google', nonce)
  assert.equal(await completeSocialAuth(login, 'google', loginState, { providerAccountId: 'google-123', email: 'changed@example.com' }), '/admin')
  assert.ok(login.cookies.gunget_session)

  const proofNonce = crypto.randomBytes(32).toString('hex')
  const challenge = crypto.createHash('sha256').update(proofNonce).digest('hex')
  const proofLogin = event()
  const proofState = await beginSocialAuth(proofLogin, 'google', 'login', challenge)
  const proofValidated = await consumeSocialState(proofLogin, 'google', proofState)
  assert.equal(await completeSocialAuth(proofLogin, 'google', proofValidated, { providerAccountId: 'google-123' }), '/admin?offlineLogin=1')
  assert.equal(await consumeOfflineLoginProof(event(b.cookies), proofNonce), false)
  assert.equal(await consumeOfflineLoginProof(proofLogin, 'f'.repeat(64)), false)
  const proofResults = await Promise.all([consumeOfflineLoginProof(event(proofLogin.cookies), proofNonce), consumeOfflineLoginProof(event(proofLogin.cookies), proofNonce)])
  assert.equal(proofResults.filter(Boolean).length, 1)
  assert.equal(await consumeOfflineLoginProof(proofLogin, proofNonce), false)
  const revokedNonce = crypto.randomBytes(32).toString('hex')
  const revokedLogin = event()
  const revokedState = await beginSocialAuth(revokedLogin, 'google', 'login', crypto.createHash('sha256').update(revokedNonce).digest('hex'))
  const revokedValidated = await consumeSocialState(revokedLogin, 'google', revokedState)
  await completeSocialAuth(revokedLogin, 'google', revokedValidated, { providerAccountId: 'google-123' })
  await tursoClient.execute({ sql: 'DELETE FROM admin_sessions WHERE token = ?', args: [revokedLogin.cookies.gunget_session] })
  assert.equal(await consumeOfflineLoginProof(revokedLogin, revokedNonce), false)
  console.log('PASS engångsbevis binds till social inloggning och giltig session; replay och sessionsbyte nekas')

  let fetchCalls = 0
  globalThis.$fetch = async (url) => {
    fetchCalls++
    if (url.includes('access_token') || url.includes('oauth2.googleapis.com/token')) return { access_token: 'test-token' }
    if (url.includes('googleapis.com/oauth2')) return { sub: 'google-123', email: 'changed@example.com' }
    if (url.includes('api.github.com/user')) return { id: 123, login: 'user', email: 'a@example.com' }
    if (url.includes('graph.facebook.com/me')) return { id: '456', email: 'a@example.com' }
    throw new Error('Unexpected mocked URL')
  }
  for (const provider of ['google', 'github', 'facebook']) {
    const handler = (await import(`../server/api/auth/callback/${provider}.get.ts`)).default
    const invalid = event()
    invalid.query = { state: 'bad', code: 'code' }
    const previousCalls = fetchCalls
    assert.equal(await handler(invalid), '/admin/login?error=social_invalid_state')
    assert.equal(fetchCalls, previousCalls)
    const attempt = event()
    const attemptNonce = await beginSocialAuth(attempt, provider, 'login')
    attempt.query = { state: attemptNonce, code: 'code' }
    assert.equal(await handler(attempt), provider === 'google' ? '/admin' : '/admin/login?error=social_not_linked')
    if (provider !== 'google') {
      const link = event(a.cookies)
      const linkNonce = await beginSocialAuth(link, provider, 'connect')
      link.query = { state: linkNonce, code: 'code' }
      assert.equal(await handler(link), `/admin/profile?connected=${provider}`)
      const linkedLogin = event()
      const linkedNonce = await beginSocialAuth(linkedLogin, provider, 'login')
      linkedLogin.query = { state: linkedNonce, code: 'code' }
      assert.equal(await handler(linkedLogin), '/admin')
    }
    const callbackNonce = crypto.randomBytes(32).toString('hex')
    const callbackEvent = event()
    const callbackState = await beginSocialAuth(callbackEvent, provider, 'login', crypto.createHash('sha256').update(callbackNonce).digest('hex'))
    callbackEvent.query = { state: callbackState, code: 'code' }
    assert.equal(await handler(callbackEvent), '/admin?offlineLogin=1')
    assert.equal(await consumeOfflineLoginProof(callbackEvent, callbackNonce), true)
    assert.equal(await consumeOfflineLoginProof(callbackEvent, callbackNonce), false)
    console.log(`PASS ${provider}: callback avvisar ogiltig state och använder enbart kopplad identitet`)
  }
  const count = await tursoClient.execute('SELECT COUNT(*) AS count FROM admins')
  assert.equal(Number(count.rows[0].count), 2)
  await assert.rejects(tursoClient.execute({ sql: 'INSERT INTO admin_accounts (id, admin_id, provider, provider_account_id) VALUES (?, ?, ?, ?)', args: ['duplicate', 'b', 'google', 'google-123'] }))
  await tursoClient.execute('DROP INDEX admin_accounts_provider_identity_unique')
  await tursoClient.execute({ sql: 'INSERT INTO admin_accounts (id, admin_id, provider, provider_account_id) VALUES (?, ?, ?, ?)', args: ['duplicate', 'b', 'google', 'google-123'] })
  assert.equal(await completeSocialAuth(event(), 'google', loginState, { providerAccountId: 'google-123' }), '/admin/login?error=social_not_linked')
  await assert.rejects(connectAccount(b, { providerAccountId: 'different' }))
  const preserved = await tursoClient.execute({ sql: 'SELECT COUNT(*) AS count FROM admin_accounts WHERE provider = ? AND provider_account_id = ?', args: ['google', 'google-123'] })
  assert.equal(Number(preserved.rows[0].count), 2)
  console.log('PASS providerbindning, utgången state, sessionsbyte, konflikt, legacy-koppling och ingen ny admin')
} finally {
  tursoClient.close()
}
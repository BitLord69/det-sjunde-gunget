import assert from 'node:assert/strict'

// Always use a new in-memory database, regardless of the developer's environment.
process.env.TURSO_DATABASE_URL = 'file::memory:'
delete process.env.TURSO_AUTH_TOKEN
globalThis.getCookie = (event, name) => event.cookies[name]
globalThis.setCookie = (event, name, value) => { event.cookies[name] = value }
globalThis.deleteCookie = (event, name) => { delete event.cookies[name] }
globalThis.getRequestHeader = () => 'localhost'
globalThis.setResponseHeader = (event, name, value) => { event.headers[name] = value }
globalThis.defineEventHandler = handler => handler

const event = (cookies = {}) => ({ cookies: { ...cookies }, headers: {} })
const { tursoClient } = await import('../server/db/client.ts')
const { createAdminSession, getAdminFromSession } = await import('../server/utils/auth.ts')
const me = (await import('../server/api/auth/me.get.ts')).default

try {
  await tursoClient.executeMultiple(`
    CREATE TABLE admins (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, username TEXT NOT NULL, role TEXT NOT NULL, password_hash TEXT, salt TEXT, provider TEXT NOT NULL, avatar_url TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE admin_sessions (id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
    INSERT INTO admins VALUES ('a', 'Alice', 'a@example.com', 'alice', 'admin', 'secret-hash', 'secret-salt', 'credentials', NULL, 1, 1);
    INSERT INTO admins VALUES ('b', 'Bob', 'b@example.com', 'bob', 'admin', NULL, NULL, 'google', NULL, 1, 1);
  `)

  const anonymous = event()
  assert.deepEqual(await me(anonymous), { authenticated: false, user: null, sessionExpiresAt: null })
  assert.match(anonymous.headers['Cache-Control'], /no-store/)

  const alice = event()
  const bob = event()
  const aliceSession = await createAdminSession('a', alice)
  const bobSession = await createAdminSession('b', bob)
  const aliceResponse = await me(alice)
  const bobResponse = await me(bob)
  assert.equal(aliceResponse.user.id, 'a')
  assert.equal(bobResponse.user.id, 'b')
  assert.equal(aliceResponse.sessionExpiresAt, aliceSession.expiresAt.toISOString())
  assert.equal(bobResponse.sessionExpiresAt, bobSession.expiresAt.toISOString())
  assert.match(alice.headers['Cache-Control'], /no-store/)
  const serialized = JSON.stringify(aliceResponse)
  for (const secret of [aliceSession.token, 'secret-hash', 'secret-salt', 'passwordHash', 'token']) {
    assert.equal(serialized.includes(secret), false)
  }
  assert.equal((await getAdminFromSession(alice)).id, 'a')

  // The actual session deadline, not the age of the login, is returned.
  const shortened = Date.now() + 60_000
  await tursoClient.execute({ sql: 'UPDATE admin_sessions SET expires_at = ? WHERE token = ?', args: [shortened, aliceSession.token] })
  assert.equal((await me(alice)).sessionExpiresAt, new Date(shortened).toISOString())
  await tursoClient.execute({ sql: 'UPDATE admin_sessions SET expires_at = ? WHERE token = ?', args: [Date.now() - 1, aliceSession.token] })
  assert.deepEqual(await me(alice), { authenticated: false, user: null, sessionExpiresAt: null })
  assert.equal(alice.cookies.gunget_session, undefined)
  assert.equal((await me(bob)).authenticated, true)

  await tursoClient.execute({ sql: 'DELETE FROM admin_sessions WHERE token = ?', args: [bobSession.token] })
  assert.deepEqual(await me(bob), { authenticated: false, user: null, sessionExpiresAt: null })
  assert.equal(bob.cookies.gunget_session, undefined)

  const deletedUser = event()
  await createAdminSession('a', deletedUser)
  await tursoClient.execute("DELETE FROM admins WHERE id = 'a'")
  assert.deepEqual(await me(deletedUser), { authenticated: false, user: null, sessionExpiresAt: null })
  assert.equal(deletedUser.cookies.gunget_session, undefined)
  console.log('PASS faktisk sessionsutgång, no-store, hemligheter, kontoseparation, utgång och återkallande')
} finally {
  tursoClient.close()
}
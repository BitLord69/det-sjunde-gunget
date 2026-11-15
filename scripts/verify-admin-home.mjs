import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Set before importing the application; never connect to a configured database.
process.env.TURSO_DATABASE_URL = 'file::memory:'
delete process.env.TURSO_AUTH_TOKEN
globalThis.getCookie = (event, name) => event.cookies[name]
globalThis.setCookie = (event, name, value) => { event.cookies[name] = value }
globalThis.deleteCookie = (event, name) => { delete event.cookies[name] }
globalThis.getRequestHeader = () => 'localhost'
globalThis.setResponseHeader = (event, name, value) => { event.headers[name] = value }
globalThis.defineEventHandler = handler => handler
globalThis.readBody = async event => event.body
globalThis.createError = data => Object.assign(new Error(data.message), data)

const event = (cookies = {}, body) => ({ cookies: { ...cookies }, headers: {}, body })
const { tursoClient } = await import('../server/db/client.ts')
const { createAdminSession, getAdminFromSession } = await import('../server/utils/auth.ts')
const { ADMIN_HOME_OPTIONS, explicitAdminDestination, normalizeAdminHome } = await import('../shared/utils/admin-home.ts')
const getHome = (await import('../server/api/auth/admin-home.get.ts')).default
const putHome = (await import('../server/api/auth/admin-home.put.ts')).default
const updateProfile = (await import('../server/api/auth/profile.put.ts')).default

try {
  await tursoClient.executeMultiple(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE admins (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, username TEXT NOT NULL UNIQUE, role TEXT NOT NULL, password_hash TEXT, salt TEXT, provider TEXT NOT NULL DEFAULT 'credentials', avatar_url TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE admin_sessions (id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
    INSERT INTO admins (id, name, email, username, role, created_at, updated_at) VALUES ('old', 'Old', 'old@example.com', 'old', 'admin', 1, 1), ('other', 'Other', 'other@example.com', 'other', 'admin', 1, 1);
  `)
  const old = event()
  const other = event()
  await createAdminSession('old', old)
  await createAdminSession('other', other)
  await assert.rejects(getHome(event()), error => error.statusCode === 401)
  await assert.rejects(putHome(event({}, { homePath: '/admin/gigs' })), error => error.statusCode === 401)
  assert.deepEqual(await getHome(old), { homePath: '/admin/songs', available: false })
  assert.match(old.headers['Cache-Control'], /no-store/)
  await assert.rejects(putHome(event(old.cookies, { homePath: '/admin/gigs' })), error => error.statusCode === 503)
  assert.equal((await getAdminFromSession(old)).id, 'old')
  const profile = await updateProfile(event(old.cookies, { name: 'Updated', email: 'old@example.com', username: 'old' }))
  assert.equal(profile.user.name, 'Updated')
  console.log('PASS före migrering: autentisering, profil, standard och tydligt sparfel')

  const migration = await readFile(new URL('../server/db/manual-migrations/001-admin-home-preferences.sql', import.meta.url), 'utf8')
  await tursoClient.executeMultiple(migration)
  await tursoClient.executeMultiple(migration)
  assert.deepEqual(await getHome(old), { homePath: '/admin/songs', available: true })
  assert.deepEqual(await getHome(other), { homePath: '/admin/songs', available: true })
  await tursoClient.execute("INSERT INTO admins (id, name, email, username, role, created_at, updated_at) VALUES ('new', 'New', 'new@example.com', 'new', 'admin', 1, 1)")
  const newUser = event()
  await createAdminSession('new', newUser)
  assert.equal((await getHome(newUser)).homePath, '/admin/songs')
  for (const option of ADMIN_HOME_OPTIONS) {
    assert.equal((await putHome(event(old.cookies, { homePath: option.path, adminId: 'other' }))).homePath, option.path)
    assert.equal((await getHome(event(old.cookies))).homePath, option.path)
    assert.equal((await getHome(other)).homePath, '/admin/songs')
  }
  const secondDevice = event()
  await createAdminSession('old', secondDevice)
  assert.equal((await getHome(secondDevice)).homePath, '/admin/help')
  await tursoClient.executeMultiple(migration)
  assert.equal((await getHome(secondDevice)).homePath, '/admin/help')
  for (const value of ['/admin', '/admin/login', '/admin/profile', '/admin/gigs?x=1', '//example.com', '/admin/songs/../login', '__proto__', null, [], {}, 42]) {
    await assert.rejects(putHome(event(old.cookies, { homePath: value })), error => error.statusCode === 400)
  }
  assert.equal((await getHome(secondDevice)).homePath, '/admin/help')
  await tursoClient.execute({ sql: 'UPDATE admin_home_preferences SET home_path = ? WHERE admin_id = ?', args: ['https://evil.example', 'old'] })
  assert.equal((await getHome(old)).homePath, '/admin/songs')
  assert.equal(normalizeAdminHome('/admin/gigs?x=1'), '/admin/songs')
  console.log('PASS efter migrering: nya och gamla konton, alla val, avskiljning och ogiltiga värden')

  assert.equal(explicitAdminDestination({}), null)
  for (const tab of ['songs', 'gigs', 'band', 'setlist', 'gallery', 'merch', 'admins', 'messages', 'subscribers', 'hashtags', 'analytics', 'settings', 'help']) {
    assert.equal(explicitAdminDestination({ tab }), `/admin/${tab}`)
  }
  assert.equal(explicitAdminDestination({ tab: 'gigs', msg: 'a & b' }), '/admin/messages?msg=a%20%26%20b')
  assert.equal(explicitAdminDestination({ tab: 'invalid', messageId: '123' }), '/admin/messages?msg=123')
  for (const query of [{ tab: 'constructor' }, { tab: '' }, { tab: ['gigs', 'songs'] }, { msg: '' }, { msg: ['x', 'y'] }]) {
    assert.equal(explicitAdminDestination(query), '/admin/songs')
  }
  console.log('PASS äldre länkar, prioritet, kodning och ogiltiga parametrar')

  await tursoClient.execute("DELETE FROM admins WHERE id = 'old'")
  assert.equal((await tursoClient.execute("SELECT admin_id FROM admin_home_preferences WHERE admin_id = 'old'")).rows.length, 0)
  console.log('PASS kaskadradering med aktiverade främmande nycklar')
} finally {
  tursoClient.close()
}
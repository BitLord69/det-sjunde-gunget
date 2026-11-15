import assert from 'node:assert/strict'

process.env.TURSO_DATABASE_URL = 'file::memory:'
delete process.env.TURSO_AUTH_TOKEN
process.env.OFFLINE_GALLERY_BLOB_HOST = 'trusted.public.blob.vercel-storage.com'
globalThis.getCookie = (event, name) => event.cookies[name]
globalThis.setCookie = (event, name, value) => { event.cookies[name] = value }
globalThis.deleteCookie = (event, name) => { delete event.cookies[name] }
globalThis.getRequestHeader = () => 'localhost'
globalThis.setResponseHeader = (event, name, value) => { event.headers[name] = value }
globalThis.defineEventHandler = handler => handler
globalThis.createError = data => Object.assign(new Error(data.message), data)

const { tursoClient } = await import('../server/db/client.ts')
const { createAdminSession } = await import('../server/utils/auth.ts')
const { getOfflineAnalyticsSummary, isOfflineAnalyticsRange } = await import('../server/utils/offline-analytics.ts')
const handler = (await import('../server/api/admin/offline-snapshot.get.ts')).default
const analyticsHandler = (await import('../server/api/admin/offline-analytics.get.ts')).default
try {
  await tursoClient.executeMultiple(`
    CREATE TABLE admins (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, username TEXT NOT NULL, role TEXT NOT NULL, password_hash TEXT, salt TEXT, provider TEXT NOT NULL, avatar_url TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE admin_sessions (id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE songs (id TEXT, title TEXT, original_artist TEXT, is_original INTEGER, lyrics TEXT, lyrics_en TEXT, chords TEXT, sort_order INTEGER, embed_url TEXT);
    CREATE TABLE setlist_items (id TEXT, title TEXT, artist TEXT, set_name TEXT, notes TEXT, sort_order INTEGER);
    CREATE TABLE gigs (id TEXT, date INTEGER, venue TEXT, city TEXT, status TEXT, notes_sv TEXT, ticket_url TEXT);
    CREATE TABLE gallery_items (id TEXT, category TEXT, caption_sv TEXT, alt_text_sv TEXT, taken_at INTEGER, created_at INTEGER, media_url TEXT);
    INSERT INTO admins VALUES ('a','Alice','secret@example.test','alice','admin','secret-hash','secret-salt','credentials',NULL,1,1);
    INSERT INTO songs VALUES ('s','Testlåt','Artist',1,'Text',NULL,'C',0,'secret-url');
    INSERT INTO setlist_items VALUES ('l','Testlåt','Artist','Set 1','Notis',0);
    INSERT INTO gigs VALUES ('g',1,'Scen','Stad','upcoming','Notis','secret-ticket');
    INSERT INTO gallery_items VALUES ('p','photo','Bild','Alt',1,1,'secret-media');
    INSERT INTO gallery_items VALUES ('f','fan_central','secret-fan','Alt',1,2,'secret-fan-media');
    INSERT INTO gallery_items VALUES ('local','photo','Local','Alt',1,3,'/media/band/photo.jpg');
    INSERT INTO gallery_items VALUES ('trusted','photo','Trusted','Alt',1,4,'https://trusted.public.blob.vercel-storage.com/media/photo.jpg');
    INSERT INTO gallery_items VALUES ('other','photo','Other','Alt',1,5,'https://evil.public.blob.vercel-storage.com/media/photo.jpg');
    INSERT INTO gallery_items VALUES ('private','photo','Private','Alt',1,6,'http://127.0.0.1/media/photo.jpg');
    INSERT INTO gallery_items VALUES ('traversal','photo','Traversal','Alt',1,7,'/media/../api/auth/me');
  `)
  const anonymous = { cookies: {}, headers: {} }
  await assert.rejects(() => handler(anonymous), error => error.statusCode === 401)
  const event = { cookies: {}, headers: {} }
  const session = await createAdminSession('a', event)
  const result = await handler(event)
  assert.equal(result.userId, 'a')
  assert.equal(result.sessionExpiresAt, session.expiresAt.toISOString())
  assert.match(event.headers['Cache-Control'], /no-store/)
  assert.equal(Object.values(result.datasets).every(item => item.available), true)
  assert.deepEqual(result.datasets.analytics.data, { visitors: 0, pageviews: 0, lyricsViews: 0, jukeboxPlays: 0 })
  const now = Date.now()
  for (const [id, days, type, visitor] of [
    ['recent', 0.1, 'pageview', 'one'], ['two', 2, 'lyrics_view', 'one'],
    ['twenty', 20, 'jukebox_play', 'two'], ['sixty', 60, 'pageview', 'three'],
    ['old', 200, 'pageview', 'four'],
  ]) {
    await tursoClient.execute({ sql: 'INSERT INTO analytics_events (id, event_type, visitor_hash, path, campaign, city, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [id, type, visitor, '/secret-path', 'secret-campaign', 'secret-city', Math.floor(now - days * 86400000)] })
  }
  const expectations = {
    today: { visitors: 1, pageviews: 1, lyricsViews: 0, jukeboxPlays: 0 },
    '7d': { visitors: 1, pageviews: 1, lyricsViews: 1, jukeboxPlays: 0 },
    '30d': { visitors: 2, pageviews: 1, lyricsViews: 1, jukeboxPlays: 1 },
    '90d': { visitors: 3, pageviews: 2, lyricsViews: 1, jukeboxPlays: 1 },
    all: { visitors: 4, pageviews: 3, lyricsViews: 1, jukeboxPlays: 1 },
  }
  for (const [range, expected] of Object.entries(expectations)) {
    assert.equal(isOfflineAnalyticsRange(range), true)
    assert.deepEqual(await getOfflineAnalyticsSummary(range), expected)
  }
  assert.equal(isOfflineAnalyticsRange('365d'), false)
  const statsSnapshot = await handler(event)
  assert.deepEqual(statsSnapshot.datasets.analytics.data, expectations['7d'])
  for (const secret of ['secret-path', 'secret-campaign', 'secret-city', 'visitorHash']) assert.equal(JSON.stringify(statsSnapshot).includes(secret), false)
  for (const [range, expected] of Object.entries(expectations)) {
    event.path = `/api/admin/offline-analytics?range=${range}`
    const response = await analyticsHandler(event)
    assert.deepEqual(response, { userId: 'a', range, summary: expected })
    assert.match(event.headers['Cache-Control'], /no-store/)
  }
  event.path = '/api/admin/offline-analytics?range=bad'
  await assert.rejects(() => analyticsHandler(event), error => error.statusCode === 400)
  event.path = '/api/admin/offline-analytics?range=7d&range=30d'
  await assert.rejects(() => analyticsHandler(event), error => error.statusCode === 400)
  await assert.rejects(() => analyticsHandler({ cookies: {}, headers: {}, path: '/?range=7d' }), error => error.statusCode === 401)
  assert.equal(result.datasets.gallery.data.length, 6)
  const gallery = Object.fromEntries(result.datasets.gallery.data.map(item => [item.id, item.thumbnailSource]))
  assert.equal(gallery.local, '/media/band/photo.jpg')
  assert.equal(gallery.trusted, 'https://trusted.public.blob.vercel-storage.com/media/photo.jpg')
  for (const id of ['other', 'private', 'traversal', 'p']) assert.equal(gallery[id], null)
  assert.equal(result.datasets.songs.data[0].lyrics, 'Text')
  const serialized = JSON.stringify(result)
  for (const secret of [session.token, 'secret-hash', 'secret-salt', 'secret@example.test', 'secret-url', 'secret-ticket', 'secret-media', 'secret-fan']) assert.equal(serialized.includes(secret), false)
  await tursoClient.execute('DROP TABLE setlist_items')
  assert.equal((await handler(event)).datasets.setlist.available, false)
  await tursoClient.execute('DROP TABLE analytics_events')
  event.path = '/?range=7d'
  await assert.rejects(() => analyticsHandler(event))
  await tursoClient.execute('DELETE FROM admin_sessions')
  await assert.rejects(() => handler(event), error => error.statusCode === 401)
  console.log('PASS autentiserad export, filtrering, otillgängligt dataset och återkallad session')
} finally {
  tursoClient.close()
}
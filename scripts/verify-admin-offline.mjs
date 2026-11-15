import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { chromium } from 'playwright'

const origin = process.env.OFFLINE_TEST_ORIGIN || 'http://127.0.0.1:3137'
assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/)
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) })
const context = await browser.newContext()
let denied = false
let proofGate = null
let proofStarted = null
let proofUsed = false
let proofFailure = ''
let imageRequests = 0
let oversizedRequests = 0
let logoutReply = { status: 503, revoked: false }
let initiatedChallenge = null
let corsAttempted = false
const expires = new Date(Date.now() + 3600000).toISOString()
const dataset = data => ({ available: true, data })
const snapshot = {
  userId: 'offline-test', sessionExpiresAt: expires, serverTime: new Date().toISOString(),
  datasets: {
    songs: dataset([{ id: 's', title: 'Testlåt', lyrics: 'Lokal text' }]),
    setlist: dataset([{ id: 's', title: 'Setlåt', setName: 'Set 1' }]),
    gigs: dataset([{ id: 'g', venue: 'Testscen', city: 'Teststad', date: '2026-01-01' }]),
    analytics: dataset({ visitors: 3, pageviews: 4, lyricsViews: 5, jukeboxPlays: 6 }),
    gallery: dataset([{ id: 'p', category: 'photo', caption: 'Testbild', thumbnailSource: '/media/offline-test.png' }, { id: 'missing', category: 'photo', caption: 'Saknad bild', thumbnailSource: '/media/missing-offline-test.png' }, { id: 'redirect', category: 'photo', caption: 'Omdirigerad bild', thumbnailSource: '/media/redirect-offline-test.png' }, { id: 'cors', category: 'photo', caption: 'CORS-bild', thumbnailSource: 'https://trusted.public.blob.vercel-storage.com/media/cors.png' }]),
  },
}
await context.route('**/*', async route => {
  const url = new URL(route.request().url())
  if (url.hostname === 'trusted.public.blob.vercel-storage.com' && url.pathname === '/media/cors.png') {
    corsAttempted = true
    imageRequests++
    return route.abort('blockedbyresponse')
  }
  if (url.origin !== origin) return route.abort()
  if (url.pathname === '/media/offline-test.png') { imageRequests++; return route.fulfill({ path: 'public/favicon.png', contentType: 'image/png' }) }
  if (url.pathname === '/media/missing-offline-test.png') { imageRequests++; return route.fulfill({ status: 404 }) }
  if (url.pathname === '/media/redirect-offline-test.png') { imageRequests++; return route.fulfill({ status: 302, headers: { location: '/media/offline-test.png' } }) }
  if (url.pathname === '/media/oversized.png') { oversizedRequests++; return route.fulfill({ contentType: 'image/png', body: Buffer.alloc(3 * 1024 * 1024) }) }
  if (!url.pathname.startsWith('/api/')) return route.continue()
  if (url.pathname === '/api/auth/google') {
    initiatedChallenge = url.searchParams.get('offlineChallenge')
    return route.fulfill({ status: 302, headers: { location: '/admin?offlineLogin=1' } })
  }
  if (url.pathname === '/api/auth/offline-login-proof') {
    if (proofStarted) proofStarted()
    if (proofGate) await proofGate
    if (proofFailure === 'network') { proofFailure = ''; return route.abort('failed') }
    const nonce = route.request().postDataJSON().nonce
    const verified = !proofUsed && (nonce === 'a'.repeat(64) || (initiatedChallenge && crypto.createHash('sha256').update(nonce).digest('hex') === initiatedChallenge))
    proofUsed = true
    if (proofFailure === 'lost') { proofFailure = ''; return route.abort('failed') }
    return route.fulfill({ json: { verified } })
  }
  if (url.pathname === '/api/auth/logout') return route.fulfill({ status: logoutReply.status, json: { revoked: logoutReply.revoked } })
  if (url.pathname === '/api/auth/me') return route.fulfill({ json: denied ? { authenticated: false, user: null, sessionExpiresAt: null } : { authenticated: true, user: { id: 'offline-test', name: 'Test', email: 'test@example.test', username: 'test', role: 'admin', provider: 'credentials', avatarUrl: null }, sessionExpiresAt: expires } })
  if (url.pathname === '/api/admin/offline-snapshot') return route.fulfill({ json: { ...snapshot, serverTime: new Date().toISOString() } })
  if (url.pathname === '/api/admin/settings') return route.fulfill({ status: 403, json: { message: 'Nekad' } })
  if (url.pathname === '/api/auth/admin-home') return route.fulfill({ json: { homePath: '/admin/songs' } })
  if (url.pathname === '/api/admin/songs/stats') return route.fulfill({ json: { stats: [], lookupById: {}, lookupByTitle: {} } })
  if (url.pathname === '/api/gigs') return route.fulfill({ json: { all: [], upcoming: [], past: [] } })
  return route.fulfill({ json: [] })
})

try {
  let page = await context.newPage()
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message))
  await page.goto(`${origin}/admin/songs`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Offlinekopian är förberedd', { exact: false }).waitFor({ timeout: 60000 })
  await page.getByText('Offline-start: förberedd', { exact: false }).waitFor({ timeout: 20000 })
  await page.waitForFunction(async () => (await (await import('/admin/offline-store.js')).read())?.thumbnailStatus?.saved === 1, null, { timeout: 30000 })
  assert.equal(corsAttempted, true)
  assert.equal(await page.evaluate(async () => JSON.stringify(await (await import('/admin/offline-store.js')).read()).includes('thumbnailSource')), false)
  const imageRequestsBeforeNavigation = imageRequests
  await page.goto(`${origin}/admin/gigs`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Offlinekopian är förberedd', { exact: false }).waitFor({ timeout: 30000 })
  assert.equal(imageRequests, imageRequestsBeforeNavigation)
  assert.equal(await page.evaluate(async () => (await (await import('/admin/offline-store.js')).read()).thumbnailStatus.saved), 1)
  assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration('/admin'))?.scope), `${origin}/admin`)
  assert.equal(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration('/music'))), false)
  const cachedUrls = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async key => (await (await caches.open(key)).keys()).map(request => new URL(request.url).pathname)))).flat())
  assert.equal(cachedUrls.some(path => path.startsWith('/api/') || path.startsWith('/_nuxt/')), false)
  console.log('PASS onlineförberedelse och avgränsat scope')

  await context.setOffline(true)
  await page.getByRole('heading', { name: 'Offline-läsläge' }).waitFor({ timeout: 20000 })
  await page.close()
  page = await context.newPage()
  await page.goto(`${origin}/admin`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Testlåt').waitFor()
  for (const [button, text] of [['Setlist', 'Setlåt'], ['Spelningar', 'Testscen'], ['Statistik', 'Unika besökare'], ['Galleri', 'Testbild'], ['Låtar & texter', 'Testlåt']]) {
    await page.getByRole('button', { name: button, exact: true }).click()
    await page.getByText(text, { exact: false }).first().waitFor()
    if (button === 'Galleri') {
      assert.match(await page.locator('#content').innerText(), /Miniatyrer: 1 av 4 bilder/)
      assert.equal(await page.locator('#content img').evaluate(image => image.complete && image.naturalWidth > 0), true)
      assert.equal(await page.getByText('Miniatyr saknas offline.').count(), 3)
    }
  }
  await page.goto(`${origin}/admin/gigs`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Testscen', { exact: false }).waitFor()
  await page.goto(`${origin}/admin/messages`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Den här adminsidan finns inte offline', { exact: false }).waitFor()
  console.log('PASS offline cold-start, genväg och alla läsvyer; otillåten sida spärrad')

  await context.setOffline(false)
  await page.goto(`${origin}/admin/offline.html`)
  assert.equal(await page.evaluate(async () => {
    try { return (await fetch('/api/admin/songs', { method: 'POST' })).status === 403 } catch { return true }
  }), true)
  const checks = await page.evaluate(async (data) => {
    const store = await import('/admin/offline-store.js')
    const start = await store.epoch()
    const generation = await store.begin(start, 'offline-test')
    await store.clear(true)
    const stale = await store.save(generation, 'offline-test', data, Date.now())
    const blocked = await store.begin(await store.epoch(), 'offline-test')
    const unlocked = await store.unlock(await store.epoch())
    const next = await store.begin(await store.epoch(), 'offline-test')
    await store.save(next, 'offline-test', { ...data, serverTime: new Date().toISOString(), sessionExpiresAt: new Date(Date.now() - 1000).toISOString() }, Date.now())
    const staleImage = await store.saveThumbnails(generation, 'offline-test', [{ id: 'p', blob: new Blob(['x'], { type: 'image/jpeg' }) }])
    return { stale, blocked, unlocked, expired: await store.read(), staleImage }
  }, snapshot)
  assert.deepEqual(checks, { stale: false, blocked: null, unlocked: true, expired: null, staleImage: false })
  const bounded = await page.evaluate(async (data) => {
    const store = await import('/admin/offline-store.js')
    const generation = await store.begin(await store.epoch(), 'offline-test')
    const start = Date.now()
    const serverTime = start + 12 * 3600000
    await store.save(generation, 'offline-test', { ...data, serverTime: new Date(serverTime).toISOString(), sessionExpiresAt: new Date(serverTime + 60000).toISOString() }, start)
    const result = await store.read()
    await store.clear()
    return result.expiresAt - start
  }, snapshot)
  assert.equal(bounded, 60000)
  const imageLimits = await page.evaluate(async (data) => {
    const store = await import('/admin/offline-store.js')
    const generation = await store.begin(await store.epoch(), 'offline-test')
    const gallery = Array.from({ length: 60 }, (_, i) => ({ id: String(i), category: 'photo' }))
    await store.save(generation, 'offline-test', { ...data, datasets: { ...data.datasets, gallery: { available: true, data: gallery } } }, Date.now())
    const blob = new Blob([new Uint8Array(150000)], { type: 'image/jpeg' })
    await store.saveThumbnails(generation, 'offline-test', gallery.map(item => ({ id: item.id, blob })))
    const result = await store.read()
    const thumbnails = result.datasets.gallery.data.filter(item => item.thumbnail)
    const outcome = { count: thumbnails.length, bytes: thumbnails.reduce((sum, item) => sum + item.thumbnail.size, 0), status: result.thumbnailStatus.saved }
    const tiny = new Blob(['x'], { type: 'image/jpeg' })
    await store.saveThumbnails(generation, 'offline-test', gallery.map(item => ({ id: item.id, blob: tiny })))
    outcome.countLimit = (await store.read()).thumbnailStatus.saved
    await store.clear()
    return outcome
  }, snapshot)
  assert.deepEqual(imageLimits, { count: 26, bytes: 3900000, status: 26, countLimit: 40 })
  console.log('PASS logoutrace, spärr och utgång')

  await page.goto(`${origin}/admin/songs`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Offlinekopian är förberedd', { exact: false }).waitFor({ timeout: 30000 })
  const switched = await page.evaluate(async (data) => {
    const store = await import('/admin/offline-store.js')
    const old = await store.begin(await store.epoch(), 'offline-test')
    const next = await store.begin(await store.epoch(), 'other-account')
    return { next: next !== null, previousWrite: await store.save(old, 'offline-test', data, Date.now()), snapshot: await store.read() }
  }, snapshot)
  assert.deepEqual(switched, { next: true, previousWrite: false, snapshot: null })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByText('Offlinekopian är förberedd', { exact: false }).waitFor({ timeout: 30000 })
  const forbidden = await page.evaluate(async () => {
    const response = await fetch('/api/admin/settings')
    return { status: response.status, snapshot: await (await import('/admin/offline-store.js')).read() }
  })
  assert.deepEqual(forbidden, { status: 403, snapshot: null })
  console.log('PASS skrivspärr, kontobyte, 403 och cache-allowlist')
  proofUsed = false
  await page.goto(`${origin}/admin/login`, { waitUntil: 'domcontentloaded' })
  await page.getByTitle('Logga in med Google').click()
  await page.getByText('Offlinekopian är förberedd', { exact: false }).waitFor({ timeout: 30000 })
  assert.match(initiatedChallenge, /^[a-f0-9]{64}$/)
  assert.ok(await page.evaluate(async () => (await (await import('/admin/offline-store.js')).read())))
  console.log('PASS OAuth-knappens utmaning och återaktivering via samma flik')
  await page.evaluate(async () => {
    const store = await import('/admin/offline-store.js')
    await store.clear(true)
    sessionStorage.setItem('admin-offline-login', JSON.stringify({ nonce: 'a'.repeat(64), epoch: await store.epoch() }))
  })
  proofUsed = false
  proofFailure = 'network'
  await page.goto(`${origin}/admin/gigs?offlineLogin=1`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Offlineförberedelsen kunde inte verifieras', { exact: false }).waitFor({ timeout: 30000 })
  assert.ok(await page.evaluate(() => sessionStorage.getItem('admin-offline-login')))
  await page.goto(`${origin}/admin/songs`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Offlinekopian är förberedd', { exact: false }).waitFor({ timeout: 30000 })
  assert.equal(await page.evaluate(() => sessionStorage.getItem('admin-offline-login')), null)
  console.log('PASS tillfälligt nätfel ger synlig varning och säkert återförsök vid navigering')

  await page.evaluate(async () => {
    const store = await import('/admin/offline-store.js')
    await store.clear(true)
    sessionStorage.setItem('admin-offline-login', JSON.stringify({ nonce: 'a'.repeat(64), epoch: await store.epoch() }))
  })
  proofUsed = false
  proofFailure = 'lost'
  await page.goto(`${origin}/admin/gigs?offlineLogin=1`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Offlineförberedelsen kunde inte verifieras', { exact: false }).waitFor({ timeout: 30000 })
  await page.goto(`${origin}/admin/songs`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Offlineförberedelsen kunde inte aktiveras', { exact: false }).waitFor({ timeout: 30000 })
  assert.equal(await page.evaluate(async () => (await import('/admin/offline-store.js')).read()), null)
  console.log('PASS förlorat svar efter förbrukat bevis visar krav på ny inloggning')
  await page.evaluate(async () => {
    const store = await import('/admin/offline-store.js')
    await store.clear(true)
    sessionStorage.setItem('admin-offline-login', JSON.stringify({ nonce: 'a'.repeat(64), epoch: await store.epoch() }))
  })
  proofUsed = false
  await page.goto(`${origin}/admin?offlineLogin=1`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Offlinekopian är förberedd', { exact: false }).waitFor({ timeout: 30000 })
  assert.ok(await page.evaluate(async () => (await (await import('/admin/offline-store.js')).read())))
  console.log('PASS socialt engångsbevis återaktiverar förberedelse efter utloggning')

  await page.evaluate(async () => {
    const store = await import('/admin/offline-store.js')
    await store.clear(true)
    sessionStorage.setItem('admin-offline-login', JSON.stringify({ nonce: 'a'.repeat(64), epoch: await store.epoch() }))
  })
  proofUsed = false
  let releaseProof
  proofGate = new Promise(resolve => { releaseProof = resolve })
  const started = new Promise(resolve => { proofStarted = resolve })
  const navigation = page.goto(`${origin}/admin?offlineLogin=1`, { waitUntil: 'domcontentloaded' })
  await started
  const other = await context.newPage()
  await other.goto(`${origin}/admin/offline.html`)
  await other.evaluate(async () => (await import('/admin/offline-store.js')).clear(true))
  releaseProof()
  await navigation
  await page.waitForURL('**/admin/songs**', { timeout: 30000 })
  assert.equal(await other.evaluate(async () => (await import('/admin/offline-store.js')).read()), null)
  assert.equal(await other.evaluate(async () => { const s = await import('/admin/offline-store.js'); return s.begin(await s.epoch(), 'offline-test') }), null)
  proofGate = null
  proofStarted = null
  await other.close()
  console.log('PASS logout under väntande socialt bevis behåller spärren')
  await page.evaluate(async () => { const s = await import('/admin/offline-store.js'); await s.unlock(await s.epoch()) })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByText('Offlinekopian är förberedd', { exact: false }).waitFor({ timeout: 30000 })
  denied = true
  await page.goto(`${origin}/admin/gigs`, { waitUntil: 'domcontentloaded' })
  await page.waitForURL('**/admin/login**')
  const cleared = await page.evaluate(async () => (await import('/admin/offline-store.js')).read())
  assert.equal(cleared, null)
  console.log('PASS nekad serverauth rensar kopia utan fallback')

  denied = false
  snapshot.datasets.gallery.data = [{ id: 'large', category: 'photo', thumbnailSource: '/media/oversized.png' }]
  await page.goto(`${origin}/admin/songs`, { waitUntil: 'domcontentloaded' })
  await page.getByText('miniatyrer 0 av 1', { exact: false }).waitFor({ timeout: 30000 })
  assert.equal(oversizedRequests, 1)
  await page.goto(`${origin}/admin/gigs`, { waitUntil: 'domcontentloaded' })
  await page.getByText('miniatyrer 0 av 1', { exact: false }).waitFor({ timeout: 30000 })
  assert.equal(oversizedRequests, 1)
  console.log('PASS för stor källbild avvisas och hämtas inte igen vid navigering')
  await page.getByRole('button', { name: 'Logga ut', exact: true }).first().click()
  await page.waitForURL('**/admin/login?**serverLogoutFailed=1**')
  await page.getByText('Serverutloggningen kunde inte bekräftas', { exact: false }).waitFor()
  assert.equal(await page.evaluate(async () => (await import('/admin/offline-store.js')).read()), null)
  logoutReply = { status: 200, revoked: false }
  await page.getByRole('button', { name: 'Försök serverutloggning igen' }).click()
  await page.getByText('Sessionscookien saknas', { exact: false }).waitFor()
  logoutReply = { status: 200, revoked: true }
  await page.getByRole('button', { name: 'Försök serverutloggning igen' }).click()
  await page.getByText('Servern bekräftade utloggningen', { exact: false }).waitFor()
  console.log('PASS serverfel och saknad cookie ger varning, lyckat återförsök bekräftas')
} finally {
  await browser.close()
}
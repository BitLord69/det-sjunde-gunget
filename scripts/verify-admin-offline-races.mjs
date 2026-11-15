import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'

// Serve only test fixtures and checked-in assets; no production services are contacted.
const assets = new Map([
  ['/admin-sw.js', ['public/admin-sw.js', 'text/javascript']],
  ['/admin/offline.html', ['public/admin/offline.html', 'text/html']],
  ['/admin/offline-reader.js', ['public/admin/offline-reader.js', 'text/javascript']],
  ['/admin/offline-store.js', ['public/admin/offline-store.js', 'text/javascript']],
  ['/admin/offline-reader.css', ['public/admin/offline-reader.css', 'text/css']],
])
let pending
let started
let logoutStatus = 503
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  if (path === '/api/test-deny') { pending = res; started?.(); return }
  if (path === '/api/auth/logout') { res.writeHead(logoutStatus, { 'Content-Type': 'application/json' }).end(JSON.stringify({ revoked: logoutStatus === 200 })); return }
  const asset = assets.get(path)
  if (asset) {
    res.writeHead(200, { 'Content-Type': asset[1], 'Service-Worker-Allowed': '/' }).end(await readFile(asset[0]))
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><title>Test</title>')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
let browser
try {
  const origin = `http://127.0.0.1:${server.address().port}`
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) })
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(`${origin}/admin/test`)
  await page.evaluate(async () => { await navigator.serviceWorker.register('/admin-sw.js', { type: 'module', scope: '/admin' }); await navigator.serviceWorker.ready })
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)

  const setup = async owner => page.evaluate(async owner => {
    const s = await import('/admin/offline-store.js')
    const generation = await s.begin(await s.epoch(), owner)
    const now = Date.now()
    await s.save(generation, owner, { userId: owner, serverTime: new Date(now).toISOString(), sessionExpiresAt: new Date(now + 600000).toISOString(), datasets: { gallery: { available: true, data: [{ id: 'one', category: 'photo', thumbnailKey: 'key-1' }, { id: 'two', category: 'photo', thumbnailKey: 'key-2' }] } } }, now)
    return generation
  }, owner)
  const denyAfter = async (action, status = 403) => {
    const received = new Promise(resolve => { started = resolve })
    await page.evaluate(() => { window.denial = fetch('/api/test-deny').then(response => response.status) })
    await received
    await action()
    pending.writeHead(status).end()
    assert.equal(await page.evaluate(() => window.denial), status)
    pending = null
    started = null
  }

  for (const status of [401, 403]) {
    await setup('alice')
    await denyAfter(() => setup('alice'), status)
    assert.equal(await page.evaluate(async () => (await import('/admin/offline-store.js')).read()), null)
  }
  console.log('PASS service worker: nekande svar rensar trots parallell snapshot för samma session')

  for (const owner of ['alice', 'bob']) {
    await setup('alice')
    await denyAfter(async () => {
      assert.equal(await page.evaluate(async () => { const s = await import('/admin/offline-store.js'); await s.clear(true); return s.unlock(await s.epoch()) }), true)
      await setup(owner)
    })
    assert.equal((await page.evaluate(async () => (await import('/admin/offline-store.js')).read())).userId, owner)
    await page.evaluate(async () => (await import('/admin/offline-store.js')).clear())
  }
  console.log('PASS service worker: gammalt nekande svar bevarar ny session för samma och annat konto')

  const galleryChecks = await page.evaluate(async () => {
    const s = await import('/admin/offline-store.js')
    const now = Date.now()
    const snapshot = (key = 'key-1') => ({ userId: 'alice', serverTime: new Date(now).toISOString(), sessionExpiresAt: new Date(now + 600000).toISOString(), datasets: { gallery: { available: true, data: [{ id: 'one', category: 'photo', thumbnailKey: key }, { id: 'two', category: 'photo', thumbnailKey: 'key-2' }] } } })
    let gen = await s.begin(await s.epoch(), 'alice')
    await s.save(gen, 'alice', snapshot(), now)
    const first = await s.reserveThumbnails(gen, 'alice')
    await s.saveThumbnails(gen, 'alice', [{ id: 'one', blob: new Blob(['image'], { type: 'image/jpeg' }) }])
    gen = await s.begin(await s.epoch(), 'alice')
    await s.save(gen, 'alice', snapshot(), now)
    const retained = await s.read()
    const repeated = await s.reserveThumbnails(gen, 'alice')
    gen = await s.begin(await s.epoch(), 'alice')
    await s.save(gen, 'alice', snapshot('changed'), now)
    const changed = await s.read()
    const changedReservation = await s.reserveThumbnails(gen, 'alice')
    await s.begin(await s.epoch(), 'bob')
    return { first, saved: retained.thumbnailStatus.saved, retained: retained.datasets.gallery.data[0].thumbnail?.size, repeated, changedSaved: changed.thumbnailStatus.saved, changedReservation, switched: await s.read() }
  })
  assert.deepEqual(galleryChecks, { first: ['one', 'two'], saved: 1, retained: 5, repeated: [], changedSaved: 0, changedReservation: ['one'], switched: null })
  console.log('PASS miniatyrer: återanvändning, ändrad källa, försöksspärr och kontobyte')

  await setup('alice')
  await page.goto(`${origin}/admin/offline.html`)
  await page.getByText('Endast läsning', { exact: false }).waitFor()
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Logga ut', exact: true }).click()
  await page.getByText('Serverutloggningen kunde inte bekräftas', { exact: false }).waitFor()
  assert.equal(await page.evaluate(async () => (await import('/admin/offline-store.js')).read()), null)
  await context.setOffline(false)
  await page.getByRole('button', { name: 'Försök serverutloggning igen' }).click()
  await page.getByText('Serverutloggningen kunde inte bekräftas', { exact: false }).waitFor()
  logoutStatus = 200
  await page.getByRole('button', { name: 'Försök serverutloggning igen' }).click()
  await page.getByText('Servern bekräftade utloggningen', { exact: false }).waitFor()
  assert.equal(await page.evaluate(async () => { const s = await import('/admin/offline-store.js'); return s.begin(await s.epoch(), 'alice') }), null)
  console.log('PASS offlineutloggning: lokal rensning före nätverksfel, serverfel, återförsök och spärr')
} finally {
  pending?.destroy()
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}

import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'

// Only the checked-in reader assets are served, on an ephemeral loopback port.
const files = new Map([
  ['/admin/offline.html', ['public/admin/offline.html', 'text/html']],
  ['/admin/offline-store.js', ['public/admin/offline-store.js', 'text/javascript']],
  ['/admin/offline-reader.js', ['public/admin/offline-reader.js', 'text/javascript']],
  ['/admin/offline-reader.css', ['public/admin/offline-reader.css', 'text/css']],
])
const server = createServer(async (req, res) => {
  const entry = files.get(new URL(req.url, 'http://127.0.0.1').pathname)
  if (!entry) { res.writeHead(404).end(); return }
  try { res.writeHead(200, { 'Content-Type': entry[1] }).end(await readFile(entry[0])) }
  catch { res.writeHead(500).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
let browser
try {
  const origin = `http://127.0.0.1:${server.address().port}`
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) })
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(`${origin}/admin/offline.html`)
  await page.getByText('Ingen giltig lokal kopia finns', { exact: false }).waitFor()

  const checks = await page.evaluate(async () => {
    const store = await import('/admin/offline-store.js')
    const now = Date.now()
    const source = { userId: 'alice', serverTime: new Date(now).toISOString(), sessionExpiresAt: new Date(now + 600000).toISOString(), datasets: { analytics: { available: true, data: { visitors: 1, pageviews: 2, lyricsViews: 3, jukeboxPlays: 4 } }, songs: { available: true, data: [] } } }
    const generation = await store.begin(await store.epoch(), 'alice')
    const saved = await store.save(generation, 'alice', structuredClone(source), now)
    const reserve = range => store.reserveAnalytics(generation, 'alice', range)
    const write = (range, seq, visitors, extra = {}) => store.saveAnalytics(generation, 'alice', range, seq, { userId: 'alice', range, summary: { visitors, pageviews: 2, lyricsViews: 3, jukeboxPlays: 4, secret: 'must-not-be-saved' }, ...extra }, now)
    const older = await reserve('30d')
    const newer = await reserve('30d')
    const newest = await write('30d', newer, 30)
    const stale = await write('30d', older, 99)
    const ninety = await reserve('90d')
    const invalid = await write('90d', ninety, -1)
    const mismatch = await write('90d', ninety, 9, { userId: 'bob' })
    const valid = await write('90d', ninety, 90)
    const snapshot = await store.read()
    const next = await store.begin(await store.epoch(), 'alice')
    const refresh = await store.save(next, 'alice', structuredClone(source), Date.now())
    const retained = await store.read()
    const expiredDenied = await store.clearIfEpoch(generation)
    return { saved, newest, stale, invalid, mismatch, valid, refresh, expiredDenied, ranges: Object.keys(snapshot.analyticsRanges), value: retained.analyticsRanges['30d'].data.visitors, secret: JSON.stringify(retained).includes('must-not-be-saved') }
  })
  assert.deepEqual(checks, { saved: true, newest: true, stale: false, invalid: false, mismatch: false, valid: true, refresh: true, expiredDenied: false, ranges: ['7d', '30d', '90d'], value: 30, secret: false })
  await page.reload()
  await page.getByRole('button', { name: 'Statistik', exact: true }).click()
  await page.getByText('Unika besökare').waitFor()
  await page.getByRole('button', { name: '30 dagar', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('#content .card p')?.textContent === '30')
  await page.getByRole('button', { name: 'Idag (24h)', exact: true }).click()
  await page.getByText('Ingen giltig kopia för detta intervall', { exact: false }).waitFor()
  await page.getByRole('button', { name: '90 dagar', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('#content .card p')?.textContent === '90')

  const lifecycle = await page.evaluate(async () => {
    const store = await import('/admin/offline-store.js')
    const old = await store.epoch()
    const token = await store.reserveAnalytics(old, 'alice', 'all')
    await store.begin(old, 'bob')
    const oldWrite = await store.saveAnalytics(old, 'alice', 'all', token, { userId: 'alice', range: 'all', summary: { visitors: 1, pageviews: 1, lyricsViews: 1, jukeboxPlays: 1 } }, Date.now())
    const afterSwitch = await store.read()
    const bob = await store.epoch()
    const t = Date.now()
    const copy = { userId: 'bob', serverTime: new Date(t).toISOString(), sessionExpiresAt: new Date(t + 1000).toISOString(), datasets: { analytics: { available: true, data: { visitors: 0, pageviews: 0, lyricsViews: 0, jukeboxPlays: 0 } } } }
    await store.save(bob, 'bob', copy, t)
    const actualNow = Date.now
    Date.now = () => t + 1001
    const expired = await store.read()
    Date.now = actualNow
    return { oldWrite, afterSwitch, expired }
  })
  assert.deepEqual(lifecycle, { oldWrite: false, afterSwitch: null, expired: null })
  const rangeExpiry = await page.evaluate(async () => {
    const store = await import('/admin/offline-store.js')
    const realNow = Date.now
    const t = realNow()
    const summary = { visitors: 1, pageviews: 1, lyricsViews: 1, jukeboxPlays: 1 }
    const copy = (now, ttl) => ({ userId: 'alice', serverTime: new Date(now).toISOString(), sessionExpiresAt: new Date(now + ttl).toISOString(), datasets: { analytics: { available: true, data: summary } } })
    try {
      const first = await store.begin(await store.epoch(), 'alice')
      await store.save(first, 'alice', copy(t, 1000), t)
      const token = await store.reserveAnalytics(first, 'alice', '30d')
      await store.saveAnalytics(first, 'alice', '30d', token, { userId: 'alice', range: '30d', summary }, t)
      Date.now = () => t + 500
      const second = await store.begin(await store.epoch(), 'alice')
      await store.save(second, 'alice', copy(t + 500, 10000), t + 500)
      const before = await store.read()
      Date.now = () => t + 1001
      const after = await store.read()
      return { before: Object.keys(before.analyticsRanges).sort(), after: Object.keys(after.analyticsRanges).sort() }
    } finally { Date.now = realNow; await store.clear() }
  })
  assert.deepEqual(rangeExpiry, { before: ['30d', '7d'], after: ['7d'] })
  await page.reload()
  await page.getByText('Ingen giltig lokal kopia finns', { exact: false }).waitFor()
  console.log('PASS intervall, cachemiss, utgång, kontobyte, atomiska svar och integritetsfilter')
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}

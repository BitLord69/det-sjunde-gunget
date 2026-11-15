import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const origin = process.env.OFFLINE_TEST_ORIGIN || 'http://127.0.0.1:3187'
assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/)
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) })
const context = await browser.newContext()
const exports = []
let failExport = false
const sessionExpiresAt = new Date(Date.now() + 3600000).toISOString()
await context.route('**/*', async route => {
  const url = new URL(route.request().url())
  if (url.origin !== origin) return route.abort()
  if (!url.pathname.startsWith('/api/')) return route.continue()
  if (url.pathname === '/api/auth/me') return route.fulfill({ json: { authenticated: true, user: { id: 'alice', name: 'Test', email: 'test@example.test', username: 'test', role: 'admin', provider: 'credentials', avatarUrl: null }, sessionExpiresAt } })
  if (url.pathname === '/api/admin/offline-snapshot') return route.fulfill({ json: { userId: 'alice', sessionExpiresAt, serverTime: new Date().toISOString(), datasets: { analytics: { available: true, data: { visitors: 7, pageviews: 7, lyricsViews: 7, jukeboxPlays: 7 } }, gallery: { available: true, data: [] } } } })
  if (url.pathname === '/api/admin/analytics') {
    const range = url.searchParams.get('range')
    if (range === 'today') return route.fulfill({ status: 500, json: { message: 'Testfel' } })
    return route.fulfill({ json: { range, summary: { uniqueVisitors: 1 }, dailySeries: [], topPages: [], referrers: [], campaigns: [], locations: { cities: [], countries: [] }, devices: { deviceTypes: [], os: [], browsers: [], locales: [] }, bandTelemetry: { topSongs: [], topGigs: [], topMerch: [], topVideos: [], organizerRadar: [] } } })
  }
  if (url.pathname === '/api/admin/offline-analytics') {
    const range = url.searchParams.get('range')
    exports.push(range)
    if (failExport) return route.fulfill({ status: 500, json: { message: 'Testfel' } })
    const visitors = { '30d': 30, '90d': 90, all: 100 }[range] || 7
    return route.fulfill({ json: { userId: 'alice', range, summary: { visitors, pageviews: 2, lyricsViews: 3, jukeboxPlays: 4, secret: 'do-not-store' } } })
  }
  return route.fulfill({ json: [] })
})
try {
  const page = await context.newPage()
  await page.goto(`${origin}/admin/analytics`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Den sammanfattade statistiken för intervallet är förberedd offline.').waitFor({ timeout: 60000 })
  assert.deepEqual(exports, ['30d'])
  await page.getByRole('button', { name: '90 dagar', exact: true }).click()
  await page.waitForFunction(async () => (await (await import('/admin/offline-store.js')).read())?.analyticsRanges?.['90d']?.data.visitors === 90)
  await page.getByRole('button', { name: 'All tid', exact: true }).click()
  await page.waitForFunction(async () => (await (await import('/admin/offline-store.js')).read())?.analyticsRanges?.all?.data.visitors === 100)
  await page.getByRole('button', { name: 'Idag (24h)', exact: true }).click()
  await page.getByRole('alert').getByText('Statistiken kunde inte hämtas', { exact: false }).waitFor()
  assert.equal(exports.includes('today'), false)
  failExport = true
  await page.getByRole('button', { name: '90 dagar', exact: true }).click()
  await page.getByText('Intervallet kunde inte förberedas offline.', { exact: false }).waitFor()
  const saved = await page.evaluate(async () => (await (await import('/admin/offline-store.js')).read()).analyticsRanges)
  assert.equal(saved['90d'].data.visitors, 90)
  assert.equal(saved['7d'].data.visitors, 7)
  assert.equal(saved.today, undefined)
  assert.equal(JSON.stringify(saved).includes('do-not-store'), false)
  await context.setOffline(true)
  await page.getByRole('heading', { name: 'Offline-läsläge' }).waitFor({ timeout: 20000 })
  await page.getByRole('button', { name: 'Statistik', exact: true }).click()
  await page.getByRole('button', { name: '30 dagar', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('#content .card p')?.textContent === '30')
  await page.getByRole('button', { name: 'All tid', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('#content .card p')?.textContent === '100')
  await page.getByRole('button', { name: 'Idag (24h)', exact: true }).click()
  await page.getByText('Ingen giltig kopia för detta intervall', { exact: false }).waitFor()
  console.log('PASS ordinarie statistikvy förbereder valda intervall; fel ger ingen ny offlinekopia')
} finally {
  await browser.close()
}

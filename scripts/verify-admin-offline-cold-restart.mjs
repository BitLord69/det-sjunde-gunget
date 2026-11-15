import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'

const origin = process.env.OFFLINE_TEST_ORIGIN || 'http://127.0.0.1:3147'
assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/)
const profile = await mkdtemp(join(tmpdir(), 'gunget-cold-start-'))
const options = { headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) }
let context
try {
  context = await chromium.launchPersistentContext(profile, options)
  const expires = new Date(Date.now() + 3600000).toISOString()
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== origin) return route.abort()
    if (!url.pathname.startsWith('/api/')) return route.continue()
    if (url.pathname === '/api/auth/me') return route.fulfill({ json: { authenticated: true, user: { id: 'cold-test', name: 'Test', email: 'test@example.test', username: 'test', role: 'admin', provider: 'credentials', avatarUrl: null }, sessionExpiresAt: expires } })
    if (url.pathname === '/api/admin/offline-snapshot') return route.fulfill({ json: { userId: 'cold-test', sessionExpiresAt: expires, serverTime: new Date().toISOString(), datasets: { songs: { available: true, data: [{ id: 's', title: 'Kallstartslåt' }] }, gallery: { available: true, data: [] } } } })
    if (url.pathname === '/api/admin/songs/stats') return route.fulfill({ json: { stats: [], lookupById: {}, lookupByTitle: {} } })
    return route.fulfill({ json: [] })
  })
  let page = context.pages()[0] || await context.newPage()
  await page.goto(`${origin}/admin/songs`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Offlinekopian är förberedd', { exact: false }).waitFor({ timeout: 60000 })
  await page.getByText('Offline-start: förberedd', { exact: false }).waitFor({ timeout: 30000 })
  await context.close()
  context = await chromium.launchPersistentContext(profile, options)
  await context.setOffline(true)
  page = context.pages()[0] || await context.newPage()
  await page.goto(`${origin}/admin/songs`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Offline-läsläge' }).waitFor({ timeout: 30000 })
  await page.getByText('Kallstartslåt').waitFor({ timeout: 30000 })
  console.log('PASS full webbläsaromstart och offline-kallstart med sparad profil')
} finally {
  await context?.close()
  await rm(profile, { recursive: true, force: true })
}
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

// Only a local development server may be used. No API request reaches it.
const origin = process.env.MOBILE_TEST_ORIGIN || 'http://127.0.0.1:3137'
assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/)
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) })

try {
  for (const viewport of [{ width: 375, height: 812 }, { width: 320, height: 740 }]) {
    const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
    const blockedWrites = []
    const apiRequests = []
    await context.route('**/*', async route => {
      const request = route.request()
      const url = new URL(request.url())
      if (url.origin !== origin) return route.abort()
      if (!['GET', 'HEAD'].includes(request.method())) {
        blockedWrites.push(`${request.method()} ${url.pathname}`)
        return route.abort()
      }
      if (!url.pathname.startsWith('/api/')) return route.continue()
      apiRequests.push(url.pathname)
      if (url.pathname === '/api/auth/me') {
        return route.fulfill({ json: { authenticated: true, user: { id: 'test', name: 'Test Admin', email: 'test@example.test', username: 'test', role: 'admin', provider: 'credentials', avatarUrl: null }, sessionExpiresAt: new Date(Date.now() + 3600000).toISOString() } })
      }
      if (url.pathname === '/api/admin/fan-central/submissions') return route.fulfill({ json: { counts: { pending: 0 } } })
      return route.fulfill({ json: [] })
    })

    try {
      const page = await context.newPage()
      await page.goto(`${origin}/admin/help`, { waitUntil: 'domcontentloaded' })
      const userToggle = page.getByRole('button', { name: 'Öppna användarmeny' })
      await userToggle.waitFor({ timeout: 60000 })
      const nav = page.locator('main nav').first()
      await nav.waitFor()
      assert.equal(await page.locator('header').evaluate(el => getComputedStyle(el).zIndex), '50')
      assert.equal(await nav.evaluate(el => getComputedStyle(el).zIndex), '40')

      await userToggle.click()
      const menu = page.locator('#admin-user-menu')
      await menu.waitFor()
      const install = menu.getByRole('button', { name: 'Installationsguide', exact: true })
      await install.waitFor()
      const hit = await install.evaluate((button) => {
        const nav = document.querySelector('main nav')
        const a = button.getBoundingClientRect()
        const b = nav.getBoundingClientRect()
        const left = Math.max(a.left, b.left)
        const right = Math.min(a.right, b.right)
        const top = Math.max(a.top, b.top)
        const bottom = Math.min(a.bottom, b.bottom)
        if (right <= left || bottom <= top) return { overlap: false }
        const x = (left + right) / 2
        const y = (top + bottom) / 2
        const element = document.elementFromPoint(x, y)
        return { overlap: true, x, y, isInstall: button.contains(element), tag: element?.tagName }
      })
      assert.equal(hit.overlap, true, 'Installationsknappen måste överlappa navigationsfältet för ett giltigt staplingstest')
      assert.equal(hit.isInstall, true, `elementFromPoint träffade inte installationsknappen: ${JSON.stringify(hit)}`)
      const negativeControl = await page.evaluate(({ x, y }) => {
        const header = document.querySelector('header')
        const nav = document.querySelector('main nav')
        const previous = header.style.zIndex
        try {
          header.style.zIndex = '30'
          return nav.contains(document.elementFromPoint(x, y))
        } finally {
          header.style.zIndex = previous
        }
      }, hit)
      assert.equal(negativeControl, true, 'Negativ kontroll misslyckades: navigeringen ska täcka knappen vid omvänd staplingsordning')

      await install.click()
      const dialog = page.getByRole('dialog', { name: 'Installera admin som app' })
      await dialog.waitFor()
      assert.equal(await dialog.evaluate(el => el.open), true)
      assert.equal(await dialog.evaluate(el => el.matches(':modal')), true)
      const backdrop = dialog.locator('.modal-backdrop button')
      await backdrop.click({ position: { x: 5, y: 5 } })
      await page.waitForFunction(() => !document.querySelector('#admin-user-menu dialog')?.open)
      assert.equal(await page.locator('#admin-user-menu dialog').evaluate(el => el.matches(':modal')), false)

      // Dismiss the user menu by tapping its backdrop, not its toggle.
      const userBackdrop = page.locator('header div.fixed.inset-0.z-40')
      await userBackdrop.click({ position: { x: 10, y: 10 } })
      await menu.waitFor({ state: 'hidden' })
      await page.getByRole('button', { name: 'Öppna adminsektioner' }).click()
      await page.getByText('Välj adminsektion', { exact: true }).waitFor()
      assert.equal(blockedWrites.length, 0, `Skrivförsök blockerades: ${blockedWrites.join(', ')}`)
      assert.ok(apiRequests.includes('/api/auth/me'), 'Autentiseringsmocken användes inte')
      console.log(`PASS ${viewport.width}x${viewport.height}: z-index 50/40, överlappande knapp träffad vid (${hit.x.toFixed(1)}, ${hit.y.toFixed(1)}), negativ staplingskontroll, guide och båda backdrops, sektionsmeny; ${apiRequests.length} mockade API-anrop, 0 skrivförsök`)
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
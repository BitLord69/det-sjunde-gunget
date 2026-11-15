import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { createAdminPwa } from '../app/utils/admin-pwa.ts'

const manifest = JSON.parse(await readFile(new URL('../public/admin.webmanifest', import.meta.url), 'utf8'))
assert.equal(manifest.id, '/admin')
assert.equal(manifest.name, 'Det 7:e Gunget – Band Admin')
assert.equal(manifest.short_name, 'Gunget Admin')
assert.equal(manifest.start_url, '/admin')
assert.equal(manifest.scope, '/admin')
assert.equal(manifest.display, 'standalone')
assert.deepEqual(manifest.shortcuts.map(item => item.url), ['/admin/songs', '/admin/gigs', '/admin/gallery', '/admin/analytics'])
for (const icon of [...manifest.icons, ...manifest.shortcuts.flatMap(item => item.icons), { src: '/media/admin-pwa/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]) {
  const image = await sharp(fileURLToPath(new URL(`../public${icon.src}`, import.meta.url))).metadata()
  assert.equal(image.format, 'png')
  assert.equal(`${image.width}x${image.height}`, icon.sizes)
}
assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable' && icon.sizes === '512x512'))

const image = await sharp(fileURLToPath(new URL('../public/media/admin-pwa/icon-maskable-512.png', import.meta.url))).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
// Outside the required safe circle, no foreground pixels may differ from the background.
for (let y = 0; y < image.info.height; y++) {
  for (let x = 0; x < image.info.width; x++) {
    if (Math.hypot(x + 0.5 - 256, y + 0.5 - 256) > 205) {
      const offset = (y * 512 + x) * 4
      assert.deepEqual([...image.data.subarray(offset, offset + 4)], [18, 14, 11, 255])
    }
  }
}

function makeWindow(userAgent = 'test', platform = 'test', maxTouchPoints = 0) {
  const window = new EventTarget()
  const media = new EventTarget()
  media.matches = false
  window.navigator = { userAgent, platform, maxTouchPoints }
  window.matchMedia = () => media
  return { window, media }
}

const { window, media } = makeWindow()
const app = createAdminPwa(window)
assert.equal(await app.install(), 'guide')
const event = new Event('beforeinstallprompt', { cancelable: true })
let promptCalls = 0
event.prompt = async () => { promptCalls++ }
event.userChoice = Promise.resolve({ outcome: 'dismissed' })
window.dispatchEvent(event)
assert.equal(event.defaultPrevented, true)
assert.equal(app.state.canPrompt, true)
assert.equal(await app.install(), 'prompted')
assert.equal(promptCalls, 1)
assert.equal(await app.install(), 'guide')
window.dispatchEvent(new Event('appinstalled'))
assert.equal(app.state.installed, true)
assert.equal(await app.install(), 'installed')
media.matches = false
media.dispatchEvent(new Event('change'))
assert.equal(app.state.installed, false)
media.matches = true
media.dispatchEvent(new Event('change'))
assert.equal(app.state.installed, true)
assert.equal(createAdminPwa(makeWindow('iPhone').window).state.isAppleMobile, true)
assert.equal(createAdminPwa(makeWindow('Mozilla/5.0', 'MacIntel', 5).window).state.isAppleMobile, true)
assert.equal(createAdminPwa(makeWindow('Mozilla/5.0', 'MacIntel', 0).window).state.isAppleMobile, false)
const broken = makeWindow()
const brokenApp = createAdminPwa(broken.window)
const brokenEvent = new Event('beforeinstallprompt', { cancelable: true })
brokenEvent.prompt = async () => { throw new Error('unavailable') }
brokenEvent.userChoice = Promise.resolve({ outcome: 'dismissed' })
broken.window.dispatchEvent(brokenEvent)
assert.equal(await brokenApp.install(), 'guide')
console.log('PASS manifest, ikoner, maskable safe zone, prompt, fallback, appinstalled och fristående läge')
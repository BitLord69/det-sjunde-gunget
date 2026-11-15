import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const source = fileURLToPath(new URL('../public/media/brand/Logotyp_mini.webp', import.meta.url))
const output = fileURLToPath(new URL('../public/media/admin-pwa/', import.meta.url))
await mkdir(output, { recursive: true })

// Every foreground element, including the ring, stays inside the maskable
// safe circle (radius 40% of the image); the background fills the canvas.
const ring = Buffer.from(`<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <circle cx="256" cy="256" r="194" fill="none" stroke="#e2bd72" stroke-width="6" />
</svg>`)
const text = Buffer.from(`<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <text x="256" y="393" text-anchor="middle" font-family="sans-serif" font-size="34" font-weight="bold" letter-spacing="6" fill="#e2bd72">ADMIN</text>
</svg>`)
const logo = await sharp(source).resize(250, 250, { fit: 'contain' }).png().toBuffer()
const master = await sharp({ create: { width: 512, height: 512, channels: 4, background: '#120e0b' } })
  .composite([{ input: ring }, { input: logo, left: 131, top: 98 }, { input: text }])
  .png().toBuffer()

for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512], ['apple-touch-icon.png', 180]]) {
  const file = `${output}${name}`
  await sharp(master).resize(size, size).png().toFile(file)
  const metadata = await sharp(file).metadata()
  if (metadata.width !== size || metadata.height !== size || metadata.format !== 'png') throw new Error(`Felaktig ikon: ${name}`)
  console.log(`${name}: ${metadata.width}x${metadata.height} ${metadata.format}`)
}
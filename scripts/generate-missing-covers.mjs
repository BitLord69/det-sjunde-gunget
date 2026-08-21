import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'

async function generateMissingCovers() {
  const width = 800
  const height = 800

  // 1. Pride and Joy (Stevie Ray Vaughan)
  const photo1 = path.resolve('public/media/band/17..7de Gunget photoshoot1 21-6 26-4.jpg')
  const buf1 = await fs.readFile(photo1)

  const svg1 = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0a0705" stop-opacity="0.94" />
        <stop offset="60%" stop-color="#140e0a" stop-opacity="0.75" />
        <stop offset="100%" stop-color="#140e0a" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="bottomGrad" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="#0a0705" stop-opacity="0.95" />
        <stop offset="65%" stop-color="#140e0a" stop-opacity="0.80" />
        <stop offset="100%" stop-color="#140e0a" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="goldText" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="50%" stop-color="#fef08a" />
        <stop offset="100%" stop-color="#0284c7" />
      </linearGradient>
      <filter id="textShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="3" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.95" />
      </filter>
    </defs>
    <rect x="0" y="0" width="${width}" height="175" fill="url(#topGrad)" />
    <rect x="0" y="${height - 180}" width="${width}" height="180" fill="url(#bottomGrad)" />
    <rect x="12" y="12" width="${width - 24}" height="${height - 24}" fill="none" stroke="#38bdf8" stroke-width="3" stroke-opacity="0.6" rx="6" />
    <rect x="18" y="18" width="${width - 36}" height="${height - 36}" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.25" rx="4" />
    <g transform="translate(${width - 130}, 28)">
      <rect width="98" height="34" rx="6" fill="#0369a1" fill-opacity="0.85" stroke="#38bdf8" stroke-width="1" />
      <text x="49" y="22" font-family="'Impact', 'Arial Black', sans-serif" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">
        45 RPM
      </text>
    </g>
    <text x="${width / 2}" y="76" font-family="'Impact', 'Arial Black', sans-serif" font-size="50" font-weight="900" fill="url(#goldText)" text-anchor="middle" letter-spacing="4" filter="url(#textShadow)">
      DET 7:E GUNGET
    </text>
    <text x="${width / 2}" y="104" font-family="'Courier New', monospace" font-size="12" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="4">
      ★ TEXAS BLUES • 45 RPM ★
    </text>
    <text x="${width / 2}" y="${height - 76}" font-family="'Impact', 'Arial Black', sans-serif" font-size="46" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2" filter="url(#textShadow)">
      PRIDE AND JOY
    </text>
    <text x="${width / 2}" y="${height - 42}" font-family="'Courier New', monospace" font-size="13" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="2.5">
      ORIGINAL AV STEVIE RAY VAUGHAN
    </text>
  </svg>
  `

  const final1 = await sharp(buf1)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .modulate({ brightness: 0.95, saturation: 1.15 })
    .composite([{ input: Buffer.from(svg1), top: 0, left: 0 }])
    .jpeg({ quality: 94 })
    .toBuffer()

  await fs.writeFile('public/images/records/pride-and-joy.jpg', final1)
  console.log('Saved pride-and-joy.jpg')

  // 2. Kaffe & Rörförstärkare (Original)
  const photo2 = path.resolve('public/media/band/19..7de Gunget photoshoot1 21-6 26-5.jpg')
  const buf2 = await fs.readFile(photo2)

  const svg2 = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0a0705" stop-opacity="0.94" />
        <stop offset="60%" stop-color="#140e0a" stop-opacity="0.75" />
        <stop offset="100%" stop-color="#140e0a" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="bottomGrad" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="#0a0705" stop-opacity="0.95" />
        <stop offset="65%" stop-color="#140e0a" stop-opacity="0.80" />
        <stop offset="100%" stop-color="#140e0a" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="goldText" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#f59e0b" />
        <stop offset="50%" stop-color="#fef08a" />
        <stop offset="100%" stop-color="#d97706" />
      </linearGradient>
      <filter id="textShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="3" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.95" />
      </filter>
    </defs>
    <rect x="0" y="0" width="${width}" height="175" fill="url(#topGrad)" />
    <rect x="0" y="${height - 180}" width="${width}" height="180" fill="url(#bottomGrad)" />
    <rect x="12" y="12" width="${width - 24}" height="${height - 24}" fill="none" stroke="#f59e0b" stroke-width="3" stroke-opacity="0.6" rx="6" />
    <rect x="18" y="18" width="${width - 36}" height="${height - 36}" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.25" rx="4" />
    <g transform="translate(${width - 130}, 28)">
      <rect width="98" height="34" rx="6" fill="#b45309" fill-opacity="0.85" stroke="#fef08a" stroke-width="1" />
      <text x="49" y="22" font-family="'Impact', 'Arial Black', sans-serif" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">
        45 RPM
      </text>
    </g>
    <text x="${width / 2}" y="76" font-family="'Impact', 'Arial Black', sans-serif" font-size="50" font-weight="900" fill="url(#goldText)" text-anchor="middle" letter-spacing="4" filter="url(#textShadow)">
      DET 7:E GUNGET
    </text>
    <text x="${width / 2}" y="104" font-family="'Courier New', monospace" font-size="12" font-weight="700" fill="#fef08a" text-anchor="middle" letter-spacing="4">
      ★ SKANDINAVISK BLUESROCK ★
    </text>
    <text x="${width / 2}" y="${height - 76}" font-family="'Impact', 'Arial Black', sans-serif" font-size="36" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2" filter="url(#textShadow)">
      KAFFE &amp; RÖRFÖRSTÄRKARE
    </text>
    <text x="${width / 2}" y="${height - 42}" font-family="'Courier New', monospace" font-size="13" font-weight="700" fill="#f59e0b" text-anchor="middle" letter-spacing="2.5">
      ORIGINALKOMPOSITION
    </text>
  </svg>
  `

  const final2 = await sharp(buf2)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .modulate({ brightness: 0.95, saturation: 1.15 })
    .composite([{ input: Buffer.from(svg2), top: 0, left: 0 }])
    .jpeg({ quality: 94 })
    .toBuffer()

  await fs.writeFile('public/images/records/kaffe-och-ror.jpg', final2)
  console.log('Saved kaffe-och-ror.jpg')
}

generateMissingCovers()

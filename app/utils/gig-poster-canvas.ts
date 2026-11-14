import { BAND_PHOTOSHOOT_LIST, loadCrossOriginImage } from './studio-shared'

export interface GigPosterItem {
  id: string
  venue: string
  city: string
  date: string | number | Date
  status?: string | null
  posterUrl?: string | null
}

export type PosterFontKey = 'poetsen' | 'righteous' | 'calistoga' | 'caprasimo' | 'oleo' | 'lemon' | 'rye'
export type PosterThemeKey = 'sunburst' | 'sonet' | 'chess' | 'sun' | 'neon'
export type PosterFormatKey = 'a4' | 'story' | 'square'
export type PosterPhotoFilter = 'vintage' | 'bw' | 'duotone' | 'natural'

export interface PosterFontOption {
  key: PosterFontKey
  name: string
  label: string
  family: string
  weight: number
}

export const posterFonts: PosterFontOption[] = [
  {
    key: 'poetsen',
    name: 'Poetsen One',
    label: 'Poetsen One — Handmålad Vintage-skylt (Standard)',
    family: 'Poetsen One',
    weight: 400,
  },
  {
    key: 'righteous',
    name: 'Righteous',
    label: 'Righteous — Retro Art-Deco / 50-tals Jukebox',
    family: 'Righteous',
    weight: 400,
  },
  {
    key: 'calistoga',
    name: 'Calistoga',
    label: 'Calistoga — 60/70-tals Roots & Blues',
    family: 'Calistoga',
    weight: 400,
  },
  {
    key: 'caprasimo',
    name: 'Caprasimo',
    label: 'Caprasimo — 70-tals Vinyl & Cooper-stil',
    family: 'Caprasimo',
    weight: 400,
  },
  {
    key: 'oleo',
    name: 'Oleo Script Bold',
    label: 'Oleo Script Bold — 50-tals Jukebox & Bar-skylt',
    family: 'Oleo Script',
    weight: 700,
  },
  {
    key: 'lemon',
    name: 'Lemon',
    label: 'Lemon — Singelomslag & Retro-Diner',
    family: 'Lemon',
    weight: 400,
  },
  {
    key: 'rye',
    name: 'Rye',
    label: 'Rye — Roots, Blues & Bourbon-affisch',
    family: 'Rye',
    weight: 400,
  },
]

export const bandPhotos = BAND_PHOTOSHOOT_LIST.map((bp) => ({
  url: bp.path,
  title: bp.label.replace(/^Bandfoto \d+:\s*/, ''),
}))

export const posterThemes: Record<
  PosterThemeKey,
  {
    name: string
    bg: string
    paperTint: string
    primary: string
    secondary: string
    accent: string
    border: string
    tagBg: string
    frameInner: string
  }
> = {
  sunburst: {
    name: 'Retro Sunburst (Originalmall)',
    bg: '#2c2b31',
    paperTint: '#2c2b31',
    primary: '#dc624b',
    secondary: '#ede8ca',
    accent: '#dc624b',
    border: '#ede8ca',
    tagBg: '#232227',
    frameInner: '#1e1d22',
  },
  sonet: {
    name: 'Sonet 70s Blues',
    bg: '#14100c',
    paperTint: '#1f1814',
    primary: '#d4af37',
    secondary: '#f3e5ab',
    accent: '#c0392b',
    border: '#d4af37',
    tagBg: '#2a1f18',
    frameInner: '#0e0b08',
  },
  chess: {
    name: 'Chess Records Kraft',
    bg: '#f4ebd9',
    paperTint: '#eae0cc',
    primary: '#8b0000',
    secondary: '#1c1511',
    accent: '#b8860b',
    border: '#8b0000',
    tagBg: '#dfd2bc',
    frameInner: '#d9cdb7',
  },
  sun: {
    name: 'Sun Studio Memphis',
    bg: '#181512',
    paperTint: '#261f19',
    primary: '#f39c12',
    secondary: '#fdfefe',
    accent: '#e74c3c',
    border: '#f39c12',
    tagBg: '#34271d',
    frameInner: '#120f0c',
  },
  neon: {
    name: 'Midnight Club Neon',
    bg: '#0a0a0f',
    paperTint: '#131322',
    primary: '#00e5ff',
    secondary: '#ff9100',
    accent: '#ff0055',
    border: '#00e5ff',
    tagBg: '#1a1a2e',
    frameInner: '#06060a',
  },
}

export function getPosterDimensions(format: PosterFormatKey) {
  switch (format) {
    case 'story':
      return { width: 1080, height: 1920, label: 'Story (9:16)' }
    case 'square':
      return { width: 1080, height: 1080, label: 'Kvadrat / Feed (1:1)' }
    case 'a4':
    default:
      return { width: 1200, height: 1600, label: 'Klassisk Affisch (3:4)' }
  }
}

export async function ensurePosterFontLoaded(fontOpt: PosterFontOption) {
  if (typeof document === 'undefined' || !('fonts' in document)) return
  try {
    await document.fonts.load(`${fontOpt.weight} 48px "${fontOpt.family}"`)
  } catch {
    // Ignore font load errors and fall back gracefully
  }
}

const imageCache = new Map<string, HTMLImageElement>()

export function loadPosterImage(src: string): Promise<HTMLImageElement> {
  return loadCrossOriginImage(src, imageCache)
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const imgRatio = img.width / img.height
  const targetRatio = w / h
  let sx = 0
  let sy = 0
  let sw = img.width
  let sh = img.height

  if (imgRatio > targetRatio) {
    sw = img.height * targetRatio
    sx = (img.width - sw) / 2
  } else {
    sh = img.width / targetRatio
    sy = (img.height - sh) / 2
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function fitTextFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  initialSize: number,
  minSize: number,
  maxWidth: number,
  fontFamily: string,
  fontWeight: string | number = 900,
) {
  let size = initialSize
  ctx.font = `${fontWeight} ${size}px ${fontFamily}`
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 2
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`
  }
  return size
}

function splitIntoTwoLines(text: string): [string, string] {
  const cleaned = text.trim().replace(/\s+/g, ' ')
  if (cleaned.includes('\n')) {
    const parts = cleaned.split('\n').map((s) => s.trim()).filter(Boolean)
    return [parts[0] || '', parts.slice(1).join(' ')]
  }
  const words = cleaned.split(' ')
  if (words.length <= 1) return [cleaned, '']
  if (words.length === 2) return [words[0]!, words[1]!]

  let bestSplit = Math.ceil(words.length / 2)
  let bestScore = Infinity
  const totalLen = cleaned.length
  const targetFirstRatio = 0.58

  for (let i = 1; i < words.length; i++) {
    const l1 = words.slice(0, i).join(' ')
    const ratio = l1.length / totalLen
    const score = Math.abs(ratio - targetFirstRatio)
    if (score < bestScore) {
      bestScore = score
      bestSplit = i
    }
  }

  return [
    words.slice(0, bestSplit).join(' '),
    words.slice(bestSplit).join(' '),
  ]
}

export function formatShortGigDate(dateVal: string | number | Date | null | undefined): string {
  if (!dateVal) return ''
  try {
    const d = new Date(dateVal)
    return d
      .toLocaleDateString('sv-SE', {
        day: 'numeric',
        month: 'long',
      })
      .toUpperCase()
  } catch {
    return String(dateVal).toUpperCase()
  }
}

export function formatGigDate(dateVal: string | number | Date | null | undefined): string {
  if (!dateVal) return ''
  try {
    const d = new Date(dateVal)
    return d
      .toLocaleDateString('sv-SE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      .toUpperCase()
  } catch {
    return String(dateVal).toUpperCase()
  }
}

export function formatGigTime(dateVal: string | number | Date | null | undefined): string {
  if (!dateVal) return ''
  try {
    const d = new Date(dateVal)
    return d.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export async function downloadBlankSunburstTemplate() {
  try {
    const img = await loadPosterImage('/media/brand/poster_template_retro_mics.webp')
    const offCanvas = document.createElement('canvas')
    offCanvas.width = img.width
    offCanvas.height = img.height
    const offCtx = offCanvas.getContext('2d')
    if (!offCtx) return
    offCtx.drawImage(img, 0, 0)
    const dataUrl = offCanvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = 'mall-det-7e-gunget-retro-sunburst-utan-text.png'
    link.href = dataUrl
    link.click()
  } catch {
    window.open('/media/brand/poster_template_retro_mics.webp', '_blank')
  }
}

export interface RenderPosterOptions {
  selectedTheme: PosterThemeKey
  selectedFormat: PosterFormatKey
  fontOpt: PosterFontOption
  topPresenter: string
  headline: string
  subheadline: string
  customNotes: string
  includeBandMembers: boolean
  useBandLogo: boolean
  logoSize: 'normal' | 'large'
  activePhotoUrl: string | null
  photoFilter: PosterPhotoFilter
}

export async function renderGigPosterToCanvas(
  canvas: HTMLCanvasElement,
  gig: GigPosterItem,
  options: RenderPosterOptions,
  shouldAbort: () => boolean,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { width, height } = getPosterDimensions(options.selectedFormat)
  canvas.width = width
  canvas.height = height

  await ensurePosterFontLoaded(options.fontOpt)
  if (shouldAbort()) return

  const selectedFontStack = `'${options.fontOpt.family}', 'Poetsen One', sans-serif`
  const selectedFontWeight = options.fontOpt.weight
  const theme = posterThemes[options.selectedTheme]

  // Special Dedicated Renderer for the Band's Original "Retro Sunburst & Mics" Template
  if (options.selectedTheme === 'sunburst') {
    let templateImg: HTMLImageElement | null
    try {
      templateImg = await loadPosterImage('/media/brand/poster_template_retro_mics.webp')
    } catch {
      templateImg = null
    }

    let photoImg: HTMLImageElement | null = null
    if (options.activePhotoUrl) {
      try {
        photoImg = await loadPosterImage(options.activePhotoUrl)
      } catch {
        photoImg = null
      }
    }

    if (shouldAbort()) return

    const isStory = options.selectedFormat === 'story'
    const isSquare = options.selectedFormat === 'square'
    const creamColor = '#ede8ca'
    const softCreamColor = '#ece6d6'
    const darkCharcoal = '#2c2b31'

    ctx.fillStyle = darkCharcoal
    ctx.fillRect(0, 0, width, height)

    let topSectionBottomY = Math.round(height * 0.62)

    if (templateImg) {
      if (isSquare) {
        const topCropY = 48
        const topCropH = 597
        const topScale = (height * 0.58) / topCropH
        const drawTopW = Math.round(templateImg.width * topScale)
        const drawTopH = Math.round(topCropH * topScale)
        const drawTopX = Math.round((width - drawTopW) / 2)

        ctx.drawImage(templateImg, 0, topCropY, templateImg.width, topCropH, 0, 0, width, drawTopH)
        ctx.drawImage(templateImg, 0, topCropY, templateImg.width, topCropH, drawTopX, 0, drawTopW, drawTopH)
        topSectionBottomY = drawTopH

        const micSrcY = 685
        const micSrcH = 339
        const micScale = (width / templateImg.width) * 0.72
        const micDrawH = Math.round(micSrcH * micScale)
        const leftMicSrcW = 240
        const leftMicDrawW = Math.round(leftMicSrcW * micScale)
        ctx.drawImage(
          templateImg,
          0,
          micSrcY,
          leftMicSrcW,
          micSrcH,
          0,
          height - micDrawH,
          leftMicDrawW,
          micDrawH,
        )
        const rightMicSrcX = 483
        const rightMicSrcW = 240
        const rightMicDrawW = Math.round(rightMicSrcW * micScale)
        ctx.drawImage(
          templateImg,
          rightMicSrcX,
          micSrcY,
          rightMicSrcW,
          micSrcH,
          width - rightMicDrawW,
          height - micDrawH,
          rightMicDrawW,
          micDrawH,
        )
      } else {
        const topCropY = isStory ? 0 : 14
        const topCropH = 645 - topCropY
        const drawTopH = Math.round(width * (topCropH / templateImg.width))
        ctx.drawImage(templateImg, 0, topCropY, templateImg.width, topCropH, 0, 0, width, drawTopH)
        topSectionBottomY = drawTopH

        const micSrcY = 685
        const micSrcH = 339
        const drawBotH = Math.round(width * (micSrcH / templateImg.width))
        ctx.drawImage(
          templateImg,
          0,
          micSrcY,
          templateImg.width,
          micSrcH,
          0,
          height - drawBotH,
          width,
          drawBotH,
        )
      }
    }

    if (options.topPresenter.trim()) {
      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const presFontSize = Math.round(width * (isSquare ? 0.02 : 0.023))
      ctx.font = `${selectedFontWeight} ${presFontSize}px ${selectedFontStack}`
      ctx.fillStyle = '#232227'
      ctx.letterSpacing = '0.06em'
      const presY = Math.round(topSectionBottomY * (isSquare ? 0.075 : 0.115))
      ctx.fillText(options.topPresenter.trim().toUpperCase(), width / 2, presY)
      ctx.restore()
    }

    let textZoneStartY = topSectionBottomY + Math.round(height * (isStory ? 0.025 : 0.015))
    if (photoImg) {
      const maxPhotoH = isStory ? Math.round(height * 0.22) : Math.round(height * 0.14)
      const photoW = Math.round(width * (isSquare ? 0.46 : 0.56))
      const photoX = Math.round((width - photoW) / 2)
      const photoY = textZoneStartY

      ctx.save()
      ctx.beginPath()
      ctx.rect(photoX, photoY, photoW, maxPhotoH)
      ctx.clip()
      if (options.photoFilter === 'vintage') {
        ctx.filter = 'sepia(0.55) contrast(1.15) brightness(0.95)'
      } else if (options.photoFilter === 'bw') {
        ctx.filter = 'grayscale(1) contrast(1.25)'
      } else if (options.photoFilter === 'duotone') {
        ctx.filter = 'grayscale(1) contrast(1.2)'
      }
      drawCoverImage(ctx, photoImg, photoX, photoY, photoW, maxPhotoH)
      ctx.restore()

      ctx.strokeStyle = creamColor
      ctx.lineWidth = Math.round(width * 0.004)
      ctx.strokeRect(photoX, photoY, photoW, maxPhotoH)

      textZoneStartY = photoY + maxPhotoH + Math.round(height * 0.02)
    } else if (isStory) {
      textZoneStartY = topSectionBottomY + Math.round(height * 0.065)
    }

    const rawHeadline = options.headline.trim()
    const effectivePrefix =
      rawHeadline.toUpperCase() === 'LIVE PÅ SCEN'
        ? 'LIVE PÅ'
        : rawHeadline
    const rawVenue = (gig.venue || 'SPELSTÄLLE').trim()
    const combinedVenueCallout = effectivePrefix
      ? (rawVenue.toUpperCase().startsWith('LIVE ') ? rawVenue : `${effectivePrefix} ${rawVenue}`)
      : rawVenue
    const calloutWithBang = /[!?.]$/.test(combinedVenueCallout)
      ? combinedVenueCallout.toUpperCase()
      : `${combinedVenueCallout.toUpperCase()}!`

    const [venueLine1, venueLine2] = splitIntoTwoLines(calloutWithBang)

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = creamColor
    ctx.letterSpacing = '0.03em'

    const displayFont = selectedFontStack
    const maxWLine1 = Math.round(width * (isSquare ? 0.64 : 0.72))
    const maxWLine2 = Math.round(width * (isSquare ? 0.46 : 0.46))
    const targetVenueFontSize = Math.round(width * (photoImg ? 0.052 : isSquare ? 0.064 : 0.074))

    if (venueLine2) {
      const size1 = fitTextFont(ctx, venueLine1, targetVenueFontSize, 26, maxWLine1, displayFont, selectedFontWeight)
      const size2 = fitTextFont(ctx, venueLine2, targetVenueFontSize, 26, maxWLine2, displayFont, selectedFontWeight)
      const unifiedSize = Math.min(size1, size2)
      ctx.font = `${selectedFontWeight} ${unifiedSize}px ${displayFont}`

      const line1Y = textZoneStartY + Math.round(unifiedSize * 0.55)
      const line2Y = line1Y + Math.round(unifiedSize * 1.12)
      ctx.fillText(venueLine1, width / 2, line1Y)
      ctx.fillText(venueLine2, width / 2, line2Y)
      textZoneStartY = line2Y + Math.round(unifiedSize * 0.85)
    } else {
      const size1 = fitTextFont(ctx, venueLine1, targetVenueFontSize, 26, maxWLine2, displayFont, selectedFontWeight)
      ctx.font = `${selectedFontWeight} ${size1}px ${displayFont}`
      const line1Y = textZoneStartY + Math.round(size1 * 0.8)
      ctx.fillText(venueLine1, width / 2, line1Y)
      textZoneStartY = line1Y + Math.round(size1 * 1.0)
    }
    ctx.restore()

    const shortDateStr = formatShortGigDate(gig.date)
    const timeStr = formatGigTime(gig.date)
    const rawSub = options.subheadline.trim()
    const isDefaultSub = rawSub.toUpperCase() === "ÄKTA BLUES & SVÄNGIG ROCK 'N' ROLL"
    const middleDetailLine = !isDefaultSub && rawSub
      ? rawSub.toUpperCase()
      : timeStr
        ? `KL ${timeStr}`
        : ''
    const cityStr = (gig.city || 'ÄNGELHOLM').trim().toUpperCase()

    const safeCenterMaxW = Math.round(width * 0.36)
    const detailFontFamily = selectedFontStack
    const detailBaseSize = Math.round(width * (isSquare ? 0.025 : 0.028))
    const detailStepY = Math.round(detailBaseSize * 1.38)

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = softCreamColor
    ctx.letterSpacing = '0.06em'

    let currentDetailY = textZoneStartY + Math.round(height * 0.012)
    if (shortDateStr) {
      fitTextFont(ctx, shortDateStr, detailBaseSize, 16, safeCenterMaxW, detailFontFamily, selectedFontWeight)
      ctx.fillText(shortDateStr, width / 2, currentDetailY)
      currentDetailY += detailStepY
    }
    if (middleDetailLine) {
      fitTextFont(ctx, middleDetailLine, Math.round(detailBaseSize * 0.92), 15, safeCenterMaxW, detailFontFamily, selectedFontWeight)
      ctx.fillText(middleDetailLine, width / 2, currentDetailY)
      currentDetailY += detailStepY
    }
    if (cityStr) {
      fitTextFont(ctx, cityStr, detailBaseSize, 16, safeCenterMaxW, detailFontFamily, selectedFontWeight)
      ctx.fillText(cityStr, width / 2, currentDetailY)
      currentDetailY += detailStepY
    }
    ctx.restore()

    const rawNotes = options.customNotes.trim()
    let botLine1: string
    let botLine2: string

    if (rawNotes) {
      if (rawNotes.includes('•')) {
        const parts = rawNotes.split('•').map((s) => s.trim()).filter(Boolean)
        botLine1 = (parts[0] || '').toUpperCase()
        botLine2 = parts.slice(1).join(' • ').toUpperCase()
      } else if (rawNotes.length > 22) {
        const [l1, l2] = splitIntoTwoLines(rawNotes.toUpperCase())
        botLine1 = l1
        botLine2 = l2
      } else {
        botLine1 = rawNotes.toUpperCase()
        botLine2 = options.includeBandMembers ? 'WWW.SJUNDEGUNGET.SE' : ''
      }
    } else {
      botLine1 = gig.status === 'sold_out'
        ? 'UTSÅLT • FULLSATT HUS!'
        : gig.status === 'free'
          ? 'FRI ENTRÉ • LIVE BLUES & ROCK'
          : 'LIVE BLUES & SVÄNGIG ROCK'
      botLine2 = options.includeBandMembers
        ? 'WWW.SJUNDEGUNGET.SE'
        : ''
    }

    const botCorridorMaxW = Math.round(width * 0.40)
    const botFontSize = Math.round(width * (isSquare ? 0.020 : 0.022))
    const botStepY = Math.round(botFontSize * 1.42)
    const targetBotY = Math.max(
      currentDetailY + Math.round(height * 0.022),
      height - Math.round(height * (isStory ? 0.065 : 0.068)),
    )

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = softCreamColor
    ctx.letterSpacing = '0.05em'

    if (botLine1) {
      fitTextFont(ctx, botLine1, botFontSize, 14, botCorridorMaxW, detailFontFamily, selectedFontWeight)
      ctx.fillText(botLine1, width / 2, targetBotY)
    }
    if (botLine2) {
      fitTextFont(ctx, botLine2, botFontSize, 14, botCorridorMaxW, detailFontFamily, selectedFontWeight)
      ctx.fillText(botLine2, width / 2, targetBotY + botStepY)
    }
    ctx.restore()

    return
  }

  // Classic Vintage Poster Themes (Sonet, Chess, Sun, Neon)
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, width, height)

  const grad = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width * 0.8)
  grad.addColorStop(0, theme.paperTint)
  grad.addColorStop(1, theme.bg)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  const margin = Math.round(width * 0.038)
  ctx.strokeStyle = theme.border
  ctx.lineWidth = Math.round(width * 0.006)
  ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2)

  const innerMargin = margin + Math.round(width * 0.014)
  ctx.lineWidth = Math.round(width * 0.002)
  ctx.strokeRect(innerMargin, innerMargin, width - innerMargin * 2, height - innerMargin * 2)

  const cornerSize = Math.round(width * 0.032)
  const drawCorner = (x: number, y: number, angle: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.fillStyle = theme.primary
    ctx.fillRect(0, 0, cornerSize, cornerSize * 0.22)
    ctx.fillRect(0, 0, cornerSize * 0.22, cornerSize)
    ctx.restore()
  }
  drawCorner(innerMargin, innerMargin, 0)
  drawCorner(width - innerMargin, innerMargin, Math.PI / 2)
  drawCorner(width - innerMargin, height - innerMargin, Math.PI)
  drawCorner(innerMargin, height - innerMargin, -Math.PI / 2)

  let logoImg: HTMLImageElement | null = null
  if (options.useBandLogo) {
    try {
      logoImg = await loadPosterImage('/media/brand/Logotyp.webp')
    } catch {
      logoImg = null
    }
  }

  let photoImg: HTMLImageElement | null = null
  if (options.activePhotoUrl) {
    try {
      photoImg = await loadPosterImage(options.activePhotoUrl)
    } catch {
      photoImg = null
    }
  }

  if (shouldAbort()) return

  const hasPhoto = Boolean(photoImg)
  const isStory = options.selectedFormat === 'story'
  const isSquare = options.selectedFormat === 'square'

  let currentY = margin + Math.round(height * (isStory ? 0.045 : 0.04))
  ctx.textAlign = 'center'

  if (options.headline.trim()) {
    ctx.font = `${selectedFontWeight} ${Math.round(width * (isSquare ? 0.032 : 0.035))}px ${selectedFontStack}`
    ctx.fillStyle = theme.accent
    ctx.letterSpacing = '0.22em'
    ctx.fillText(`★  ${options.headline.trim().toUpperCase()}  ★`, width / 2, currentY)
  }

  if (options.useBandLogo && logoImg) {
    const isLarge = options.logoSize === 'large'
    const maxLogoW = Math.round(width * (hasPhoto ? (isLarge ? 0.72 : 0.58) : (isLarge ? 0.82 : 0.68)))
    const maxLogoH = Math.round(
      height * (isStory ? (isLarge ? 0.18 : 0.13) : hasPhoto ? (isLarge ? 0.16 : 0.12) : (isLarge ? 0.22 : 0.16)),
    )
    const logoAspect = logoImg.width / logoImg.height

    let targetW = maxLogoW
    let targetH = targetW / logoAspect
    if (targetH > maxLogoH) {
      targetH = maxLogoH
      targetW = targetH * logoAspect
    }

    currentY += Math.round(height * 0.01)
    const logoX = (width - targetW) / 2

    if (options.selectedTheme === 'chess') {
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.25)'
      ctx.shadowBlur = 12
      ctx.drawImage(logoImg, logoX, currentY, targetW, targetH)
      ctx.restore()
    } else {
      ctx.drawImage(logoImg, logoX, currentY, targetW, targetH)
    }

    currentY += targetH + Math.round(height * 0.012)
  } else {
    currentY += Math.round(height * (hasPhoto ? 0.065 : 0.08))
    ctx.fillStyle = theme.primary
    ctx.font = `${selectedFontWeight} ${Math.round(width * (hasPhoto ? 0.08 : 0.095))}px ${selectedFontStack}`
    ctx.letterSpacing = '0.04em'
    ctx.fillText('DET 7:e GUNGET', width / 2, currentY)
    currentY += Math.round(height * 0.01)
  }

  if (options.subheadline.trim()) {
    currentY += Math.round(height * (hasPhoto ? 0.022 : 0.03))
    ctx.fillStyle = theme.secondary
    ctx.font = `700 ${Math.round(width * (hasPhoto ? 0.02 : 0.025))}px 'Arvo', serif`
    ctx.letterSpacing = '0.18em'
    ctx.fillText(options.subheadline.trim().toUpperCase(), width / 2, currentY)
  }

  currentY += Math.round(height * 0.018)
  ctx.strokeStyle = theme.primary
  ctx.lineWidth = Math.round(width * 0.0025)
  ctx.beginPath()
  ctx.moveTo(width * 0.32, currentY)
  ctx.lineTo(width * 0.68, currentY)
  ctx.stroke()

  ctx.fillStyle = theme.bg
  ctx.fillRect(width / 2 - 18, currentY - 10, 36, 20)
  ctx.fillStyle = theme.primary
  ctx.font = `${Math.round(width * 0.024)}px sans-serif`
  ctx.fillText('⚡', width / 2, currentY + 7)

  if (hasPhoto && photoImg) {
    currentY += Math.round(height * 0.018)
    const photoW = Math.round(width * 0.82)
    const photoH = Math.round(height * (isStory ? 0.38 : isSquare ? 0.28 : 0.34))
    const photoX = (width - photoW) / 2
    const photoY = currentY

    ctx.fillStyle = theme.frameInner
    ctx.fillRect(photoX, photoY, photoW, photoH)

    ctx.save()
    ctx.beginPath()
    ctx.rect(photoX, photoY, photoW, photoH)
    ctx.clip()

    if (options.photoFilter === 'vintage') {
      ctx.filter = 'sepia(0.6) contrast(1.18) brightness(0.96) saturate(1.15)'
    } else if (options.photoFilter === 'bw') {
      ctx.filter = 'grayscale(1) contrast(1.3) brightness(0.95)'
    } else if (options.photoFilter === 'duotone') {
      ctx.filter = 'grayscale(1) contrast(1.25)'
    } else {
      ctx.filter = 'contrast(1.05) saturate(1.08)'
    }

    drawCoverImage(ctx, photoImg, photoX, photoY, photoW, photoH)

    if (options.photoFilter === 'duotone') {
      ctx.filter = 'none'
      ctx.globalCompositeOperation = 'multiply'
      ctx.fillStyle = theme.primary
      ctx.fillRect(photoX, photoY, photoW, photoH)
    }

    ctx.restore()

    ctx.strokeStyle = theme.primary
    ctx.lineWidth = Math.round(width * 0.004)
    ctx.strokeRect(photoX, photoY, photoW, photoH)

    ctx.strokeStyle = theme.paperTint
    ctx.lineWidth = Math.round(width * 0.0015)
    ctx.strokeRect(photoX + 4, photoY + 4, photoW - 8, photoH - 8)

    const rivet = (rx: number, ry: number) => {
      ctx.fillStyle = theme.primary
      ctx.beginPath()
      ctx.arc(rx, ry, Math.round(width * 0.008), 0, Math.PI * 2)
      ctx.fill()
    }
    rivet(photoX + 12, photoY + 12)
    rivet(photoX + photoW - 12, photoY + 12)
    rivet(photoX + photoW - 12, photoY + photoH - 12)
    rivet(photoX + 12, photoY + photoH - 12)

    currentY = photoY + photoH + Math.round(height * 0.025)
  } else {
    currentY += Math.round(height * (isStory ? 0.07 : 0.05))
  }

  const venueBoxPadding = Math.round(width * 0.06)
  const venueText = gig.venue || 'SPELSTÄLLE'

  let venueFontSize = Math.round(width * (hasPhoto ? (isSquare ? 0.055 : 0.065) : 0.08))
  ctx.font = `${selectedFontWeight} ${venueFontSize}px ${selectedFontStack}`
  while (ctx.measureText(venueText.toUpperCase()).width > width - venueBoxPadding * 2 && venueFontSize > 22) {
    venueFontSize -= 2
    ctx.font = `${selectedFontWeight} ${venueFontSize}px ${selectedFontStack}`
  }

  const venueBannerHeight = Math.round(venueFontSize * 1.6)
  const venueBannerY = currentY
  const venueBannerW = width - (innerMargin + 16) * 2
  const venueBannerX = innerMargin + 16

  ctx.fillStyle = theme.tagBg
  ctx.fillRect(venueBannerX, venueBannerY, venueBannerW, venueBannerHeight)
  ctx.strokeStyle = theme.primary
  ctx.lineWidth = Math.round(width * 0.0035)
  ctx.strokeRect(venueBannerX, venueBannerY, venueBannerW, venueBannerHeight)

  ctx.strokeStyle = theme.paperTint
  ctx.lineWidth = Math.round(width * 0.001)
  ctx.strokeRect(venueBannerX + 4, venueBannerY + 4, venueBannerW - 8, venueBannerHeight - 8)

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${selectedFontWeight} ${venueFontSize}px ${selectedFontStack}`
  ctx.fillStyle = theme.primary
  ctx.fillText(venueText.toUpperCase(), width / 2, venueBannerY + venueBannerHeight / 2)
  ctx.restore()

  currentY = venueBannerY + venueBannerHeight + Math.round(height * (isStory ? 0.038 : isSquare ? 0.028 : 0.034))
  const cityText = gig.city || 'SVERIGE'
  const cityFontSize = Math.round(width * (hasPhoto ? 0.042 : 0.052))

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${selectedFontWeight} ${cityFontSize}px ${selectedFontStack}`
  ctx.fillStyle = theme.secondary
  ctx.letterSpacing = '0.22em'
  ctx.fillText(`★   ${cityText.toUpperCase()}   ★`, width / 2, currentY)
  ctx.restore()

  currentY += Math.round(height * (hasPhoto ? (isStory ? 0.052 : 0.046) : 0.06))
  const dateStr = formatGigDate(gig.date)
  const timeStr = formatGigTime(gig.date)

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const dateFontSize = Math.round(width * (hasPhoto ? 0.036 : 0.044))
  ctx.font = `${selectedFontWeight} ${dateFontSize}px ${selectedFontStack}`
  ctx.fillStyle = theme.accent
  ctx.letterSpacing = '0.08em'
  ctx.fillText(dateStr, width / 2, currentY)
  ctx.restore()

  if (timeStr) {
    currentY += Math.round(height * (hasPhoto ? 0.034 : 0.038))
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const timeFontSize = Math.round(width * (hasPhoto ? 0.026 : 0.032))
    ctx.font = `700 ${timeFontSize}px 'Arvo', serif`
    ctx.fillStyle = theme.secondary
    ctx.letterSpacing = '0.12em'
    ctx.fillText(`DÖRRARNA ÖPPNAR KL ${timeStr}`, width / 2, currentY)
    ctx.restore()
  }

  currentY += Math.round(height * (hasPhoto ? 0.042 : 0.05))
  const infoText =
    options.customNotes.trim() ||
    (gig.status === 'sold_out'
      ? '★ UTSÅLT! (FULLSATT HUS) ★'
      : gig.status === 'free'
        ? '★ FRI ENTRÉ • ALLA ÄR VÄLKOMNA ★'
        : 'BILJETTER & INFO PÅ WWW.SJUNDEGUNGET.SE')

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const infoFontSize = Math.round(width * (hasPhoto ? 0.026 : 0.03))
  ctx.font = `800 ${infoFontSize}px 'Arvo', sans-serif`
  ctx.fillStyle = theme.primary
  ctx.letterSpacing = '0.1em'
  ctx.fillText(infoText.toUpperCase(), width / 2, currentY)
  ctx.restore()

  currentY += Math.round(height * (isStory ? 0.038 : isSquare ? 0.025 : 0.032))
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = theme.secondary
  ctx.font = `${Math.round(width * 0.018)}px sans-serif`
  ctx.fillText('★      ★      ★', width / 2, currentY)
  ctx.restore()

  if (options.includeBandMembers) {
    const membersY = height - innerMargin - Math.round(height * (isStory ? 0.045 : isSquare ? 0.035 : 0.038))
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = theme.secondary
    ctx.font = `600 ${Math.round(width * 0.021)}px 'Inter', sans-serif`
    ctx.letterSpacing = '0.15em'
    ctx.fillText('JANIS  •  MARCUS  •  BOSSE  •  JONAS', width / 2, membersY)
    ctx.restore()
  }

  const footerY = height - innerMargin - Math.round(height * (isStory ? 0.018 : 0.015))
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = theme.primary
  ctx.font = `900 ${Math.round(width * 0.019)}px 'Alfa Slab One', 'Arvo', sans-serif`
  ctx.letterSpacing = '0.22em'
  ctx.fillText('WWW.SJUNDEGUNGET.SE', width / 2, footerY)
  ctx.restore()
}

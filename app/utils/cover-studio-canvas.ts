/**
 * Client-Side Canvas Engine för Det 7:e Gunget Cover Studio
 * 
 * Renderar autentiska 1970-tals vinylsingelomslag (45 RPM) direkt i webbläsaren.
 * Garanterar 100% pålitlig typografi, noll server-beroenden på saknade typsnitt
 * eller Vercel Lambda-begränsningar, och ger omedelbar (0.02s) förhandsgranskning.
 */

export interface RenderCoverOptions {
  title: string
  bandName?: string
  subtitle?: string
  catalogNumber?: string
  isOriginal?: boolean
  originalArtist?: string
  layout: 'top_bottom' | 'diagonal_sash' | 'sidebar_modern' | 'poster_frame' | 'center_badge' | 'auto'
  stylePreset: 'auto' | 'sonet_gold' | 'chess_crimson' | 'stax_amber' | 'bluenote_navy' | 'vintage_cream' | 'harvest_green' | 'monochrome_accent'
  agingEffect: 'none' | 'ringwear' | 'worn_cardboard' | 'both'
  photoFilter: 'natural' | 'vintage_warm' | 'bw' | 'punchy'
  badgeFormat: '45_rpm' | 'stereo' | 'mono'
  sourceImageUrl: string
}

export interface RenderCoverResult {
  dataUrl: string
  blob: Blob
  chosenStyle: string
  chosenLayout: string
  chosenAging: string
}

interface ThemePalette {
  name: string
  primary: string
  secondary: string
  accent: string
  darkBg1: string
  darkBg2: string
  seriesTag: string
  fontFamilyTitle: string
  fontFamilyBand: string
}

const PALETTES: Record<string, ThemePalette> = {
  sonet_gold: {
    name: 'Sonet Guld',
    primary: '#f59e0b',
    secondary: '#fef08a',
    accent: '#b45309',
    darkBg1: '#0a0705',
    darkBg2: '#18110b',
    seriesTag: '★ SONET GRAMMOFON • 45 RPM ★',
    fontFamilyTitle: 'Impact, "Arial Black", sans-serif',
    fontFamilyBand: 'Impact, "Arial Black", sans-serif',
  },
  chess_crimson: {
    name: 'Chess Crimson',
    primary: '#ef4444',
    secondary: '#fef3c7',
    accent: '#7f1d1d',
    darkBg1: '#0d0403',
    darkBg2: '#3b0707',
    seriesTag: '★ CHESS BLUES SERIES ★',
    fontFamilyTitle: 'Georgia, "Times New Roman", serif',
    fontFamilyBand: 'Georgia, "Times New Roman", serif',
  },
  stax_amber: {
    name: 'Stax Amber',
    primary: '#f97316',
    secondary: '#fed7aa',
    accent: '#7c2d12',
    darkBg1: '#140702',
    darkBg2: '#451a03',
    seriesTag: '★ STAX / VOLT SOUL-BLUES ★',
    fontFamilyTitle: '"Trebuchet MS", "Arial Black", sans-serif',
    fontFamilyBand: '"Trebuchet MS", "Arial Black", sans-serif',
  },
  bluenote_navy: {
    name: 'Blue Note Midnight',
    primary: '#38bdf8',
    secondary: '#bae6fd',
    accent: '#0284c7',
    darkBg1: '#030712',
    darkBg2: '#082f49',
    seriesTag: 'BLUE NOTE MIDNIGHT SESSION',
    fontFamilyTitle: '"Helvetica Neue", Arial, sans-serif',
    fontFamilyBand: '"Helvetica Neue", Arial, sans-serif',
  },
  vintage_cream: {
    name: 'Sepia Vintage',
    primary: '#fbbf24',
    secondary: '#fef3c7',
    accent: '#78350f',
    darkBg1: '#0f0c08',
    darkBg2: '#291e10',
    seriesTag: '— VINTAGE RECORD ARCHIVE —',
    fontFamilyTitle: 'Palatino, Georgia, serif',
    fontFamilyBand: 'Palatino, Georgia, serif',
  },
  harvest_green: {
    name: 'Harvest Roots',
    primary: '#22c55e',
    secondary: '#bbf7d0',
    accent: '#14532d',
    darkBg1: '#041108',
    darkBg2: '#064e3b',
    seriesTag: '★ HARVEST ROOTS & BLUES ★',
    fontFamilyTitle: 'Rockwell, "Courier New", serif',
    fontFamilyBand: 'Rockwell, Georgia, serif',
  },
  monochrome_accent: {
    name: 'Mono Deluxe',
    primary: '#f1f5f9',
    secondary: '#fbbf24',
    accent: '#334155',
    darkBg1: '#020617',
    darkBg2: '#0f172a',
    seriesTag: '• MONO DELUXE EDITION •',
    fontFamilyTitle: '"Arial Black", sans-serif',
    fontFamilyBand: '"Arial Black", sans-serif',
  },
}

const AVAILABLE_STYLES = ['sonet_gold', 'chess_crimson', 'stax_amber', 'bluenote_navy', 'vintage_cream', 'harvest_green', 'monochrome_accent']
const AVAILABLE_LAYOUTS = ['top_bottom', 'diagonal_sash', 'sidebar_modern', 'poster_frame', 'center_badge']

/**
 * Laddar en bild asynkront med crossOrigin-stöd.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(new Error(`Kunde inte ladda bild från ${src}: ${e}`))
    img.src = src
  })
}

/**
 * Hjälpfunktion för att rita en rundad rektangel i Canvas 2D
 */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2
  if (h < 2 * r) r = h / 2
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * Huvudfunktion: Komponerar singelomslaget på Canvas
 */
export async function renderCoverStudioCanvas(options: RenderCoverOptions): Promise<RenderCoverResult> {
  const width = 1000
  const height = 1000

  // 1. Skapa off-screen canvas
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Kunde inte initiera Canvas 2D context')
  }

  // 2. Avgör automatisk stil & layout om 'auto' är valt
  const titleSeed = (options.title || 'det-7e-gunget')
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0)

  let chosenStyle = options.stylePreset
  if (!chosenStyle || chosenStyle === 'auto') {
    chosenStyle = AVAILABLE_STYLES[titleSeed % AVAILABLE_STYLES.length] as any
  }
  const palette = PALETTES[chosenStyle] || PALETTES.sonet_gold!

  let chosenLayout = options.layout
  if (!chosenLayout || chosenLayout === 'auto') {
    chosenLayout = AVAILABLE_LAYOUTS[titleSeed % AVAILABLE_LAYOUTS.length] as any
  }

  const chosenAging = options.agingEffect || 'ringwear'

  // 3. Ladda källbilden
  const img = await loadImage(options.sourceImageUrl)

  // 4. Rita basbild (cover fit, centrerad)
  const imgAspect = img.width / img.height
  let drawW = width
  let drawH = height
  let drawX = 0
  let drawY = 0

  if (imgAspect > 1) {
    drawW = height * imgAspect
    drawX = (width - drawW) / 2
  } else {
    drawH = width / imgAspect
    drawY = (height - drawH) / 2
  }

  // Tillämpa fotofilter
  ctx.save()
  if (options.photoFilter === 'bw') {
    ctx.filter = 'grayscale(100%) contrast(115%) brightness(95%)'
  } else if (options.photoFilter === 'vintage_warm') {
    ctx.filter = 'sepia(35%) contrast(108%) saturate(125%)'
  } else if (options.photoFilter === 'punchy') {
    ctx.filter = 'saturate(145%) contrast(110%) brightness(102%)'
  } else {
    ctx.filter = 'contrast(104%) brightness(98%)'
  }
  ctx.drawImage(img, drawX, drawY, drawW, drawH)
  ctx.restore()

  // 5. Text- och metadatasträngar
  const bandName = options.bandName || 'DET 7:e GUNGET'
  const rawTitle = (options.title || 'Det 7:e Gunget').toUpperCase()
  let subtitle = (options.subtitle || '').trim().toUpperCase()
  if (!subtitle) {
    if (options.isOriginal) {
      subtitle = 'ORIGINALKOMPOSITION • DET 7:e GUNGET'
    } else if (options.originalArtist) {
      subtitle = `COVER AV ${options.originalArtist.toUpperCase()}`
    } else {
      subtitle = 'SKANDINAVISK BLUESROCK'
    }
  }

  const catalogNum = (options.catalogNumber || `D7G-45-${Math.floor(Math.random() * 899 + 100)}`).toUpperCase()

  let badgeLabel = '45 RPM'
  if (options.badgeFormat === 'stereo') badgeLabel = 'STEREO'
  else if (options.badgeFormat === 'mono') badgeLabel = 'MONO'

  // 6. RITA LAYOUT-ELEMENT & TYPOGRAFI
  ctx.save()

  // Textskugga-inställning
  const applyTextShadow = () => {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetX = 3
    ctx.shadowOffsetY = 3
  }
  const clearTextShadow = () => {
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  }

  // --------------------------------------------------------------------------
  // LAYOUT 1: TOP & BOTTOM BANNERS (Classic 70s Record Sleeve)
  // --------------------------------------------------------------------------
  if (chosenLayout === 'top_bottom') {
    // Top gradient
    const topGrad = ctx.createLinearGradient(0, 0, 0, 220)
    topGrad.addColorStop(0, 'rgba(10, 7, 5, 0.97)')
    topGrad.addColorStop(0.7, 'rgba(24, 17, 11, 0.82)')
    topGrad.addColorStop(1, 'rgba(24, 17, 11, 0)')
    ctx.fillStyle = topGrad
    ctx.fillRect(0, 0, width, 220)

    // Bottom gradient
    const botGrad = ctx.createLinearGradient(0, height, 0, height - 230)
    botGrad.addColorStop(0, 'rgba(10, 7, 5, 0.98)')
    botGrad.addColorStop(0.7, 'rgba(24, 17, 11, 0.85)')
    botGrad.addColorStop(1, 'rgba(24, 17, 11, 0)')
    ctx.fillStyle = botGrad
    ctx.fillRect(0, height - 230, width, 230)

    // Outer double borders
    ctx.strokeStyle = palette.primary
    ctx.lineWidth = 3
    ctx.globalAlpha = 0.85
    roundRect(ctx, 18, 18, width - 36, height - 36, 8)
    ctx.stroke()

    ctx.strokeStyle = palette.secondary
    ctx.lineWidth = 1.2
    ctx.globalAlpha = 0.35
    roundRect(ctx, 26, 26, width - 52, height - 52, 6)
    ctx.stroke()
    ctx.globalAlpha = 1.0

    // Top Right Speed Badge
    const badgeX = width - 160
    const badgeY = 36
    ctx.fillStyle = palette.accent
    roundRect(ctx, badgeX, badgeY, 120, 38, 8)
    ctx.fill()
    ctx.strokeStyle = palette.secondary
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = '900 14px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(badgeLabel, badgeX + 60, badgeY + 24)

    // Top Left Catalog Stamp
    ctx.fillStyle = palette.secondary
    ctx.font = '700 13px "Courier New", monospace'
    ctx.textAlign = 'left'
    ctx.fillText(catalogNum, 44, 60)

    // Band Name (Top Center)
    applyTextShadow()
    ctx.fillStyle = palette.secondary
    ctx.font = `900 56px ${palette.fontFamilyBand}`
    ctx.textAlign = 'center'
    ctx.fillText(bandName, width / 2, 98)

    // Series Subtitle Tag
    clearTextShadow()
    ctx.fillStyle = palette.primary
    ctx.font = '700 13px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(palette.seriesTag, width / 2, 134)

    // Bottom: Song Title & Subtitle
    applyTextShadow()
    ctx.fillStyle = '#ffffff'
    const dynamicTitleSize = rawTitle.length > 28 ? 36 : rawTitle.length > 18 ? 44 : 54
    ctx.font = `900 ${dynamicTitleSize}px ${palette.fontFamilyTitle}`
    ctx.textAlign = 'center'
    ctx.fillText(rawTitle, width / 2, height - 92)

    clearTextShadow()
    ctx.fillStyle = palette.primary
    ctx.font = '700 14px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(subtitle, width / 2, height - 52)
  }

  // --------------------------------------------------------------------------
  // LAYOUT 2: DIAGONAL RETRO SASH (Hörnbanderoll)
  // --------------------------------------------------------------------------
  else if (chosenLayout === 'diagonal_sash') {
    // Bottom shading
    const botGrad = ctx.createLinearGradient(0, height, 0, height - 190)
    botGrad.addColorStop(0, 'rgba(10, 4, 3, 0.96)')
    botGrad.addColorStop(1, 'rgba(10, 4, 3, 0)')
    ctx.fillStyle = botGrad
    ctx.fillRect(0, height - 190, width, 190)

    // Angled ribbon across top-left
    ctx.save()
    ctx.translate(-70, 110)
    ctx.rotate((-28 * Math.PI) / 180)

    ctx.fillStyle = palette.accent
    ctx.fillRect(0, 0, 520, 75)
    ctx.strokeStyle = palette.secondary
    ctx.lineWidth = 3
    ctx.strokeRect(0, 0, 520, 75)

    ctx.fillStyle = palette.secondary
    ctx.font = `900 28px ${palette.fontFamilyBand}`
    ctx.textAlign = 'center'
    ctx.fillText(bandName, 260, 48)

    ctx.restore()

    // Outer border
    ctx.strokeStyle = palette.primary
    ctx.lineWidth = 3
    roundRect(ctx, 16, 16, width - 32, height - 32, 6)
    ctx.stroke()

    // Top Right Badges
    ctx.fillStyle = palette.darkBg1
    roundRect(ctx, width - 150, 32, 118, 54, 8)
    ctx.fill()
    ctx.strokeStyle = palette.primary
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = palette.secondary
    ctx.font = '900 12px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(badgeLabel, width - 91, 53)
    ctx.fillStyle = palette.primary
    ctx.font = '700 10px "Courier New", monospace'
    ctx.fillText(catalogNum, width - 91, 72)

    // Bottom Song Title
    applyTextShadow()
    ctx.fillStyle = '#ffffff'
    const dynamicTitleSize = rawTitle.length > 25 ? 38 : 50
    ctx.font = `900 ${dynamicTitleSize}px ${palette.fontFamilyTitle}`
    ctx.textAlign = 'center'
    ctx.fillText(rawTitle, width / 2, height - 76)

    clearTextShadow()
    ctx.fillStyle = palette.primary
    ctx.font = '700 14px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(subtitle, width / 2, height - 42)
  }

  // --------------------------------------------------------------------------
  // LAYOUT 3: SIDEBAR MODERN (Blue Note modernistisk vänsterkolumn)
  // --------------------------------------------------------------------------
  else if (chosenLayout === 'sidebar_modern') {
    const colWidth = 260

    // Dark solid left sidebar
    ctx.fillStyle = palette.darkBg1
    ctx.fillRect(0, 0, colWidth, height)

    // Inner dividing line
    ctx.strokeStyle = palette.primary
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(colWidth, 0)
    ctx.lineTo(colWidth, height)
    ctx.stroke()

    // Outer border
    ctx.strokeStyle = palette.primary
    ctx.lineWidth = 2.5
    roundRect(ctx, 14, 14, width - 28, height - 28, 4)
    ctx.stroke()

    // Sidebar Content
    ctx.fillStyle = palette.primary
    ctx.font = '900 11px "Courier New", monospace'
    ctx.textAlign = 'left'
    ctx.fillText(catalogNum, 26, 44)

    ctx.fillStyle = palette.secondary
    ctx.font = `900 24px ${palette.fontFamilyBand}`
    ctx.fillText('DET 7:e', 26, 80)
    ctx.fillText('GUNGET', 26, 110)

    ctx.strokeStyle = palette.accent
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(26, 130)
    ctx.lineTo(colWidth - 26, 130)
    ctx.stroke()

    // Badge
    ctx.fillStyle = palette.accent
    roundRect(ctx, 26, 150, 96, 30, 6)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 12px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(badgeLabel, 74, 170)

    // Bottom Track Info in Sidebar
    ctx.fillStyle = palette.secondary
    ctx.font = '700 11px "Courier New", monospace'
    ctx.textAlign = 'left'
    ctx.fillText('★ 7"-SINGEL ★', 26, height - 90)
    ctx.fillText('MALMÖ • SWEDEN', 26, height - 70)

    // Main Area Title Overlay (Bottom Right)
    const titleBgGrad = ctx.createLinearGradient(0, height, 0, height - 160)
    titleBgGrad.addColorStop(0, 'rgba(3, 7, 18, 0.95)')
    titleBgGrad.addColorStop(1, 'rgba(3, 7, 18, 0)')
    ctx.fillStyle = titleBgGrad
    ctx.fillRect(colWidth, height - 160, width - colWidth, 160)

    applyTextShadow()
    ctx.fillStyle = '#ffffff'
    const dynamicTitleSize = rawTitle.length > 22 ? 38 : 48
    ctx.font = `900 ${dynamicTitleSize}px ${palette.fontFamilyTitle}`
    ctx.textAlign = 'center'
    ctx.fillText(rawTitle, colWidth + (width - colWidth) / 2, height - 72)

    clearTextShadow()
    ctx.fillStyle = palette.primary
    ctx.font = '700 13px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(subtitle, colWidth + (width - colWidth) / 2, height - 40)
  }

  // --------------------------------------------------------------------------
  // LAYOUT 4: POSTER FRAME (Minimalistisk utställningsram med plakett)
  // --------------------------------------------------------------------------
  else if (chosenLayout === 'poster_frame') {
    // Top & bottom subtle gradient
    const topG = ctx.createLinearGradient(0, 0, 0, 150)
    topG.addColorStop(0, 'rgba(10, 5, 2, 0.92)')
    topG.addColorStop(1, 'rgba(10, 5, 2, 0)')
    ctx.fillStyle = topG
    ctx.fillRect(0, 0, width, 150)

    // Outer double geometric frame
    ctx.strokeStyle = palette.primary
    ctx.lineWidth = 3.5
    roundRect(ctx, 22, 22, width - 44, height - 44, 4)
    ctx.stroke()

    ctx.strokeStyle = palette.secondary
    ctx.lineWidth = 1.2
    ctx.globalAlpha = 0.4
    roundRect(ctx, 32, 32, width - 64, height - 64, 2)
    ctx.stroke()
    ctx.globalAlpha = 1.0

    // Top Header
    applyTextShadow()
    ctx.fillStyle = palette.secondary
    ctx.font = `900 42px ${palette.fontFamilyBand}`
    ctx.textAlign = 'center'
    ctx.fillText(bandName, width / 2, 78)

    clearTextShadow()
    ctx.fillStyle = palette.primary
    ctx.font = '700 13px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`— ${catalogNum} • ${badgeLabel} —`, width / 2, 106)

    // Bottom Plaque Box
    const plaqueW = width - 150
    const plaqueH = 100
    const plaqueX = 75
    const plaqueY = height - 145

    ctx.fillStyle = palette.darkBg1
    ctx.globalAlpha = 0.92
    roundRect(ctx, plaqueX, plaqueY, plaqueW, plaqueH, 6)
    ctx.fill()
    ctx.globalAlpha = 1.0

    ctx.strokeStyle = palette.primary
    ctx.lineWidth = 2
    ctx.stroke()

    applyTextShadow()
    ctx.fillStyle = '#ffffff'
    const dynamicTitleSize = rawTitle.length > 24 ? 34 : 44
    ctx.font = `900 ${dynamicTitleSize}px ${palette.fontFamilyTitle}`
    ctx.textAlign = 'center'
    ctx.fillText(rawTitle, width / 2, plaqueY + 52)

    clearTextShadow()
    ctx.fillStyle = palette.secondary
    ctx.font = '700 13px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(subtitle, width / 2, plaqueY + 80)
  }

  // --------------------------------------------------------------------------
  // LAYOUT 5: CENTER BADGE (Vinyl Rondell / Rund etikett i mitten)
  // --------------------------------------------------------------------------
  else if (chosenLayout === 'center_badge') {
    // Top banner
    const topG = ctx.createLinearGradient(0, 0, 0, 130)
    topG.addColorStop(0, 'rgba(5, 5, 5, 0.95)')
    topG.addColorStop(1, 'rgba(5, 5, 5, 0)')
    ctx.fillStyle = topG
    ctx.fillRect(0, 0, width, 130)

    // Perimeter border
    ctx.strokeStyle = palette.primary
    ctx.lineWidth = 3
    roundRect(ctx, 20, 20, width - 40, height - 40, 6)
    ctx.stroke()

    // Top Band Ribbon
    applyTextShadow()
    ctx.fillStyle = palette.secondary
    ctx.font = `900 44px ${palette.fontFamilyBand}`
    ctx.textAlign = 'center'
    ctx.fillText(bandName, width / 2, 70)

    clearTextShadow()
    ctx.fillStyle = palette.primary
    ctx.font = '700 13px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.fillText('★ ÄKTA SKANDINAVISK BLUESROCK ★', width / 2, 98)

    // Center Vinyl Label
    const centerX = 500
    const centerY = 530
    const radius = 175

    ctx.save()
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fillStyle = palette.darkBg1
    ctx.globalAlpha = 0.95
    ctx.fill()
    ctx.globalAlpha = 1.0

    ctx.strokeStyle = palette.primary
    ctx.lineWidth = 4
    ctx.stroke()

    // Inner concentric circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius - 14, 0, Math.PI * 2)
    ctx.strokeStyle = palette.secondary
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.5
    ctx.stroke()

    // Center spindle hole
    ctx.beginPath()
    ctx.arc(centerX, centerY, 20, 0, Math.PI * 2)
    ctx.fillStyle = '#000000'
    ctx.fill()
    ctx.strokeStyle = palette.secondary
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.globalAlpha = 1.0

    // Rondell text
    ctx.fillStyle = palette.primary
    ctx.font = '900 12px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(catalogNum, centerX, centerY - 105)

    ctx.fillStyle = palette.secondary
    ctx.font = `900 17px ${palette.fontFamilyBand}`
    ctx.fillText('DET 7:e GUNGET', centerX, centerY - 76)

    // Dividing bar
    ctx.strokeStyle = palette.primary
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(centerX - 110, centerY - 55)
    ctx.lineTo(centerX + 110, centerY - 55)
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = '900 13px "Courier New", monospace'
    ctx.fillText(`${badgeLabel} • SIDA ${options.isOriginal ? 'A' : 'B'}`, centerX, centerY - 28)

    // Song Title
    ctx.fillStyle = '#ffffff'
    const dynamicTitleSize = rawTitle.length > 20 ? 26 : 32
    ctx.font = `900 ${dynamicTitleSize}px ${palette.fontFamilyTitle}`
    ctx.fillText(rawTitle, centerX, centerY + 65)

    ctx.fillStyle = palette.secondary
    ctx.font = '700 11px "Courier New", monospace'
    ctx.fillText(subtitle.slice(0, 36), centerX, centerY + 96)

    ctx.restore()
  }

  // --------------------------------------------------------------------------
  // 7. VINYLPATINA & SLITAGE (Ringwear / Cardboard wear)
  // --------------------------------------------------------------------------
  if (chosenAging === 'ringwear' || chosenAging === 'both') {
    ctx.save()
    // Yttre slitagecirkel (Ringwear från skivan inuti fodralet)
    ctx.beginPath()
    ctx.arc(500, 500, 420, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.11)'
    ctx.lineWidth = 32
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(500, 500, 420, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.24)'
    ctx.lineWidth = 14
    ctx.stroke()

    // Inre cirkel
    ctx.beginPath()
    ctx.arc(500, 500, 180, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 16
    ctx.stroke()
    ctx.restore()
  }

  if (chosenAging === 'worn_cardboard' || chosenAging === 'both') {
    ctx.save()
    // Kantslitage / Vinjett
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.lineWidth = 26
    ctx.strokeRect(0, 0, width, height)

    // Hörnveck (diagonala streck som visar 50 års kärlek)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'
    ctx.lineWidth = 2
    ctx.beginPath()
    // Top-left
    ctx.moveTo(12, 75)
    ctx.lineTo(75, 12)
    // Top-right
    ctx.moveTo(width - 75, 12)
    ctx.lineTo(width - 12, 75)
    // Bottom-left
    ctx.moveTo(12, height - 75)
    ctx.lineTo(75, height - 12)
    // Bottom-right
    ctx.moveTo(width - 75, height - 12)
    ctx.lineTo(width - 12, height - 75)
    ctx.stroke()
    ctx.restore()
  }

  ctx.restore()

  // 8. Konvertera canvas till dataUrl och Blob
  const dataUrl = canvas.toDataURL('image/jpeg', 0.94)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b)
      else reject(new Error('Kunde inte skapa bild-blob från Canvas'))
    }, 'image/jpeg', 0.94)
  })

  return {
    dataUrl,
    blob,
    chosenStyle,
    chosenLayout,
    chosenAging,
  }
}

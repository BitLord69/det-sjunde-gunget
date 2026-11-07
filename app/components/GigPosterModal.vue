<script setup lang="ts">
interface GigPosterItem {
  id: string
  venue: string
  city: string
  date: string | number | Date
  status?: string | null
  posterUrl?: string | null
}

interface GalleryPhotoItem {
  id: string
  url: string
  title?: string | null
}

type PosterFontKey = 'poetsen' | 'righteous' | 'calistoga' | 'caprasimo' | 'oleo' | 'lemon' | 'rye'

interface PosterFontOption {
  key: PosterFontKey
  name: string
  label: string
  family: string
  weight: number
}

const posterFonts: PosterFontOption[] = [
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

useHead({
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Calistoga&family=Caprasimo&family=Lemon&family=Oleo+Script:wght@700&family=Poetsen+One&family=Righteous&family=Rye&display=swap',
    },
  ],
})

const props = defineProps<{
  modelValue: boolean
  gig: GigPosterItem | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'posterSaved', gigId: string, posterUrl: string): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isGenerating = ref(false)
const copyToast = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Admin auth & upload for direct Story broadcasting & saving poster
const { adminUser } = useAdminAuth()
const { uploadAdminFile } = useAdminUpload()
const isPublishingStory = ref(false)
const storyPublishResult = ref<{ success: boolean; message: string } | null>(null)
const isSavingOfficialPoster = ref(false)
const officialPosterSavedResult = ref<{ success: boolean; message: string } | null>(null)

// Fetch site gallery photos for user selection
const { data: galleryItems } = useFetch<GalleryPhotoItem[]>('/api/gallery', {
  query: { category: 'photo' },
  default: () => [],
})

// Official Band Photoshoot images
const bandPhotos = [
  {
    url: '/media/band/21..7de Gunget photoshoot1 21-6 26-3.jpg',
    title: 'Scenpose med instrument',
  },
  {
    url: '/media/band/19..7de Gunget photoshoot1 21-6 26-5.jpg',
    title: 'Hela bandet leende',
  },
  {
    url: '/media/band/17..7de Gunget photoshoot1 21-6 26-4.jpg',
    title: 'Rå live-attityd & mikrofon',
  },
  {
    url: '/media/band/10..7de Gunget photoshoot1 21-6 26-16.jpg',
    title: 'Närbild gitarrer & groove',
  },
  {
    url: '/media/band/6..7de Gunget photoshoot1 21-6 26-12.jpg',
    title: 'Klassisk 70-tals posering',
  },
  {
    url: '/media/band/2..7de Gunget photoshoot1 21-6 26-20.jpg',
    title: 'Spelglädje i studion',
  },
  {
    url: '/media/band/1..7de Gunget photoshoot1 21-6 26-21.jpg',
    title: 'Live-ögonblick & dynamik',
  },
]

// Poster Settings
const selectedTheme = ref<'sunburst' | 'sonet' | 'chess' | 'sun' | 'neon'>('sunburst')
const selectedFormat = ref<'a4' | 'story' | 'square'>('a4')
const selectedFont = ref<PosterFontKey>('poetsen')
const topPresenter = ref('')
const headline = ref('LIVE PÅ SCEN')
const subheadline = ref('ÄKTA BLUES & SVÄNGIG ROCK \'N\' ROLL')
const customNotes = ref('')
const includeBandMembers = ref(true)

const activeFontOption = computed<PosterFontOption>(() => {
  return posterFonts.find((f) => f.key === selectedFont.value) || posterFonts[0]!
})

const ensurePosterFontLoaded = async (fontOpt: PosterFontOption) => {
  if (typeof document === 'undefined' || !('fonts' in document)) return
  try {
    await document.fonts.load(`${fontOpt.weight} 48px "${fontOpt.family}"`)
  } catch {
    // Ignore font load errors and fall back gracefully
  }
}

// Band Logo & Photo Customization
const useBandLogo = ref(true)
const logoSize = ref<'normal' | 'large'>('large')
const imageSource = ref<'photoshoot' | 'gallery' | 'upload' | 'ai' | 'none'>('none')
const selectedBandPhoto = ref('/media/band/21..7de Gunget photoshoot1 21-6 26-3.jpg')
const selectedGalleryPhoto = ref('')
const customUploadedPhoto = ref<string | null>(null)
const photoFilter = ref<'vintage' | 'bw' | 'duotone' | 'natural'>('vintage')

const selectThemeOption = (key: 'sunburst' | 'sonet' | 'chess' | 'sun' | 'neon') => {
  selectedTheme.value = key
  if (key === 'sunburst') {
    imageSource.value = 'none'
  } else if (imageSource.value === 'none') {
    imageSource.value = 'photoshoot'
  }
}

// Gemini AI Poster Generator State
const aiPosterPreset = ref<'club' | 'stage' | 'folkpark' | 'rockbar' | 'chicago' | 'custom'>('club')
const aiPosterCustomPrompt = ref('')
const aiPosterIncludeBand = ref(false)
const isGeneratingPosterAi = ref(false)
const aiPosterError = ref<string | null>(null)
const aiGeneratedPosterImageUrl = ref<string | null>(null)

// Active photo URL computed
const activePhotoUrl = computed(() => {
  if (imageSource.value === 'none') return null
  if (imageSource.value === 'photoshoot') return selectedBandPhoto.value
  if (imageSource.value === 'gallery') return selectedGalleryPhoto.value || galleryItems.value?.[0]?.url || null
  if (imageSource.value === 'upload') return customUploadedPhoto.value
  if (imageSource.value === 'ai') return aiGeneratedPosterImageUrl.value
  return null
})

// Format dimensions
const dimensions = computed(() => {
  switch (selectedFormat.value) {
    case 'story':
      return { width: 1080, height: 1920, label: 'Story (9:16)' }
    case 'square':
      return { width: 1080, height: 1080, label: 'Kvadrat / Feed (1:1)' }
    case 'a4':
    default:
      return { width: 1200, height: 1600, label: 'Klassisk Affisch (3:4)' }
  }
})

// Themes styling configurations
const themes = {
  sunburst: {
    name: 'Retro Sunburst (Originalmall)',
    bg: '#2c2b31',
    paperTint: '#2c2b31',
    primary: '#dc624b', // Terracotta Sunburst Red
    secondary: '#ede8ca', // Warm Vintage Cream
    accent: '#dc624b',
    border: '#ede8ca',
    tagBg: '#232227',
    frameInner: '#1e1d22',
  },
  sonet: {
    name: 'Sonet 70s Blues',
    bg: '#14100c',
    paperTint: '#1f1814',
    primary: '#d4af37', // Vintage Gold
    secondary: '#f3e5ab', // Cream
    accent: '#c0392b', // Rust Red
    border: '#d4af37',
    tagBg: '#2a1f18',
    frameInner: '#0e0b08',
  },
  chess: {
    name: 'Chess Records Kraft',
    bg: '#f4ebd9', // Aged Parchment
    paperTint: '#eae0cc',
    primary: '#8b0000', // Deep Crimson
    secondary: '#1c1511', // Vintage Black
    accent: '#b8860b', // Dark Gold
    border: '#8b0000',
    tagBg: '#dfd2bc',
    frameInner: '#d9cdb7',
  },
  sun: {
    name: 'Sun Studio Memphis',
    bg: '#181512',
    paperTint: '#261f19',
    primary: '#f39c12', // Warm Sun Amber
    secondary: '#fdfefe', // Sharp White
    accent: '#e74c3c', // Red
    border: '#f39c12',
    tagBg: '#34271d',
    frameInner: '#120f0c',
  },
  neon: {
    name: 'Midnight Club Neon',
    bg: '#0a0a0f',
    paperTint: '#131322',
    primary: '#00e5ff', // Electric Cyan
    secondary: '#ff9100', // Amber Neon
    accent: '#ff0055', // Hot Pink
    border: '#00e5ff',
    tagBg: '#1a1a2e',
    frameInner: '#06060a',
  },
}

// Image Cache to avoid loading delays
const imageCache = new Map<string, HTMLImageElement>()

const loadImage = (src: string): Promise<HTMLImageElement> => {
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src)!)
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageCache.set(src, img)
      resolve(img)
    }
    img.onerror = (err) => reject(err)
    img.src = src
  })
}

// Helper to draw aspect-ratio cover crop
const drawCoverImage = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
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

// Handle Custom Photo Upload
const onFileUpload = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (customUploadedPhoto.value && customUploadedPhoto.value.startsWith('blob:')) {
    URL.revokeObjectURL(customUploadedPhoto.value)
  }
  customUploadedPhoto.value = URL.createObjectURL(file)
  imageSource.value = 'upload'
}

const triggerFileUpload = () => {
  fileInputRef.value?.click()
}

// Helper to fit text within a maximum width by reducing font size
const fitTextFont = (
  ctx: CanvasRenderingContext2D,
  text: string,
  initialSize: number,
  minSize: number,
  maxWidth: number,
  fontFamily: string,
  fontWeight: string | number = 900,
) => {
  let size = initialSize
  ctx.font = `${fontWeight} ${size}px ${fontFamily}`
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 2
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`
  }
  return size
}

// Helper to split a phrase into 2 balanced lines
const splitIntoTwoLines = (text: string): [string, string] => {
  const cleaned = text.trim().replace(/\s+/g, ' ')
  if (cleaned.includes('\n')) {
    const parts = cleaned.split('\n').map((s) => s.trim()).filter(Boolean)
    return [parts[0] || '', parts.slice(1).join(' ')]
  }
  const words = cleaned.split(' ')
  if (words.length <= 1) return [cleaned, '']
  if (words.length === 2) return [words[0]!, words[1]!]

  // Prefer keeping the first line slightly longer than the second line (inverted pyramid like "LIVE AT MJ'S" / "GARAGE!")
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

// Short date formatter for the Retro Sunburst template (e.g. "30 MAJ")
const formatShortGigDate = (dateVal: string | number | Date | null | undefined) => {
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

// Download the blank cleaned Retro Sunburst template without any text
const downloadBlankSunburstTemplate = async () => {
  try {
    const img = await loadImage('/media/brand/poster_template_retro_mics.webp')
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

// Render lock to avoid race conditions during fast typing
let currentRenderId = 0

// Draw the authentic vintage poster on Canvas
const drawPoster = async () => {
  const renderId = ++currentRenderId
  const canvas = canvasRef.value
  if (!canvas || !props.gig) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { width, height } = dimensions.value
  canvas.width = width
  canvas.height = height

  const fontOpt = activeFontOption.value
  await ensurePosterFontLoaded(fontOpt)
  if (renderId !== currentRenderId) return

  const selectedFontStack = `'${fontOpt.family}', 'Poetsen One', sans-serif`
  const selectedFontWeight = fontOpt.weight

  const theme = themes[selectedTheme.value]

  // Special Dedicated Renderer for the Band's Original "Retro Sunburst & Mics" Template
  if (selectedTheme.value === 'sunburst') {
    let templateImg: HTMLImageElement | null = null
    try {
      templateImg = await loadImage('/media/brand/poster_template_retro_mics.webp')
    } catch {
      templateImg = null
    }

    let photoImg: HTMLImageElement | null = null
    const photoUrlToLoad = activePhotoUrl.value
    if (photoUrlToLoad) {
      try {
        photoImg = await loadImage(photoUrlToLoad)
      } catch {
        photoImg = null
      }
    }

    if (renderId !== currentRenderId) return

    const isStory = selectedFormat.value === 'story'
    const isSquare = selectedFormat.value === 'square'
    const creamColor = '#ede8ca'
    const softCreamColor = '#ece6d6'
    const darkCharcoal = '#2c2b31'

    // 1. Fill base dark charcoal background
    ctx.fillStyle = darkCharcoal
    ctx.fillRect(0, 0, width, height)

    let topSectionBottomY = Math.round(height * 0.62)

    if (templateImg) {
      // Template source dimensions: 723 x 1024
      // Top section (sunburst + skyline + round Det 7nde Gunget emblem): y = 0..645
      // Bottom section (left & right vintage microphones + sound rays): y = 685..1024
      if (isSquare) {
        // For 1:1 Square (1080x1080): scale top section slightly so round emblem stays circular and leaves room below
        const topCropY = 48
        const topCropH = 597 // ends at y=645
        const topScale = (height * 0.58) / topCropH
        const drawTopW = Math.round(templateImg.width * topScale)
        const drawTopH = Math.round(topCropH * topScale)
        const drawTopX = Math.round((width - drawTopW) / 2)

        // Extend side background for square
        ctx.drawImage(templateImg, 0, topCropY, templateImg.width, topCropH, 0, 0, width, drawTopH)
        ctx.drawImage(templateImg, 0, topCropY, templateImg.width, topCropH, drawTopX, 0, drawTopW, drawTopH)
        topSectionBottomY = drawTopH

        // Draw bottom corner mics scaled to 0.72 in bottom-left and bottom-right corners
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
        // For A4 (1200x1600) and Story (1080x1920): full width 1:1 proportional top & bottom sections
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

    // 2. Optional Top Presenter Line in Sunburst Rays (e.g. "PUB 666 PRESENTS")
    if (topPresenter.value.trim()) {
      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const presFontSize = Math.round(width * (isSquare ? 0.02 : 0.023))
      ctx.font = `${selectedFontWeight} ${presFontSize}px ${selectedFontStack}`
      ctx.fillStyle = '#232227'
      ctx.letterSpacing = '0.06em'
      const presY = Math.round(topSectionBottomY * (isSquare ? 0.075 : 0.115))
      ctx.fillText(topPresenter.value.trim().toUpperCase(), width / 2, presY)
      ctx.restore()
    }

    // 3. Optional Photo (if user explicitly selected a photo source in sunburst mode)
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
      if (photoFilter.value === 'vintage') {
        ctx.filter = 'sepia(0.55) contrast(1.15) brightness(0.95)'
      } else if (photoFilter.value === 'bw') {
        ctx.filter = 'grayscale(1) contrast(1.25)'
      } else if (photoFilter.value === 'duotone') {
        ctx.filter = 'grayscale(1) contrast(1.2)'
      }
      drawCoverImage(ctx, photoImg, photoX, photoY, photoW, maxPhotoH)
      ctx.restore()

      ctx.strokeStyle = creamColor
      ctx.lineWidth = Math.round(width * 0.004)
      ctx.strokeRect(photoX, photoY, photoW, maxPhotoH)

      textZoneStartY = photoY + maxPhotoH + Math.round(height * 0.02)
    } else if (isStory) {
      // Extra breathing space in 9:16 Story mode when no photo is used
      textZoneStartY = topSectionBottomY + Math.round(height * 0.065)
    }

    // 4. Main 2-Line Venue Callout ("LIVE AT MJ'S" / "GARAGE!")
    const rawHeadline = headline.value.trim()
    const effectivePrefix =
      rawHeadline.toUpperCase() === 'LIVE PÅ SCEN'
        ? 'LIVE PÅ'
        : rawHeadline
    const rawVenue = (props.gig.venue || 'SPELSTÄLLE').trim()
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

    // 5. Date, Time/Address & City Block ("MAY 30 / IDROTTSGATAN 11 / ÄNGELHOLM")
    const shortDateStr = formatShortGigDate(props.gig.date)
    const timeStr = formatGigTime(props.gig.date)
    const rawSub = subheadline.value.trim()
    const isDefaultSub = rawSub.toUpperCase() === 'ÄKTA BLUES & SVÄNGIG ROCK \'N\' ROLL'
    const middleDetailLine = !isDefaultSub && rawSub
      ? rawSub.toUpperCase()
      : timeStr
        ? `KL ${timeStr}`
        : ''
    const cityStr = (props.gig.city || 'ÄNGELHOLM').trim().toUpperCase()

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

    // 6. Bottom Extra Notes / Party Tagline between the two microphones ("BBQ, LIVE MUSIC, KARAOKE / PARTY TILL YOU DROP!")
    const rawNotes = customNotes.value.trim()
    let botLine1 = ''
    let botLine2 = ''

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
        botLine2 = includeBandMembers.value ? 'WWW.SJUNDEGUNGET.SE' : ''
      }
    } else {
      botLine1 = props.gig.status === 'sold_out'
        ? 'UTSÅLT • FULLSATT HUS!'
        : props.gig.status === 'free'
          ? 'FRI ENTRÉ • LIVE BLUES & ROCK'
          : 'LIVE BLUES & SVÄNGIG ROCK'
      botLine2 = includeBandMembers.value
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

  // 1. Background
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, width, height)

  // Subtle radial paper gradient for vintage depth
  const grad = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width * 0.8)
  grad.addColorStop(0, theme.paperTint)
  grad.addColorStop(1, theme.bg)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  // 2. Vintage Ornate Border Frame
  const margin = Math.round(width * 0.038)
  ctx.strokeStyle = theme.border
  ctx.lineWidth = Math.round(width * 0.006)
  ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2)

  // Inner hairline border
  const innerMargin = margin + Math.round(width * 0.014)
  ctx.lineWidth = Math.round(width * 0.002)
  ctx.strokeRect(innerMargin, innerMargin, width - innerMargin * 2, height - innerMargin * 2)

  // Corner flourishes
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

  // Pre-load band logo if enabled
  let logoImg: HTMLImageElement | null = null
  if (useBandLogo.value) {
    try {
      logoImg = await loadImage('/media/brand/Logotyp.webp')
    } catch {
      logoImg = null
    }
  }

  // Pre-load photo if chosen
  let photoImg: HTMLImageElement | null = null
  const photoUrlToLoad = activePhotoUrl.value
  if (photoUrlToLoad) {
    try {
      photoImg = await loadImage(photoUrlToLoad)
    } catch {
      photoImg = null
    }
  }

  // If a newer render has started while loading images, cancel this run
  if (renderId !== currentRenderId) return

  const hasPhoto = Boolean(photoImg)
  const isStory = selectedFormat.value === 'story'
  const isSquare = selectedFormat.value === 'square'

  // 3. Top Callout Tagline ("★ LIVE PÅ SCEN ★")
  let currentY = margin + Math.round(height * (isStory ? 0.045 : 0.04))
  ctx.textAlign = 'center'

  if (headline.value.trim()) {
    ctx.font = `${selectedFontWeight} ${Math.round(width * (isSquare ? 0.032 : 0.035))}px ${selectedFontStack}`
    ctx.fillStyle = theme.accent
    ctx.letterSpacing = '0.22em'
    ctx.fillText(`★  ${headline.value.trim().toUpperCase()}  ★`, width / 2, currentY)
  }

  // 4. Band Brand: Official Logo or Big Typography
  if (useBandLogo.value && logoImg) {
    const isLarge = logoSize.value === 'large'
    // Ge bandlogotypen en ståtlig storlek så att detaljerna och namnet syns tydligt
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

    // På ljust papper (Chess), lägg till en mjuk skugga för optimal kontrast
    if (selectedTheme.value === 'chess') {
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
    // Typography fallback or user opted for plain typography
    currentY += Math.round(height * (hasPhoto ? 0.065 : 0.08))
    ctx.fillStyle = theme.primary
    ctx.font = `${selectedFontWeight} ${Math.round(width * (hasPhoto ? 0.08 : 0.095))}px ${selectedFontStack}`
    ctx.letterSpacing = '0.04em'
    ctx.fillText('DET 7:e GUNGET', width / 2, currentY)
    currentY += Math.round(height * 0.01)
  }

  // Subtitle / Musical genres
  if (subheadline.value.trim()) {
    currentY += Math.round(height * (hasPhoto ? 0.022 : 0.03))
    ctx.fillStyle = theme.secondary
    ctx.font = `700 ${Math.round(width * (hasPhoto ? 0.02 : 0.025))}px 'Arvo', serif`
    ctx.letterSpacing = '0.18em'
    ctx.fillText(subheadline.value.trim().toUpperCase(), width / 2, currentY)
  }

  // Small ornamental divider before photo/venue
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

  // 5. Photo Section (if photo active)
  if (hasPhoto && photoImg) {
    currentY += Math.round(height * 0.018)
    const photoW = Math.round(width * 0.82)
    const photoH = Math.round(
      height * (isStory ? 0.38 : isSquare ? 0.28 : 0.34),
    )
    const photoX = (width - photoW) / 2
    const photoY = currentY

    // Frame Passepartout & Background
    ctx.fillStyle = theme.frameInner
    ctx.fillRect(photoX, photoY, photoW, photoH)

    // Save context for clipping & filter application
    ctx.save()
    ctx.beginPath()
    ctx.rect(photoX, photoY, photoW, photoH)
    ctx.clip()

    // Apply Filter
    if (photoFilter.value === 'vintage') {
      ctx.filter = 'sepia(0.6) contrast(1.18) brightness(0.96) saturate(1.15)'
    } else if (photoFilter.value === 'bw') {
      ctx.filter = 'grayscale(1) contrast(1.3) brightness(0.95)'
    } else if (photoFilter.value === 'duotone') {
      ctx.filter = 'grayscale(1) contrast(1.25)'
    } else {
      ctx.filter = 'contrast(1.05) saturate(1.08)'
    }

    drawCoverImage(ctx, photoImg, photoX, photoY, photoW, photoH)

    // Extra duotone overlay layer if chosen
    if (photoFilter.value === 'duotone') {
      ctx.filter = 'none'
      ctx.globalCompositeOperation = 'multiply'
      ctx.fillStyle = theme.primary
      ctx.fillRect(photoX, photoY, photoW, photoH)
    }

    ctx.restore()

    // Outer double photo frame border
    ctx.strokeStyle = theme.primary
    ctx.lineWidth = Math.round(width * 0.004)
    ctx.strokeRect(photoX, photoY, photoW, photoH)

    ctx.strokeStyle = theme.paperTint
    ctx.lineWidth = Math.round(width * 0.0015)
    ctx.strokeRect(photoX + 4, photoY + 4, photoW - 8, photoH - 8)

    // Photo corner rivets / flourishes
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
    // No photo: add extra vintage typography breathing space & ornaments
    currentY += Math.round(height * (isStory ? 0.07 : 0.05))
  }

  // 6. Venue Banner Box (Millimeter-centrerad text & ren boxplacering)
  const venueBoxPadding = Math.round(width * 0.06)
  const venueText = props.gig.venue || 'SPELSTÄLLE'

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

  // Rita rektangel och ram
  ctx.fillStyle = theme.tagBg
  ctx.fillRect(venueBannerX, venueBannerY, venueBannerW, venueBannerHeight)
  ctx.strokeStyle = theme.primary
  ctx.lineWidth = Math.round(width * 0.0035)
  ctx.strokeRect(venueBannerX, venueBannerY, venueBannerW, venueBannerHeight)

  // Inre hairline ram i bannern för extra vintage känsla
  ctx.strokeStyle = theme.paperTint
  ctx.lineWidth = Math.round(width * 0.001)
  ctx.strokeRect(venueBannerX + 4, venueBannerY + 4, venueBannerW - 8, venueBannerHeight - 8)

  // Rita spelställetext EXAKT i boxens vertikala och horisontella mitt
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${selectedFontWeight} ${venueFontSize}px ${selectedFontStack}`
  ctx.fillStyle = theme.primary
  ctx.fillText(venueText.toUpperCase(), width / 2, venueBannerY + venueBannerHeight / 2)
  ctx.restore()

  // 7. City Banner (Placerad med säkert och luftigt avstånd under bannerns nederkant)
  currentY = venueBannerY + venueBannerHeight + Math.round(height * (isStory ? 0.038 : isSquare ? 0.028 : 0.034))
  const cityText = props.gig.city || 'SVERIGE'
  const cityFontSize = Math.round(width * (hasPhoto ? 0.042 : 0.052))

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${selectedFontWeight} ${cityFontSize}px ${selectedFontStack}`
  ctx.fillStyle = theme.secondary
  ctx.letterSpacing = '0.22em'
  ctx.fillText(`★   ${cityText.toUpperCase()}   ★`, width / 2, currentY)
  ctx.restore()

  // 8. Date & Doors Time Display
  currentY += Math.round(height * (hasPhoto ? (isStory ? 0.052 : 0.046) : 0.06))
  const dateStr = formatGigDate(props.gig.date)
  const timeStr = formatGigTime(props.gig.date)

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

  // 9. Custom Extra Info / Ticket status
  currentY += Math.round(height * (hasPhoto ? 0.042 : 0.05))
  const infoText =
    customNotes.value.trim() ||
    (props.gig.status === 'sold_out'
      ? '★ UTSÅLT! (FULLSATT HUS) ★'
      : props.gig.status === 'free'
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

  // 10. Ornamental Stars Divider before footer
  currentY += Math.round(height * (isStory ? 0.038 : isSquare ? 0.025 : 0.032))
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = theme.secondary
  ctx.font = `${Math.round(width * 0.018)}px sans-serif`
  ctx.fillText('★      ★      ★', width / 2, currentY)
  ctx.restore()

  // 11. Band Members & Website Footer
  if (includeBandMembers.value) {
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

  // Official URL / Footer tag
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

// Watchers to trigger redrawing
watch(
  [
    () => props.gig,
    selectedTheme,
    selectedFormat,
    selectedFont,
    topPresenter,
    headline,
    subheadline,
    customNotes,
    includeBandMembers,
    useBandLogo,
    logoSize,
    imageSource,
    selectedBandPhoto,
    selectedGalleryPhoto,
    customUploadedPhoto,
    aiGeneratedPosterImageUrl,
    photoFilter,
    isOpen,
  ],
  () => {
    if (isOpen.value && props.gig) {
      nextTick(() => {
        drawPoster()
      })
    }
  },
  { deep: true },
)

const formatGigDate = (dateVal: string | number | Date | null | undefined) => {
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

const formatGigTime = (dateVal: string | number | Date | null | undefined) => {
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

// Download PNG Image
const downloadPoster = () => {
  const canvas = canvasRef.value
  if (!canvas || !props.gig) return

  isGenerating.value = true
  try {
    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    const safeVenue = (props.gig.venue || 'gig').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    link.download = `affisch-det-7e-gunget-${safeVenue}-${selectedFormat.value}.png`
    link.href = dataUrl
    link.click()
  } finally {
    isGenerating.value = false
  }
}

// Copy to clipboard
const copyPosterToClipboard = async () => {
  const canvas = canvasRef.value
  if (!canvas) return

  try {
    canvas.toBlob(async (blob) => {
      if (!blob) return
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ])
        copyToast.value = true
        setTimeout(() => {
          copyToast.value = false
        }, 3000)
      } catch {
        downloadPoster()
      }
    }, 'image/png')
  } catch {
    downloadPoster()
  }
}

// Print Poster
const printPoster = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const dataUrl = canvas.toDataURL('image/png')
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Affisch - Det 7:e Gunget</title>
        <style>
          @page { size: auto; margin: 0; }
          body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; background: #000; }
          img { max-width: 100%; max-height: 100vh; object-fit: contain; }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" onload="window.print();window.close();" />
      </body>
    </html>
  `)
  printWindow.document.close()
}

// Publish directly as 24h Story to Facebook & Instagram (for admin)
const publishStory = async () => {
  if (!props.gig) return
  isPublishingStory.value = true
  storyPublishResult.value = null

  try {
    // 1. Sätt formatet till story (9:16) för bästa resultat på Instagram/Facebook Stories
    if (selectedFormat.value !== 'story') {
      selectedFormat.value = 'story'
      await nextTick()
      await drawPoster()
      await new Promise((r) => setTimeout(r, 120))
    }

    const canvas = canvasRef.value
    if (!canvas) throw new Error('Ingen canvas tillgänglig')

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('Kunde inte läsa bild från canvas')

    const safeVenue = (props.gig.venue || 'gig').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    const file = new File([blob], `story-${safeVenue}-${Date.now()}.png`, { type: 'image/png' })

    const uploadedUrl = await uploadAdminFile(file)
    if (!uploadedUrl) throw new Error('Kunde inte ladda upp affischen')

    const res = await $fetch<{ success: boolean; social?: { success?: boolean; message?: string } }>('/api/admin/social/broadcast', {
      method: 'POST',
      body: {
        type: 'gig',
        id: props.gig.id,
        imageUrl: uploadedUrl,
        isStory: true,
        customNotes: `Det 7:e Gunget live på ${props.gig.venue}, ${props.gig.city}!`,
      },
    })

    if (res.social?.success) {
      storyPublishResult.value = {
        success: true,
        message: '✓ Publicerad som 24h Story på Facebook & Instagram!',
      }
    } else {
      storyPublishResult.value = {
        success: false,
        message: `⚠️ Kunde inte publicera Story: ${res.social?.message || 'Okänt fel'}`,
      }
    }
  } catch (err: unknown) {
    const errWithData = err as { data?: { message?: string } }
    const errorMsg =
      errWithData?.data?.message
        ? errWithData.data.message
        : err instanceof Error
          ? err.message
          : 'Ett serverfel uppstod vid Story-publicering'
    storyPublishResult.value = {
      success: false,
      message: `⚠️ ${errorMsg}`,
    }
  } finally {
    isPublishingStory.value = false
  }
}

// Save currently composed poster as the official poster for this gig
const saveAsOfficialPoster = async () => {
  if (!props.gig?.id) return
  isSavingOfficialPoster.value = true
  officialPosterSavedResult.value = null

  try {
    // Sätt formatet till Affisch (3:4) för officiell affisch
    if (selectedFormat.value !== 'a4') {
      selectedFormat.value = 'a4'
      await nextTick()
      await drawPoster()
      await new Promise((r) => setTimeout(r, 120))
    }

    const canvas = canvasRef.value
    if (!canvas) throw new Error('Ingen canvas tillgänglig')

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('Kunde inte läsa bild från canvas')

    const safeVenue = (props.gig.venue || 'gig').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    const file = new File([blob], `affisch-${safeVenue}-${Date.now()}.png`, { type: 'image/png' })

    const uploadedUrl = await uploadAdminFile(file)
    if (!uploadedUrl) throw new Error('Kunde inte ladda upp affischen')

    await $fetch('/api/admin/gigs/poster', {
      method: 'POST',
      body: {
        gigId: props.gig.id,
        posterUrl: uploadedUrl,
      },
    })

    emit('posterSaved', props.gig.id, uploadedUrl)

    officialPosterSavedResult.value = {
      success: true,
      message: '✓ Sparad som officiell affisch för giget!',
    }
  } catch (err: unknown) {
    const errWithData = err as { data?: { message?: string } }
    const errorMsg =
      errWithData?.data?.message
        ? errWithData.data.message
        : err instanceof Error
          ? err.message
          : 'Kunde inte spara affischen'
    officialPosterSavedResult.value = {
      success: false,
      message: `⚠️ ${errorMsg}`,
    }
  } finally {
    isSavingOfficialPoster.value = false
  }
}

// Generate AI Background Artwork via Gemini / Fallback
const generatePosterWithAi = async () => {
  if (!props.gig) return
  isGeneratingPosterAi.value = true
  aiPosterError.value = null

  try {
    const res = await $fetch<{
      success: boolean
      imageUrl: string
      prompt: string
      engine: string
    }>('/api/admin/gigs/generate-poster-ai', {
      method: 'POST',
      body: {
        venue: props.gig.venue,
        city: props.gig.city,
        motifPreset: aiPosterPreset.value,
        customPrompt: aiPosterPreset.value === 'custom' ? aiPosterCustomPrompt.value : undefined,
        includeBand: aiPosterIncludeBand.value,
        format: selectedFormat.value,
      },
    })

    if (res.success && res.imageUrl) {
      aiGeneratedPosterImageUrl.value = res.imageUrl
      imageSource.value = 'ai'
      await nextTick()
      await drawPoster()
    } else {
      aiPosterError.value = 'Inget bildresultat returnerades från AI-motorn.'
    }
  } catch (err: unknown) {
    const errorObj = err as { statusCode?: number; data?: { statusCode?: number; statusMessage?: string; message?: string }; message?: string }
    const isAuth = errorObj?.statusCode === 401 || errorObj?.data?.statusCode === 401 || errorObj?.data?.statusMessage === 'Unauthorized'
    aiPosterError.value = isAuth
      ? 'Inloggningen har löpt ut. Logga in igen i en ny flik för att skapa AI-bild.'
      : (errorObj?.data?.message || errorObj?.data?.statusMessage || errorObj?.message || 'Kunde inte generera AI-bild.')
  } finally {
    isGeneratingPosterAi.value = false
  }
}
</script>

<template>
  <div
    v-if="isOpen && gig"
    class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    @click.self="isOpen = false"
  >
    <div class="stage-card p-5 sm:p-7 rounded-3xl border border-primary/40 shadow-2xl max-w-6xl w-full bg-base-100 space-y-5 my-4 max-h-[94vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-primary/20 pb-3 flex-shrink-0">
        <div>
          <h2 class="font-heading text-xl sm:text-2xl text-primary font-bold flex items-center gap-2">
            <span>🎨</span>
            <span>Vintage Gig-affisch Studio</span>
          </h2>
          <p class="text-xs text-base-content/70">
            Skapa retro konsertaffischer för {{ gig.venue }} i {{ gig.city }}. Med officiell logotyp, bandfoto eller eget motiv.
          </p>
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-circle text-lg"
          @click="isOpen = false"
        >
          ✕
        </button>
      </div>

      <!-- Main Layout: Controls Left, Live Canvas Right -->
      <div class="grid lg:grid-cols-[1.15fr_1.25fr] gap-6 overflow-y-auto pr-1 flex-1 min-h-0 items-start">
        <!-- Controls Panel Left -->
        <div class="space-y-4 text-xs">
          <!-- 1. Theme & Format -->
          <div class="space-y-2 p-3.5 rounded-2xl bg-base-200/60 border border-primary/20">
            <div class="flex items-center justify-between gap-2">
              <label class="font-bold text-secondary uppercase tracking-wider text-[11px]">
                1. Retrostil & Format
              </label>
              <button
                v-if="selectedTheme === 'sunburst'"
                type="button"
                class="btn btn-ghost btn-xs text-[10px] text-primary hover:bg-primary/15 rounded-lg h-6 min-h-0 px-2 font-bold"
                title="Ladda ner den rengjorda affischmallen helt utan text"
                @click="downloadBlankSunburstTemplate"
              >
                📥 Ladda ner ren mall (utan text)
              </button>
            </div>

            <!-- Theme Buttons -->
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="(tItem, key) in themes"
                :key="key"
                type="button"
                class="p-2 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer text-xs"
                :class="[
                  selectedTheme === key
                    ? 'border-primary bg-primary/10 shadow-md font-bold'
                    : 'border-base-content/10 bg-base-200/60 hover:bg-base-200',
                  key === 'sunburst' ? 'col-span-2' : '',
                ]"
                @click="selectThemeOption(key)"
              >
                <div class="w-4 h-4 rounded-full border border-base-content/20 flex-shrink-0" :style="{ backgroundColor: tItem.primary }" />
                <span class="truncate">{{ tItem.name }}</span>
                <span v-if="key === 'sunburst'" class="ml-auto badge badge-xs badge-primary font-mono">★ Favorit</span>
              </button>
            </div>

            <!-- Format Buttons -->
            <div class="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                class="py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs"
                :class="selectedFormat === 'a4' ? 'border-primary bg-primary/15 text-primary' : 'border-base-content/10 bg-base-200/60 text-base-content/70'"
                @click="selectedFormat = 'a4'"
              >
                📄 Affisch (3:4)
              </button>
              <button
                type="button"
                class="py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs"
                :class="selectedFormat === 'story' ? 'border-primary bg-primary/15 text-primary' : 'border-base-content/10 bg-base-200/60 text-base-content/70'"
                @click="selectedFormat = 'story'"
              >
                📱 Story (9:16)
              </button>
              <button
                type="button"
                class="py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs"
                :class="selectedFormat === 'square' ? 'border-primary bg-primary/15 text-primary' : 'border-base-content/10 bg-base-200/60 text-base-content/70'"
                @click="selectedFormat = 'square'"
              >
                ⬛ Kvadrat (1:1)
              </button>
            </div>

            <!-- Font Selector Dropdown (7 Vintage & Rounded Fonts) -->
            <div class="pt-1.5 space-y-1">
              <div class="flex items-center justify-between">
                <label class="font-semibold text-base-content/80 text-[11px] flex items-center gap-1.5">
                  <span>🔤</span>
                  <span>Affisch-typsnitt (7 rundade vintage-stilar)</span>
                </label>
                <span class="text-[10px] font-mono text-primary font-bold">
                  {{ activeFontOption.name }}
                </span>
              </div>
              <select
                v-model="selectedFont"
                class="select select-bordered select-sm w-full bg-base-100 text-xs font-semibold rounded-xl border-primary/30 focus:border-primary"
                :style="{ fontFamily: `'${activeFontOption.family}', sans-serif`, fontWeight: activeFontOption.weight }"
              >
                <option
                  v-for="fOpt in posterFonts"
                  :key="fOpt.key"
                  :value="fOpt.key"
                  :style="{ fontFamily: `'${fOpt.family}', sans-serif`, fontWeight: fOpt.weight }"
                >
                  {{ fOpt.label }}
                </option>
              </select>
            </div>
          </div>

          <!-- 2. Band Logo & Image Controls -->
          <div class="space-y-3 p-3.5 rounded-2xl bg-base-200/60 border border-primary/20">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <label class="font-bold text-secondary uppercase tracking-wider text-[11px]">
                2. Logotyp & Bandfoto
              </label>
              <div class="flex items-center gap-2.5">
                <div v-if="useBandLogo" class="flex items-center gap-1 bg-base-300/80 p-0.5 rounded-lg text-[10px]">
                  <button
                    type="button"
                    class="px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer"
                    :class="logoSize === 'large' ? 'bg-primary text-primary-content shadow-xs' : 'text-base-content/60 hover:text-base-content'"
                    @click="logoSize = 'large'"
                  >
                    Stor
                  </button>
                  <button
                    type="button"
                    class="px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer"
                    :class="logoSize === 'normal' ? 'bg-primary text-primary-content shadow-xs' : 'text-base-content/60 hover:text-base-content'"
                    @click="logoSize = 'normal'"
                  >
                    Mellan
                  </button>
                </div>
                <label class="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-primary">
                  <input
                    v-model="useBandLogo"
                    type="checkbox"
                    class="checkbox checkbox-primary checkbox-xs"
                  >
                  <span>Bandlogotyp</span>
                </label>
              </div>
            </div>

            <!-- Image Source Selector Tabs -->
            <div class="grid grid-cols-5 gap-1 p-1 bg-base-300/60 rounded-xl">
              <button
                type="button"
                class="py-1.5 px-0.5 rounded-lg text-center font-bold text-[10px] transition-all cursor-pointer truncate"
                :class="imageSource === 'photoshoot' ? 'bg-primary text-primary-content shadow' : 'text-base-content/70 hover:text-base-content'"
                @click="imageSource = 'photoshoot'"
              >
                📸 Bandfoto
              </button>
              <button
                type="button"
                class="py-1.5 px-0.5 rounded-lg text-center font-bold text-[10px] transition-all cursor-pointer truncate"
                :class="imageSource === 'gallery' ? 'bg-primary text-primary-content shadow' : 'text-base-content/70 hover:text-base-content'"
                @click="imageSource = 'gallery'"
              >
                🖼️ Galleri
              </button>
              <button
                type="button"
                class="py-1.5 px-0.5 rounded-lg text-center font-bold text-[10px] transition-all cursor-pointer truncate"
                :class="imageSource === 'ai' ? 'bg-primary text-primary-content shadow ring-1 ring-primary' : 'text-base-content/70 hover:text-base-content'"
                @click="imageSource = 'ai'; if (!aiGeneratedPosterImageUrl) generatePosterWithAi()"
              >
                🤖 Gemini AI
              </button>
              <button
                type="button"
                class="py-1.5 px-0.5 rounded-lg text-center font-bold text-[10px] transition-all cursor-pointer truncate"
                :class="imageSource === 'upload' ? 'bg-primary text-primary-content shadow' : 'text-base-content/70 hover:text-base-content'"
                @click="triggerFileUpload"
              >
                📤 Egen bild
              </button>
              <button
                type="button"
                class="py-1.5 px-0.5 rounded-lg text-center font-bold text-[10px] transition-all cursor-pointer truncate"
                :class="imageSource === 'none' ? 'bg-primary text-primary-content shadow' : 'text-base-content/70 hover:text-base-content'"
                @click="imageSource = 'none'"
              >
                🚫 Ingen bild
              </button>
            </div>

            <!-- Hidden File Input for Custom Upload -->
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onFileUpload"
            >

            <!-- Source: Official Photoshoot Carousel -->
            <div v-if="imageSource === 'photoshoot'" class="space-y-1.5">
              <span class="text-[10px] text-base-content/60 font-semibold">Välj bandfoto från fotograferingen:</span>
              <div class="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 bg-base-300/40 rounded-xl border border-primary/10">
                <button
                  v-for="(photo, idx) in bandPhotos"
                  :key="idx"
                  type="button"
                  class="group relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer"
                  :class="selectedBandPhoto === photo.url ? 'border-primary shadow-lg ring-2 ring-primary/40' : 'border-transparent opacity-65 hover:opacity-100'"
                  :title="photo.title"
                  @click="selectedBandPhoto = photo.url"
                >
                  <img :src="photo.url" :alt="photo.title" class="w-full h-full object-cover">
                  <div class="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 px-1 text-[8px] text-center text-white truncate">
                    {{ photo.title }}
                  </div>
                </button>
              </div>
            </div>

            <!-- Source: Site Gallery -->
            <div v-else-if="imageSource === 'gallery'" class="space-y-1.5">
              <span class="text-[10px] text-base-content/60 font-semibold">Välj bland sajtens publicerade foton:</span>
              <div v-if="galleryItems && galleryItems.length" class="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 bg-base-300/40 rounded-xl border border-primary/10">
                <button
                  v-for="item in galleryItems"
                  :key="item.id"
                  type="button"
                  class="group relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer"
                  :class="selectedGalleryPhoto === item.url ? 'border-primary shadow-lg ring-2 ring-primary/40' : 'border-transparent opacity-65 hover:opacity-100'"
                  :title="item.title || 'Galleribild'"
                  @click="selectedGalleryPhoto = item.url"
                >
                  <img :src="item.url" :alt="item.title" class="w-full h-full object-cover">
                </button>
              </div>
              <div v-else class="text-xs text-base-content/50 italic py-2">
                Inga galleribilder hittades.
              </div>
            </div>

            <!-- Source: Custom Upload Preview -->
            <div v-else-if="imageSource === 'upload'" class="space-y-2">
              <div class="flex items-center gap-3 bg-base-300/50 p-2.5 rounded-xl border border-primary/20">
                <div v-if="customUploadedPhoto" class="w-14 h-14 rounded-lg overflow-hidden border border-primary/40 flex-shrink-0">
                  <img :src="customUploadedPhoto" alt="Uppladdad bild" class="w-full h-full object-cover">
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-bold text-xs truncate">
                    {{ customUploadedPhoto ? 'Egen bild laddad' : 'Ingen bild vald än' }}
                  </p>
                  <p class="text-[10px] text-base-content/60">
                    Ladda upp valfritt foto eller tidigare affisch (PNG/JPG).
                  </p>
                </div>
                <button
                  type="button"
                  class="btn btn-primary btn-xs rounded-lg"
                  @click="triggerFileUpload"
                >
                  Välj fil
                </button>
              </div>
            </div>

            <!-- Source: Gemini AI Artwork -->
            <div v-else-if="imageSource === 'ai'" class="space-y-2.5 p-3 bg-base-300/40 rounded-xl border border-primary/20">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold text-secondary flex items-center gap-1.5">
                  <span>🤖</span>
                  <span>Välj motiv & stämning för spelningen:</span>
                </span>
                <span v-if="aiGeneratedPosterImageUrl" class="badge badge-xs badge-primary font-mono font-bold">
                  ✓ AI-bild aktiv
                </span>
              </div>

              <!-- Preset motif options -->
              <div class="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                <button
                  type="button"
                  class="p-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-0.5"
                  :class="aiPosterPreset === 'club' ? 'bg-primary/20 border-primary text-primary font-bold shadow-sm' : 'border-white/10 hover:border-primary/40 text-base-content/80 bg-base-200/50'"
                  :disabled="isGeneratingPosterAi"
                  @click="aiPosterPreset = 'club'; generatePosterWithAi()"
                >
                  <span class="text-sm">🎷</span>
                  <span class="font-bold">Bluesklubb</span>
                  <span class="text-[8px] opacity-70">Rökigt 70-tal Chicago</span>
                </button>

                <button
                  type="button"
                  class="p-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-0.5"
                  :class="aiPosterPreset === 'stage' ? 'bg-primary/20 border-primary text-primary font-bold shadow-sm' : 'border-white/10 hover:border-primary/40 text-base-content/80 bg-base-200/50'"
                  :disabled="isGeneratingPosterAi"
                  @click="aiPosterPreset = 'stage'; generatePosterWithAi()"
                >
                  <span class="text-sm">🎸</span>
                  <span class="font-bold">Scen & Stärkare</span>
                  <span class="text-[8px] opacity-70">Fender/Marshall rör</span>
                </button>

                <button
                  type="button"
                  class="p-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-0.5"
                  :class="aiPosterPreset === 'folkpark' ? 'bg-primary/20 border-primary text-primary font-bold shadow-sm' : 'border-white/10 hover:border-primary/40 text-base-content/80 bg-base-200/50'"
                  :disabled="isGeneratingPosterAi"
                  @click="aiPosterPreset = 'folkpark'; generatePosterWithAi()"
                >
                  <span class="text-sm">🌲</span>
                  <span class="font-bold">Svensk Folkpark</span>
                  <span class="text-[8px] opacity-70">Skymning & lyktor</span>
                </button>

                <button
                  type="button"
                  class="p-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-0.5"
                  :class="aiPosterPreset === 'rockbar' ? 'bg-primary/20 border-primary text-primary font-bold shadow-sm' : 'border-white/10 hover:border-primary/40 text-base-content/80 bg-base-200/50'"
                  :disabled="isGeneratingPosterAi"
                  @click="aiPosterPreset = 'rockbar'; generatePosterWithAi()"
                >
                  <span class="text-sm">🍻</span>
                  <span class="font-bold">Svettig Rockbar</span>
                  <span class="text-[8px] opacity-70">Träpanel & neonljus</span>
                </button>

                <button
                  type="button"
                  class="p-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-0.5"
                  :class="aiPosterPreset === 'chicago' ? 'bg-primary/20 border-primary text-primary font-bold shadow-sm' : 'border-white/10 hover:border-primary/40 text-base-content/80 bg-base-200/50'"
                  :disabled="isGeneratingPosterAi"
                  @click="aiPosterPreset = 'chicago'; generatePosterWithAi()"
                >
                  <span class="text-sm">🏙️</span>
                  <span class="font-bold">Chicago Alley</span>
                  <span class="text-[8px] opacity-70">Natt, regn & neon</span>
                </button>

                <button
                  type="button"
                  class="p-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-0.5"
                  :class="aiPosterPreset === 'custom' ? 'bg-primary/20 border-primary text-primary font-bold shadow-sm' : 'border-white/10 hover:border-primary/40 text-base-content/80 bg-base-200/50'"
                  :disabled="isGeneratingPosterAi"
                  @click="aiPosterPreset = 'custom'"
                >
                  <span class="text-sm">✍️</span>
                  <span class="font-bold">Egen idé</span>
                  <span class="text-[8px] opacity-70">Skriv egen prompt</span>
                </button>
              </div>

              <!-- Custom prompt input -->
              <div v-if="aiPosterPreset === 'custom'" class="pt-1">
                <input
                  v-model="aiPosterCustomPrompt"
                  type="text"
                  placeholder="Beskriv scenen (t.ex. Bluesfestival i solnedgång vid havet...)"
                  class="input input-bordered input-xs w-full font-mono text-[11px] bg-base-100"
                  @keydown.enter.prevent="generatePosterWithAi"
                >
              </div>

              <!-- Include band members likeness toggle -->
              <div class="flex items-center justify-between pt-1 border-t border-primary/10">
                <div>
                  <label class="text-[11px] font-bold text-base-content/80 flex items-center gap-1.5 cursor-pointer">
                    <input
                      v-model="aiPosterIncludeBand"
                      type="checkbox"
                      class="checkbox checkbox-primary checkbox-xs"
                      :disabled="isGeneratingPosterAi"
                      @change="generatePosterWithAi"
                    >
                    <span>Generera bandmedlemmarna på scenen</span>
                  </label>
                  <p class="text-[9px] text-base-content/50 ml-5">
                    Använder referensfoto av Janis, Marcus, Bosse och Jonas.
                  </p>
                </div>
              </div>

              <!-- Error Alert if any -->
              <div v-if="aiPosterError" class="p-2 bg-error/15 border border-error/40 rounded-lg text-error text-[10px] font-bold">
                ⚠️ {{ aiPosterError }}
              </div>

              <!-- Generate Button & Action -->
              <div class="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  class="btn btn-primary btn-xs rounded-lg font-bold flex-1 flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  :disabled="isGeneratingPosterAi"
                  @click="generatePosterWithAi"
                >
                  <span v-if="isGeneratingPosterAi" class="loading loading-spinner loading-xs" />
                  <span v-else>✨</span>
                  <span>{{ isGeneratingPosterAi ? 'Genererar AI-affischbild...' : (aiGeneratedPosterImageUrl ? '🎲 Generera ny AI-variant' : 'Skapa AI-affischbild') }}</span>
                </button>
              </div>
            </div>

            <!-- Photo Filter Selector (only if photo active) -->
            <div v-if="imageSource !== 'none'" class="space-y-1.5 pt-1 border-t border-primary/10">
              <span class="text-[10px] text-secondary font-bold uppercase tracking-wider">Bildfilter & färgton:</span>
              <div class="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  class="py-1 px-1 rounded-lg border text-center font-bold text-[10px] transition-all cursor-pointer truncate"
                  :class="photoFilter === 'vintage' ? 'border-primary bg-primary/20 text-primary' : 'border-base-content/10 bg-base-200 text-base-content/70'"
                  @click="photoFilter = 'vintage'"
                >
                  🌾 Sepia
                </button>
                <button
                  type="button"
                  class="py-1 px-1 rounded-lg border text-center font-bold text-[10px] transition-all cursor-pointer truncate"
                  :class="photoFilter === 'bw' ? 'border-primary bg-primary/20 text-primary' : 'border-base-content/10 bg-base-200 text-base-content/70'"
                  @click="photoFilter = 'bw'"
                >
                  🎬 Svartvit
                </button>
                <button
                  type="button"
                  class="py-1 px-1 rounded-lg border text-center font-bold text-[10px] transition-all cursor-pointer truncate"
                  :class="photoFilter === 'duotone' ? 'border-primary bg-primary/20 text-primary' : 'border-base-content/10 bg-base-200 text-base-content/70'"
                  @click="photoFilter = 'duotone'"
                >
                  🎨 Tematon
                </button>
                <button
                  type="button"
                  class="py-1 px-1 rounded-lg border text-center font-bold text-[10px] transition-all cursor-pointer truncate"
                  :class="photoFilter === 'natural' ? 'border-primary bg-primary/20 text-primary' : 'border-base-content/10 bg-base-200 text-base-content/70'"
                  @click="photoFilter = 'natural'"
                >
                  ✨ Naturlig
                </button>
              </div>
            </div>
          </div>

          <!-- 3. Custom Text Fields -->
          <div class="space-y-2.5 p-3.5 rounded-2xl bg-base-200/60 border border-primary/20">
            <label class="block font-bold text-secondary uppercase tracking-wider text-[11px]">
              3. Text & Affischdetaljer
            </label>

            <div v-if="selectedTheme === 'sunburst'">
              <label class="block font-semibold text-base-content/80 mb-0.5 text-[11px]">
                Arrangör / Topprad i solstrålarna (valfritt)
              </label>
              <input
                v-model="topPresenter"
                type="text"
                class="input input-bordered input-sm w-full bg-base-100 text-xs"
                placeholder="t.ex. PUB 666 PRESENTS (lämna tom för ren sol)"
              >
            </div>

            <div>
              <label class="block font-semibold text-base-content/80 mb-0.5 text-[11px]">
                {{ selectedTheme === 'sunburst' ? 'Kallelse före spelställe (t.ex. LIVE PÅ / LIVE AT)' : 'Topprubrik / Kallelse' }}
              </label>
              <input
                v-model="headline"
                type="text"
                class="input input-bordered input-sm w-full bg-base-100 text-xs"
                :placeholder="selectedTheme === 'sunburst' ? 'LIVE PÅ' : 'LIVE PÅ SCEN'"
              >
            </div>

            <div>
              <label class="block font-semibold text-base-content/80 mb-0.5 text-[11px]">
                {{ selectedTheme === 'sunburst' ? 'Gatuadress eller hålltider under datum (valfritt)' : 'Bandets undertitel' }}
              </label>
              <input
                v-model="subheadline"
                type="text"
                class="input input-bordered input-sm w-full bg-base-100 text-xs"
                :placeholder="selectedTheme === 'sunburst' ? 't.ex. IDROTTSGATAN 11 eller KL 20:00' : 'ÄKTA BLUES & SVÄNGIG ROCK \'N\' ROLL'"
              >
            </div>

            <div>
              <label class="block font-semibold text-base-content/80 mb-0.5 text-[11px]">
                {{ selectedTheme === 'sunburst' ? 'Nedersta rader mellan mikrofonerna (valfritt)' : 'Biljett- & entréinfo (valfritt)' }}
              </label>
              <input
                v-model="customNotes"
                type="text"
                class="input input-bordered input-sm w-full bg-base-100 text-xs"
                :placeholder="selectedTheme === 'sunburst' ? 't.ex. BBQ, LIVE MUSIC, KARAOKE • PARTY TILL YOU DROP!' : 't.ex. Fri entré • Dörrarna öppnar kl 19'"
              >
            </div>

            <label class="flex items-center gap-2 cursor-pointer pt-1">
              <input
                v-model="includeBandMembers"
                type="checkbox"
                class="checkbox checkbox-primary checkbox-xs"
              >
              <span class="font-bold text-base-content/80 text-[11px]">
                {{ selectedTheme === 'sunburst' ? 'Visa webbadress (WWW.SJUNDEGUNGET.SE) längst ner' : 'Inkludera medlemsrad (Janis, Marcus, Bosse, Jonas)' }}
              </span>
            </label>
          </div>

          <!-- 4. Quick Actions Panel -->
          <div class="pt-1 flex flex-col gap-2">
            <!-- Alerts for Save and Story -->
            <div
              v-if="officialPosterSavedResult"
              class="p-3 rounded-xl border text-xs font-bold transition-all"
              :class="officialPosterSavedResult.success ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/10 border-rose-500/40 text-rose-400'"
            >
              {{ officialPosterSavedResult.message }}
            </div>

            <div
              v-if="storyPublishResult"
              class="p-3 rounded-xl border text-xs font-bold transition-all"
              :class="storyPublishResult.success ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/10 border-rose-500/40 text-rose-400'"
            >
              {{ storyPublishResult.message }}
            </div>

            <!-- Existing Official Poster Status Indicator -->
            <div
              v-if="gig.posterUrl"
              class="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold"
            >
              <span class="flex items-center gap-1.5">
                <span>✓</span>
                <span>Officiell affisch finns sparad</span>
              </span>
              <a
                :href="gig.posterUrl"
                target="_blank"
                class="underline hover:text-emerald-300 font-mono text-[10px]"
              >
                Visa ↗
              </a>
            </div>

            <!-- Admin Save as Official Gig Poster -->
            <button
              v-if="adminUser"
              type="button"
              class="btn btn-warning btn-sm rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-warning/20 cursor-pointer text-stone-900"
              :disabled="isSavingOfficialPoster"
              @click="saveAsOfficialPoster"
            >
              <span v-if="isSavingOfficialPoster" class="loading loading-spinner loading-xs" />
              <span v-else>💾</span>
              <span>{{ isSavingOfficialPoster ? 'Sparar till giget...' : 'Spara som officiell affisch' }}</span>
            </button>

            <!-- Admin Direct Story Publishing -->
            <button
              v-if="adminUser"
              type="button"
              class="btn btn-secondary btn-sm rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-secondary/25 cursor-pointer"
              :disabled="isPublishingStory"
              @click="publishStory"
            >
              <span v-if="isPublishingStory" class="loading loading-spinner loading-xs" />
              <span v-else>🚀</span>
              <span>{{ isPublishingStory ? 'Publicerar Story...' : 'Publicera Story (FB & IG 24h)' }}</span>
            </button>

            <button
              type="button"
              class="btn btn-primary btn-sm rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-primary/25 cursor-pointer"
              :disabled="isGenerating"
              @click="downloadPoster"
            >
              <span>📥</span>
              <span>Ladda ner affisch (PNG)</span>
            </button>

            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="btn btn-outline btn-secondary btn-sm rounded-xl font-bold flex items-center justify-center gap-1.5"
                @click="copyPosterToClipboard"
              >
                <span>📋</span>
                <span>{{ copyToast ? '✓ Kopierad!' : 'Kopiera bild' }}</span>
              </button>

              <button
                type="button"
                class="btn btn-outline btn-ghost btn-sm rounded-xl font-bold flex items-center justify-center gap-1.5"
                @click="printPoster"
              >
                <span>🖨️</span>
                <span>Skriv ut (A4)</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Live Canvas Preview Right -->
        <div class="flex flex-col items-center justify-center bg-base-300/40 p-4 rounded-2xl border border-primary/20 sticky top-0">
          <div class="text-[10px] uppercase font-mono font-bold text-base-content/60 pb-2 flex items-center gap-2">
            <span>Förhandsgranskning: {{ dimensions.label }}</span>
            <span>•</span>
            <span>{{ dimensions.width }} × {{ dimensions.height }} px</span>
          </div>

          <div class="max-w-full max-h-[60vh] flex items-center justify-center overflow-hidden rounded-xl shadow-2xl border border-primary/30 bg-black/50">
            <canvas
              ref="canvasRef"
              class="w-auto h-auto max-h-[60vh] max-w-full object-contain"
            />
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between pt-2 border-t border-primary/20 flex-shrink-0">
        <span class="text-xs text-base-content/60">
          Tips: Ladda ner som Story (9:16) för Instagram & Facebook, eller Affisch (3:4) för utskrift!
        </span>
        <button
          type="button"
          class="btn btn-ghost btn-sm rounded-xl font-bold"
          @click="isOpen = false"
        >
          Stäng
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  gig: any | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isGenerating = ref(false)
const copyToast = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Admin auth & upload for direct Story broadcasting
const { adminUser } = useAdminAuth()
const { uploadAdminFile } = useAdminUpload()
const isPublishingStory = ref(false)
const storyPublishResult = ref<{ success: boolean; message: string } | null>(null)

// Fetch site gallery photos for user selection
const { data: galleryItems } = useFetch<any[]>('/api/gallery', {
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
const selectedTheme = ref<'sonet' | 'chess' | 'sun' | 'neon'>('sonet')
const selectedFormat = ref<'a4' | 'story' | 'square'>('a4')
const headline = ref('LIVE PÅ SCEN')
const subheadline = ref('ÄKTA BLUES & SVÄNGIG ROCK \'N\' ROLL')
const customNotes = ref('')
const includeBandMembers = ref(true)

// Band Logo & Photo Customization
const useBandLogo = ref(true)
const imageSource = ref<'photoshoot' | 'gallery' | 'upload' | 'none'>('photoshoot')
const selectedBandPhoto = ref('/media/band/21..7de Gunget photoshoot1 21-6 26-3.jpg')
const selectedGalleryPhoto = ref('')
const customUploadedPhoto = ref<string | null>(null)
const photoFilter = ref<'vintage' | 'bw' | 'duotone' | 'natural'>('vintage')

// Active photo URL computed
const activePhotoUrl = computed(() => {
  if (imageSource.value === 'none') return null
  if (imageSource.value === 'photoshoot') return selectedBandPhoto.value
  if (imageSource.value === 'gallery') return selectedGalleryPhoto.value || galleryItems.value?.[0]?.url || null
  if (imageSource.value === 'upload') return customUploadedPhoto.value
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

  const theme = themes[selectedTheme.value]

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
    ctx.font = `900 ${Math.round(width * (isSquare ? 0.032 : 0.035))}px 'Alfa Slab One', 'Arvo', serif`
    ctx.fillStyle = theme.accent
    ctx.letterSpacing = '0.22em'
    ctx.fillText(`★  ${headline.value.trim().toUpperCase()}  ★`, width / 2, currentY)
  }

  // 4. Band Brand: Official Logo or Big Typography
  if (useBandLogo.value && logoImg) {
    const maxLogoW = Math.round(width * (hasPhoto ? 0.62 : 0.75))
    const maxLogoH = Math.round(height * (isStory ? 0.12 : hasPhoto ? 0.095 : 0.14))
    const logoAspect = logoImg.width / logoImg.height

    let targetW = maxLogoW
    let targetH = targetW / logoAspect
    if (targetH > maxLogoH) {
      targetH = maxLogoH
      targetW = targetH * logoAspect
    }

    currentY += Math.round(height * 0.015)
    const logoX = (width - targetW) / 2

    // On light kraft paper (Chess), add a subtle back glow or render sharply
    if (selectedTheme.value === 'chess') {
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.2)'
      ctx.shadowBlur = 10
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
    ctx.font = `900 ${Math.round(width * (hasPhoto ? 0.08 : 0.095))}px 'Alfa Slab One', 'Arvo', serif`
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
    currentY += Math.round(height * 0.02)
    const photoW = Math.round(width * 0.82)
    const photoH = Math.round(
      height * (isStory ? 0.38 : isSquare ? 0.28 : 0.32),
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

  // 6. Venue Banner Box
  const venueBoxPadding = Math.round(width * 0.06)
  const venueText = props.gig.venue || 'SPELSTÄLLE'

  let venueFontSize = Math.round(width * (hasPhoto ? (isSquare ? 0.055 : 0.065) : 0.08))
  ctx.font = `900 ${venueFontSize}px 'Alfa Slab One', 'Arvo', serif`
  while (ctx.measureText(venueText.toUpperCase()).width > width - venueBoxPadding * 2 && venueFontSize > 22) {
    venueFontSize -= 2
    ctx.font = `900 ${venueFontSize}px 'Alfa Slab One', 'Arvo', serif`
  }

  const venueBannerHeight = Math.round(venueFontSize * 1.55)
  const venueBannerY = currentY - venueFontSize * 0.85
  const venueBannerW = width - (margin + 18) * 2
  const venueBannerX = margin + 18

  ctx.fillStyle = theme.tagBg
  ctx.fillRect(venueBannerX, venueBannerY, venueBannerW, venueBannerHeight)
  ctx.strokeStyle = theme.primary
  ctx.lineWidth = Math.round(width * 0.003)
  ctx.strokeRect(venueBannerX, venueBannerY, venueBannerW, venueBannerHeight)

  ctx.fillStyle = theme.primary
  ctx.fillText(venueText.toUpperCase(), width / 2, currentY)

  // 7. City Banner
  currentY += Math.round(height * (hasPhoto ? (isStory ? 0.055 : 0.05) : 0.065))
  const cityText = props.gig.city || 'SVERIGE'
  ctx.fillStyle = theme.secondary
  ctx.font = `900 ${Math.round(width * (hasPhoto ? 0.042 : 0.052))}px 'Alfa Slab One', 'Arvo', serif`
  ctx.letterSpacing = '0.25em'
  ctx.fillText(`★  ${cityText.toUpperCase()}  ★`, width / 2, currentY)

  // 8. Date & Doors Time Display
  currentY += Math.round(height * (hasPhoto ? (isStory ? 0.055 : 0.05) : 0.065))
  const dateStr = formatGigDate(props.gig.date)
  const timeStr = formatGigTime(props.gig.date)

  ctx.fillStyle = theme.accent
  ctx.font = `900 ${Math.round(width * (hasPhoto ? 0.034 : 0.042))}px 'Alfa Slab One', 'Arvo', serif`
  ctx.letterSpacing = '0.08em'
  ctx.fillText(dateStr, width / 2, currentY)

  if (timeStr) {
    currentY += Math.round(height * (hasPhoto ? 0.032 : 0.038))
    ctx.fillStyle = theme.secondary
    ctx.font = `700 ${Math.round(width * (hasPhoto ? 0.026 : 0.032))}px 'Arvo', serif`
    ctx.letterSpacing = '0.12em'
    ctx.fillText(`DÖRRARNA ÖPPNAR KL ${timeStr}`, width / 2, currentY)
  }

  // 9. Custom Extra Info / Ticket status
  currentY += Math.round(height * (hasPhoto ? 0.038 : 0.05))
  const infoText =
    customNotes.value.trim() ||
    (props.gig.status === 'sold_out'
      ? '★ UTSÅLT! (FULLSATT HUS) ★'
      : props.gig.status === 'free'
        ? '★ FRI ENTRÉ • ALLA ÄR VÄLKOMNA ★'
        : 'BILJETTER & INFO PÅ WWW.SJUNDEGUNGET.SE')

  ctx.fillStyle = theme.primary
  ctx.font = `800 ${Math.round(width * (hasPhoto ? 0.024 : 0.028))}px 'Arvo', sans-serif`
  ctx.letterSpacing = '0.1em'
  ctx.fillText(infoText.toUpperCase(), width / 2, currentY)

  // 10. Band Members & Website Footer
  if (includeBandMembers.value) {
    const membersY = height - margin - Math.round(height * (isStory ? 0.06 : 0.055))
    ctx.fillStyle = theme.secondary
    ctx.font = `600 ${Math.round(width * 0.021)}px 'Inter', sans-serif`
    ctx.letterSpacing = '0.15em'
    ctx.fillText('JANIS  •  MARCUS  •  BOSSE  •  JONAS', width / 2, membersY)
  }

  // Official URL / Footer tag
  const footerY = height - margin - Math.round(height * (isStory ? 0.025 : 0.022))
  ctx.fillStyle = theme.primary
  ctx.font = `900 ${Math.round(width * 0.019)}px 'Alfa Slab One', 'Arvo', sans-serif`
  ctx.letterSpacing = '0.22em'
  ctx.fillText('WWW.SJUNDEGUNGET.SE', width / 2, footerY)
}

// Watchers to trigger redrawing
watch(
  [
    () => props.gig,
    selectedTheme,
    selectedFormat,
    headline,
    subheadline,
    customNotes,
    includeBandMembers,
    useBandLogo,
    imageSource,
    selectedBandPhoto,
    selectedGalleryPhoto,
    customUploadedPhoto,
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

const formatGigDate = (dateVal: any) => {
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

const formatGigTime = (dateVal: any) => {
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

    const res = await $fetch<{ success: boolean; social: any }>('/api/admin/social/broadcast', {
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
    const errorMsg =
      err && typeof err === 'object' && 'data' in err && (err as any).data?.message
        ? (err as any).data.message
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
            <div class="flex items-center justify-between">
              <label class="font-bold text-secondary uppercase tracking-wider text-[11px]">
                1. Retrostil & Format
              </label>
            </div>

            <!-- Theme Buttons -->
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="(tItem, key) in themes"
                :key="key"
                type="button"
                class="p-2 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer text-xs"
                :class="
                  selectedTheme === key
                    ? 'border-primary bg-primary/10 shadow-md font-bold'
                    : 'border-base-content/10 bg-base-200/60 hover:bg-base-200'
                "
                @click="selectedTheme = key"
              >
                <div class="w-4 h-4 rounded-full border border-base-content/20 flex-shrink-0" :style="{ backgroundColor: tItem.primary }" />
                <span class="truncate">{{ tItem.name }}</span>
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
          </div>

          <!-- 2. Band Logo & Image Controls -->
          <div class="space-y-3 p-3.5 rounded-2xl bg-base-200/60 border border-primary/20">
            <div class="flex items-center justify-between">
              <label class="font-bold text-secondary uppercase tracking-wider text-[11px]">
                2. Logotyp & Bandfoto
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-primary">
                <input
                  v-model="useBandLogo"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-xs"
                >
                <span>Visa bandlogotyp</span>
              </label>
            </div>

            <!-- Image Source Selector Tabs -->
            <div class="grid grid-cols-4 gap-1 p-1 bg-base-300/60 rounded-xl">
              <button
                type="button"
                class="py-1.5 px-1 rounded-lg text-center font-bold text-[11px] transition-all cursor-pointer truncate"
                :class="imageSource === 'photoshoot' ? 'bg-primary text-primary-content shadow' : 'text-base-content/70 hover:text-base-content'"
                @click="imageSource = 'photoshoot'"
              >
                📸 Photoshoot
              </button>
              <button
                type="button"
                class="py-1.5 px-1 rounded-lg text-center font-bold text-[11px] transition-all cursor-pointer truncate"
                :class="imageSource === 'gallery' ? 'bg-primary text-primary-content shadow' : 'text-base-content/70 hover:text-base-content'"
                @click="imageSource = 'gallery'"
              >
                🖼️ Galleri
              </button>
              <button
                type="button"
                class="py-1.5 px-1 rounded-lg text-center font-bold text-[11px] transition-all cursor-pointer truncate"
                :class="imageSource === 'upload' ? 'bg-primary text-primary-content shadow' : 'text-base-content/70 hover:text-base-content'"
                @click="triggerFileUpload"
              >
                📤 Egen bild
              </button>
              <button
                type="button"
                class="py-1.5 px-1 rounded-lg text-center font-bold text-[11px] transition-all cursor-pointer truncate"
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

            <div>
              <label class="block font-semibold text-base-content/80 mb-0.5 text-[11px]">Topprubrik / Kallelse</label>
              <input
                v-model="headline"
                type="text"
                class="input input-bordered input-sm w-full bg-base-100 text-xs"
                placeholder="LIVE PÅ SCEN"
              >
            </div>

            <div>
              <label class="block font-semibold text-base-content/80 mb-0.5 text-[11px]">Bandets undertitel</label>
              <input
                v-model="subheadline"
                type="text"
                class="input input-bordered input-sm w-full bg-base-100 text-xs"
                placeholder="ÄKTA BLUES & SVÄNGIG ROCK 'N' ROLL"
              >
            </div>

            <div>
              <label class="block font-semibold text-base-content/80 mb-0.5 text-[11px]">Biljett- & entréinfo (valfritt)</label>
              <input
                v-model="customNotes"
                type="text"
                class="input input-bordered input-sm w-full bg-base-100 text-xs"
                placeholder="t.ex. Fri entré • Dörrarna öppnar kl 19"
              >
            </div>

            <label class="flex items-center gap-2 cursor-pointer pt-1">
              <input
                v-model="includeBandMembers"
                type="checkbox"
                class="checkbox checkbox-primary checkbox-xs"
              >
              <span class="font-bold text-base-content/80 text-[11px]">Inkludera medlemsrad (Janis, Marcus, Bosse, Jonas)</span>
            </label>
          </div>

          <!-- 4. Quick Actions Panel -->
          <div class="pt-1 flex flex-col gap-2">
            <!-- Story Result Alert -->
            <div
              v-if="storyPublishResult"
              class="p-3 rounded-xl border text-xs font-bold transition-all"
              :class="storyPublishResult.success ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/10 border-rose-500/40 text-rose-400'"
            >
              {{ storyPublishResult.message }}
            </div>

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

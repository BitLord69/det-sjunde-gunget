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

// Admin auth & upload for direct Story broadcasting
const { adminUser } = useAdminAuth()
const { uploadAdminFile } = useAdminUpload()
const isPublishingStory = ref(false)
const storyPublishResult = ref<{ success: boolean; message: string } | null>(null)

// Poster Settings
const selectedTheme = ref<'sonet' | 'chess' | 'sun' | 'neon'>('sonet')
const selectedFormat = ref<'a4' | 'story' | 'square'>('a4')
const headline = ref('LIVE PÅ SCEN')
const subheadline = ref('ÄKTA BLUES & SVÄNGIG ROCK \'N\' ROLL')
const customNotes = ref('')
const includeBandMembers = ref(true)

// Format dimensions
const dimensions = computed(() => {
  switch (selectedFormat.value) {
    case 'story':
      return { width: 1080, height: 1920, label: 'Story (9:16)' }
    case 'square':
      return { width: 1080, height: 1080, label: 'Kvadrat (1:1)' }
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
    paperTint: '#1c1612',
    primary: '#d4af37', // Vintage Gold
    secondary: '#f3e5ab', // Cream
    accent: '#c0392b', // Rust Red
    border: '#d4af37',
    tagBg: '#2a1f18',
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
  },
  sun: {
    name: 'Sun Studio Memphis',
    bg: '#181512',
    paperTint: '#241e19',
    primary: '#f39c12', // Warm Sun Amber
    secondary: '#fdfefe', // Sharp White
    accent: '#e74c3c', // Red
    border: '#f39c12',
    tagBg: '#34271d',
  },
  neon: {
    name: 'Midnight Club Neon',
    bg: '#0a0a0f',
    paperTint: '#12121c',
    primary: '#00e5ff', // Electric Cyan
    secondary: '#ff9100', // Amber Neon
    accent: '#ff0055', // Hot Pink
    border: '#00e5ff',
    tagBg: '#1a1a2e',
  },
}

// Watchers to trigger redrawing
watch(
  [() => props.gig, selectedTheme, selectedFormat, headline, subheadline, customNotes, includeBandMembers, isOpen],
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
    return d.toLocaleDateString('sv-SE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).toUpperCase()
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

// Draw the authentic vintage poster on Canvas
const drawPoster = () => {
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

  // Subtle radial paper gradient
  const grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width * 0.75)
  grad.addColorStop(0, theme.paperTint)
  grad.addColorStop(1, theme.bg)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  // 2. Vintage Ornate Border Frame
  const margin = Math.round(width * 0.04)
  ctx.strokeStyle = theme.border
  ctx.lineWidth = Math.round(width * 0.007)
  ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2)

  // Inner hairline border
  const innerMargin = margin + Math.round(width * 0.015)
  ctx.lineWidth = Math.round(width * 0.0025)
  ctx.strokeRect(innerMargin, innerMargin, width - innerMargin * 2, height - innerMargin * 2)

  // Corner flourishes
  const cornerSize = Math.round(width * 0.035)
  const drawCorner = (x: number, y: number, angle: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.fillStyle = theme.primary
    ctx.fillRect(0, 0, cornerSize, cornerSize * 0.25)
    ctx.fillRect(0, 0, cornerSize * 0.25, cornerSize)
    ctx.restore()
  }
  drawCorner(innerMargin, innerMargin, 0)
  drawCorner(width - innerMargin, innerMargin, Math.PI / 2)
  drawCorner(width - innerMargin, height - innerMargin, Math.PI)
  drawCorner(innerMargin, height - innerMargin, -Math.PI / 2)

  // 3. Header Tagline Badge ("LIVE PÅ SCEN")
  let currentY = margin + Math.round(height * 0.055)
  ctx.textAlign = 'center'

  if (headline.value.trim()) {
    ctx.font = `900 ${Math.round(width * 0.035)}px 'Alfa Slab One', 'Arvo', serif`
    ctx.fillStyle = theme.accent
    ctx.letterSpacing = '0.2em'
    ctx.fillText(`★  ${headline.value.trim().toUpperCase()}  ★`, width / 2, currentY)
  }

  // 4. Band Wordmark ("DET 7:e GUNGET")
  currentY += Math.round(height * 0.08)
  ctx.fillStyle = theme.primary
  ctx.font = `900 ${Math.round(width * 0.09)}px 'Alfa Slab One', 'Arvo', serif`
  ctx.letterSpacing = '0.04em'
  ctx.fillText('DET 7:e GUNGET', width / 2, currentY)

  // Subtitle / Musical genres
  currentY += Math.round(height * 0.035)
  ctx.fillStyle = theme.secondary
  ctx.font = `700 ${Math.round(width * 0.024)}px 'Arvo', serif`
  ctx.letterSpacing = '0.18em'
  ctx.fillText(subheadline.value.trim().toUpperCase(), width / 2, currentY)

  // Ornamental Divider Line
  currentY += Math.round(height * 0.025)
  ctx.strokeStyle = theme.primary
  ctx.lineWidth = Math.round(width * 0.003)
  ctx.beginPath()
  ctx.moveTo(width * 0.25, currentY)
  ctx.lineTo(width * 0.75, currentY)
  ctx.stroke()

  // Harmonica / Music Icon in center of line
  ctx.fillStyle = theme.bg
  ctx.fillRect(width / 2 - 25, currentY - 15, 50, 30)
  ctx.fillStyle = theme.primary
  ctx.font = `${Math.round(width * 0.03)}px sans-serif`
  ctx.fillText('⚡', width / 2, currentY + 9)

  // 5. Giant Venue Name Box
  currentY += Math.round(height * 0.075)
  const venueBoxPadding = Math.round(width * 0.05)
  const venueText = props.gig.venue || 'SPELSTÄLLE'

  // Measure and dynamic font size for venue
  let venueFontSize = Math.round(width * 0.075)
  ctx.font = `900 ${venueFontSize}px 'Alfa Slab One', 'Arvo', serif`
  while (ctx.measureText(venueText).width > width - venueBoxPadding * 2 && venueFontSize > 24) {
    venueFontSize -= 2
    ctx.font = `900 ${venueFontSize}px 'Alfa Slab One', 'Arvo', serif`
  }

  // Venue background banner
  const venueBannerHeight = venueFontSize * 1.5
  ctx.fillStyle = theme.tagBg
  ctx.fillRect(margin + 20, currentY - venueFontSize * 0.9, width - (margin + 20) * 2, venueBannerHeight)
  ctx.strokeStyle = theme.primary
  ctx.lineWidth = Math.round(width * 0.003)
  ctx.strokeRect(margin + 20, currentY - venueFontSize * 0.9, width - (margin + 20) * 2, venueBannerHeight)

  ctx.fillStyle = theme.primary
  ctx.fillText(venueText.toUpperCase(), width / 2, currentY)

  // 6. City Banner
  currentY += Math.round(height * 0.065)
  const cityText = props.gig.city || 'SVERIGE'
  ctx.fillStyle = theme.secondary
  ctx.font = `900 ${Math.round(width * 0.05)}px 'Alfa Slab One', 'Arvo', serif`
  ctx.letterSpacing = '0.25em'
  ctx.fillText(cityText.toUpperCase(), width / 2, currentY)

  // 7. Date & Time Display Box
  currentY += Math.round(height * 0.07)
  const dateStr = formatGigDate(props.gig.date)
  const timeStr = formatGigTime(props.gig.date)

  ctx.fillStyle = theme.accent
  ctx.font = `900 ${Math.round(width * 0.038)}px 'Alfa Slab One', 'Arvo', serif`
  ctx.letterSpacing = '0.08em'
  ctx.fillText(dateStr, width / 2, currentY)

  if (timeStr) {
    currentY += Math.round(height * 0.04)
    ctx.fillStyle = theme.secondary
    ctx.font = `700 ${Math.round(width * 0.03)}px 'Arvo', serif`
    ctx.letterSpacing = '0.12em'
    ctx.fillText(`DÖRRARNA ÖPPNAR KL ${timeStr}`, width / 2, currentY)
  }

  // 8. Custom Extra Info / Ticket status
  currentY += Math.round(height * 0.05)
  const infoText = customNotes.value.trim() ||
    (props.gig.status === 'sold_out'
      ? '★ UTSÅLT! (FULLSATT HUS) ★'
      : props.gig.status === 'free'
        ? '★ FRI ENTRÉ • VÄLKOMNA! ★'
        : 'BILJETTER & INFO PÅ WWW.SJUNDEGUNGET.SE')

  ctx.fillStyle = theme.primary
  ctx.font = `800 ${Math.round(width * 0.026)}px 'Arvo', sans-serif`
  ctx.letterSpacing = '0.1em'
  ctx.fillText(infoText.toUpperCase(), width / 2, currentY)

  // 9. Band Members & Website Footer
  if (includeBandMembers.value) {
    currentY = height - margin - Math.round(height * 0.07)
    ctx.fillStyle = theme.secondary
    ctx.font = `600 ${Math.round(width * 0.022)}px 'Inter', sans-serif`
    ctx.letterSpacing = '0.15em'
    ctx.fillText('JANIS  •  MARCUS  •  BOSSE  •  JONAS', width / 2, currentY)
  }

  // Official URL / Footer tag
  const footerY = height - margin - Math.round(height * 0.03)
  ctx.fillStyle = theme.primary
  ctx.font = `900 ${Math.round(width * 0.02)}px 'Alfa Slab One', 'Arvo', sans-serif`
  ctx.letterSpacing = '0.22em'
  ctx.fillText('WWW.SJUNDEGUNGET.SE', width / 2, footerY)
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
        // Fallback: download instead
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
      drawPoster()
      // Ge canvas en liten stund att rendera fullt ut
      await new Promise((r) => setTimeout(r, 100))
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
    const errorMsg = err && typeof err === 'object' && 'data' in err && (err as any).data?.message
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
    <div class="stage-card p-5 sm:p-8 rounded-3xl border border-primary/40 shadow-2xl max-w-5xl w-full bg-base-100 space-y-6 my-6 max-h-[92vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-primary/20 pb-4 flex-shrink-0">
        <div>
          <h2 class="font-heading text-xl sm:text-2xl text-primary font-bold flex items-center gap-2">
            <span>🎨</span>
            <span>Vintage Gig-affisch Studio</span>
          </h2>
          <p class="text-xs text-base-content/70">
            Skapa retro konsertaffischer för {{ gig.venue }} i {{ gig.city }}. Ladda ner i hög upplösning för sociala medier eller tryck.
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
      <div class="grid lg:grid-cols-[1.1fr_1.3fr] gap-6 overflow-y-auto pr-1 flex-1 min-h-0 items-start">
        <!-- Controls Panel Left -->
        <div class="space-y-4 text-xs">
          <!-- 1. Theme Selector -->
          <div class="space-y-1.5">
            <label class="block font-bold text-secondary uppercase tracking-wider text-[11px]">
              1. Välj Retrostil & Färgtema
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="(tItem, key) in themes"
                :key="key"
                type="button"
                class="p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer"
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
          </div>

          <!-- 2. Format Selector -->
          <div class="space-y-1.5">
            <label class="block font-bold text-secondary uppercase tracking-wider text-[11px]">
              2. Affischformat
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                class="py-2 px-3 rounded-xl border text-center transition-all cursor-pointer font-bold"
                :class="selectedFormat === 'a4' ? 'border-primary bg-primary/15 text-primary' : 'border-base-content/10 bg-base-200/60 text-base-content/70'"
                @click="selectedFormat = 'a4'"
              >
                📄 A4 (3:4)
              </button>
              <button
                type="button"
                class="py-2 px-3 rounded-xl border text-center transition-all cursor-pointer font-bold"
                :class="selectedFormat === 'story' ? 'border-primary bg-primary/15 text-primary' : 'border-base-content/10 bg-base-200/60 text-base-content/70'"
                @click="selectedFormat = 'story'"
              >
                📱 Story (9:16)
              </button>
              <button
                type="button"
                class="py-2 px-3 rounded-xl border text-center transition-all cursor-pointer font-bold"
                :class="selectedFormat === 'square' ? 'border-primary bg-primary/15 text-primary' : 'border-base-content/10 bg-base-200/60 text-base-content/70'"
                @click="selectedFormat = 'square'"
              >
                ⬛ Feed (1:1)
              </button>
            </div>
          </div>

          <!-- 3. Custom Text Fields -->
          <div class="space-y-3 p-3.5 rounded-2xl bg-base-200/70 border border-primary/20">
            <div>
              <label class="block font-bold text-base-content/80 mb-1">Topprubrik / Kallelse</label>
              <input
                v-model="headline"
                type="text"
                class="input input-bordered input-sm w-full bg-base-100 text-xs"
                placeholder="LIVE PÅ SCEN"
              >
            </div>

            <div>
              <label class="block font-bold text-base-content/80 mb-1">Bandets undertitel</label>
              <input
                v-model="subheadline"
                type="text"
                class="input input-bordered input-sm w-full bg-base-100 text-xs"
                placeholder="ÄKTA BLUES & SVÄNGIG ROCK 'N' ROLL"
              >
            </div>

            <div>
              <label class="block font-bold text-base-content/80 mb-1">Biljett- & entréinfo (valfritt)</label>
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
              <span class="font-bold text-base-content/80">Inkludera medlemsrad (Janis, Marcus, Bosse, Jonas)</span>
            </label>
          </div>

          <!-- Quick Actions Panel -->
          <div class="pt-2 flex flex-col gap-2">
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

          <div class="max-w-full max-h-[55vh] flex items-center justify-center overflow-hidden rounded-xl shadow-2xl border border-primary/30">
            <canvas
              ref="canvasRef"
              class="w-auto h-auto max-h-[55vh] max-w-full object-contain"
            />
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between pt-3 border-t border-primary/20 flex-shrink-0">
        <span class="text-xs text-base-content/60">
          Tips: Ladda ner som Story (9:16) för Instagram/Facebook, eller A4 för utskrift på dörren!
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

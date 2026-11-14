<script setup lang="ts">
import {
  bandPhotos,
  downloadBlankSunburstTemplate,
  getPosterDimensions,
  posterFonts,
  posterThemes as themes,
  renderGigPosterToCanvas,
  type GigPosterItem,
  type PosterFontKey,
  type PosterFontOption,
  type PosterFormatKey,
  type PosterPhotoFilter,
  type PosterThemeKey,
} from '~/utils/gig-poster-canvas'

interface GalleryPhotoItem {
  id: string
  url: string
  title?: string | null
}

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

// Poster Settings
const selectedTheme = ref<PosterThemeKey>('sunburst')
const selectedFormat = ref<PosterFormatKey>('a4')
const selectedFont = ref<PosterFontKey>('poetsen')
const topPresenter = ref('')
const headline = ref('LIVE PÅ SCEN')
const subheadline = ref("ÄKTA BLUES & SVÄNGIG ROCK 'N' ROLL")
const customNotes = ref('')
const includeBandMembers = ref(true)

const activeFontOption = computed<PosterFontOption>(() => {
  return posterFonts.find((f) => f.key === selectedFont.value) || posterFonts[0]!
})

// Band Logo & Photo Customization
const useBandLogo = ref(true)
const logoSize = ref<'normal' | 'large'>('large')
const imageSource = ref<'photoshoot' | 'gallery' | 'upload' | 'ai' | 'none'>('none')
const selectedBandPhoto = ref('/media/band/21..7de Gunget photoshoot1 21-6 26-3.jpg')
const selectedGalleryPhoto = ref('')
const customUploadedPhoto = ref<string | null>(null)
const photoFilter = ref<PosterPhotoFilter>('vintage')

const selectThemeOption = (key: PosterThemeKey) => {
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
const dimensions = computed(() => getPosterDimensions(selectedFormat.value))

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

  await renderGigPosterToCanvas(
    canvas,
    props.gig,
    {
      selectedTheme: selectedTheme.value,
      selectedFormat: selectedFormat.value,
      fontOpt: activeFontOption.value,
      topPresenter: topPresenter.value,
      headline: headline.value,
      subheadline: subheadline.value,
      customNotes: customNotes.value,
      includeBandMembers: includeBandMembers.value,
      useBandLogo: useBandLogo.value,
      logoSize: logoSize.value,
      activePhotoUrl: activePhotoUrl.value,
      photoFilter: photoFilter.value,
    },
    () => renderId !== currentRenderId,
  )
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
                  <img :src="item.url" :alt="item.title || 'Galleribild'" class="w-full h-full object-cover">
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

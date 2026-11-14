<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  songTitle: string
  isOriginal: boolean
  originalArtist: string
  lyrics: string
  currentCoverImage: string
  initialUploadedUrl?: string | null
  galleryPhotos: Array<{ id: string; mediaUrl: string; captionSv?: string; epkTitleSv?: string }>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  apply: [coverUrl: string]
  toast: [message: string]
}>()

const { isUploading, uploadAdminFile } = useAdminUpload()

const bandPhotosList = BAND_PHOTOSHOOT_LIST

const isGeneratingCover = ref(false)
const aiCoverProgressStep = ref(1)
const aiCoverSource = ref<'photo' | 'ai'>('photo')
const photoSubSource = ref<'band' | 'gallery' | 'upload'>('band')
const selectedBandPhoto = ref(bandPhotosList[0]?.path || DEFAULT_BAND_PHOTO_PATH)
const selectedGalleryPhoto = ref<string>('')
const uploadedCoverPhoto = ref<string | null>(null)

const aiLayout = ref<'top_bottom' | 'diagonal_sash' | 'sidebar_modern' | 'poster_frame' | 'center_badge' | 'auto'>('top_bottom')
const aiStylePreset = ref<'auto' | 'sonet_gold' | 'chess_crimson' | 'stax_amber' | 'bluenote_navy' | 'vintage_cream' | 'harvest_green' | 'monochrome_accent'>('auto')
const aiAgingEffect = ref<'none' | 'ringwear' | 'worn_cardboard' | 'both'>('ringwear')
const aiPhotoFilter = ref<'natural' | 'vintage_warm' | 'bw' | 'punchy'>('vintage_warm')
const aiBadgeFormat = ref<'45_rpm' | 'stereo' | 'mono'>('45_rpm')
const aiCustomSubtitle = ref('')
const aiCatalogNumber = ref('')

const generateFunCatalogNumber = () => {
  const prefixes = ['D7G', 'GUNGET', 'BLUES', 'SEVENTH', 'GROOVE', 'SONET', 'CHESS', 'DELTA', 'MOJO', 'STAX', 'HARVEST', 'CHICAGO']
  const formats = ['45', 'SP', '7', 'EP']
  const randomNum = Math.floor(Math.random() * 899) + 100
  const p = prefixes[Math.floor(Math.random() * prefixes.length)] || 'D7G'
  const f = formats[Math.floor(Math.random() * formats.length)] || '45'
  return `${p}-${f}-${randomNum}`
}

const aiEra = ref<'60s' | '70s'>('70s')
const aiTextRenderer = ref<'theme' | 'ai_native'>('theme')
const aiIncludeBand = ref(false)
const aiPromptMode = ref<'standard' | 'custom'>('standard')
const aiCustomPrompt = ref('')
const aiEngineHealth = ref<{ engine: string; available: boolean; message: string } | null>(null)
const isCheckingEngine = ref(false)
const generatedCoverResult = ref<{
  success: boolean
  url: string
  coverUrl?: string
  engine?: string
  styleName?: string
  layout?: string
  agingEffect?: string
  title?: string
  prompt?: string
} | null>(null)
const aiGenerationError = ref<string | null>(null)
const showCoverZoomModal = ref(false)
const currentCanvasBlob = ref<Blob | null>(null)
const isApplyingCover = ref(false)

const checkEngineHealth = async () => {
  isCheckingEngine.value = true
  try {
    const res = await $fetch<{ engine: string; available: boolean; message: string }>('/api/admin/songs/cover-engine-status')
    aiEngineHealth.value = res
  } catch (err: unknown) {
    const errorObj = err as { statusCode?: number; data?: { statusCode?: number; statusMessage?: string; message?: string }; message?: string }
    const isAuth = errorObj?.statusCode === 401 || errorObj?.data?.statusCode === 401 || errorObj?.data?.statusMessage === 'Unauthorized'
    aiEngineHealth.value = {
      engine: 'gemini',
      available: false,
      message: isAuth ? 'Inloggningen har löpt ut – logga in på nytt' : (errorObj?.data?.message || errorObj?.data?.statusMessage || 'Kunde inte kontakta AI-motorn'),
    }
  } finally {
    isCheckingEngine.value = false
  }
}

watch(
  () => [props.modelValue, props.initialUploadedUrl] as const,
  ([isOpen, explicitUploadUrl]) => {
    if (!isOpen) return
    if (explicitUploadUrl) {
      uploadedCoverPhoto.value = explicitUploadUrl
      photoSubSource.value = 'upload'
      aiCoverSource.value = 'photo'
    } else {
      const isBand = bandPhotosList.some((b) => b.path === props.currentCoverImage)
      const isGal = props.galleryPhotos.some((g) => g.mediaUrl === props.currentCoverImage)
      if (isBand) {
        selectedBandPhoto.value = props.currentCoverImage
        uploadedCoverPhoto.value = null
        photoSubSource.value = 'band'
      } else if (isGal) {
        selectedGalleryPhoto.value = props.currentCoverImage
        uploadedCoverPhoto.value = null
        photoSubSource.value = 'gallery'
      } else {
        uploadedCoverPhoto.value = null
        photoSubSource.value = 'band'
      }
      aiCoverSource.value = 'photo'
    }

    if (!aiCatalogNumber.value) {
      aiCatalogNumber.value = generateFunCatalogNumber()
    }

    generatedCoverResult.value = null
    aiGenerationError.value = null
    checkEngineHealth()
    generateCoverWithAi()
  },
  { immediate: true },
)

const handleCoverPhotoUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const file = input.files[0]
  if (!file) return

  try {
    emit('toast', `⏳ Laddar upp ${file.name} till Cover Studio...`)
    const url = await uploadAdminFile(file, {
      onProgress: (p) => {
        if (p > 0 && p < 100) {
          emit('toast', `⏳ Laddar upp ${file.name} (${p}%)...`)
        }
      },
    })
    uploadedCoverPhoto.value = url
    photoSubSource.value = 'upload'
    aiCoverSource.value = 'photo'
    if (!aiCatalogNumber.value) {
      aiCatalogNumber.value = generateFunCatalogNumber()
    }
    emit('toast', '✓ Fotot laddades upp! Skapar nu omslag med bandnamn & låttitel...')
    await generateCoverWithAi()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Kunde inte ladda upp filen'
    emit('toast', `⚠️ Uppladdning misslyckades: ${msg}`)
  } finally {
    input.value = ''
  }
}

const randomizeCoverStyle = () => {
  const layouts = ['top_bottom', 'diagonal_sash', 'sidebar_modern', 'poster_frame', 'center_badge'] as const
  const styles = ['sonet_gold', 'chess_crimson', 'stax_amber', 'bluenote_navy', 'vintage_cream', 'harvest_green', 'monochrome_accent'] as const
  const agings = ['ringwear', 'both', 'worn_cardboard', 'none'] as const
  const filters = ['vintage_warm', 'natural', 'bw', 'punchy'] as const
  const badges = ['45_rpm', 'stereo', 'mono'] as const

  aiLayout.value = layouts[Math.floor(Math.random() * layouts.length)] || 'top_bottom'
  aiStylePreset.value = styles[Math.floor(Math.random() * styles.length)] || 'sonet_gold'
  aiAgingEffect.value = agings[Math.floor(Math.random() * agings.length)] || 'ringwear'
  aiPhotoFilter.value = filters[Math.floor(Math.random() * filters.length)] || 'vintage_warm'
  aiBadgeFormat.value = badges[Math.floor(Math.random() * badges.length)] || '45_rpm'
  aiCatalogNumber.value = generateFunCatalogNumber()

  if (aiCoverSource.value === 'photo' && photoSubSource.value === 'gallery' && props.galleryPhotos.length > 0) {
    const randomGal = props.galleryPhotos[Math.floor(Math.random() * props.galleryPhotos.length)]
    if (randomGal?.mediaUrl) {
      selectedGalleryPhoto.value = randomGal.mediaUrl
    }
  } else if (aiCoverSource.value === 'photo' && photoSubSource.value === 'band') {
    const randomPhoto = bandPhotosList[Math.floor(Math.random() * bandPhotosList.length)]
    if (randomPhoto) {
      selectedBandPhoto.value = randomPhoto.path
    }
  }

  emit('toast', `🎲 Slumpade stil & katalognr ${aiCatalogNumber.value}!`)
  generateCoverWithAi()
}

let coverDebounceTimer: ReturnType<typeof setTimeout> | null = null

const debouncedGenerateCover = (delay = 750) => {
  if (coverDebounceTimer) {
    clearTimeout(coverDebounceTimer)
  }
  coverDebounceTimer = setTimeout(() => {
    generateCoverWithAi()
  }, delay)
}

const randomizeCatalogNumber = () => {
  if (coverDebounceTimer) {
    clearTimeout(coverDebounceTimer)
    coverDebounceTimer = null
  }
  aiCatalogNumber.value = generateFunCatalogNumber()
  generateCoverWithAi()
}

const generateCoverWithAi = async () => {
  if (coverDebounceTimer) {
    clearTimeout(coverDebounceTimer)
    coverDebounceTimer = null
  }
  isGeneratingCover.value = true
  aiGenerationError.value = null
  aiCoverProgressStep.value = 1

  const stepTimer = setInterval(() => {
    if (aiCoverProgressStep.value < 4) {
      aiCoverProgressStep.value++
    }
  }, 400)

  try {
    let activePhoto = ''
    if (aiCoverSource.value === 'photo') {
      if (photoSubSource.value === 'upload' && uploadedCoverPhoto.value) {
        activePhoto = uploadedCoverPhoto.value
      } else if (photoSubSource.value === 'gallery' && selectedGalleryPhoto.value) {
        activePhoto = selectedGalleryPhoto.value
      } else if (photoSubSource.value === 'gallery' && props.galleryPhotos[0]?.mediaUrl) {
        activePhoto = props.galleryPhotos[0].mediaUrl
        selectedGalleryPhoto.value = activePhoto
      } else {
        activePhoto = selectedBandPhoto.value || bandPhotosList[0]?.path || '/media/band/21..7de Gunget photoshoot1 21-6 26-3.jpg'
      }

      try {
        const canvasResult = await renderCoverStudioCanvas({
          title: props.songTitle || 'Det 7:e Gunget',
          bandName: 'DET 7:e GUNGET',
          subtitle: aiCustomSubtitle.value || undefined,
          catalogNumber: aiCatalogNumber.value || undefined,
          isOriginal: props.isOriginal,
          originalArtist: props.originalArtist || undefined,
          layout: aiLayout.value,
          stylePreset: aiStylePreset.value,
          agingEffect: aiAgingEffect.value,
          photoFilter: aiPhotoFilter.value,
          badgeFormat: aiBadgeFormat.value,
          sourceImageUrl: activePhoto,
        })

        clearInterval(stepTimer)
        currentCanvasBlob.value = canvasResult.blob
        generatedCoverResult.value = {
          success: true,
          url: canvasResult.dataUrl,
          coverUrl: canvasResult.dataUrl,
          engine: 'canvas',
          styleName: canvasResult.chosenStyle,
          layout: canvasResult.chosenLayout,
          agingEffect: canvasResult.chosenAging,
          title: props.songTitle || 'Det 7:e Gunget',
        }
        emit('toast', '✓ Singelomslag stämplat och klart!')
        return
      } catch (canvasErr) {
        console.warn('[CoverStudio] Client canvas render fallback to server:', canvasErr)
      }
    }

    const res = await $fetch<{
      success: boolean
      coverUrl: string
      url: string
      source: string
      engine: string
      styleName: string
      layout?: string
      agingEffect?: string
      title?: string
      prompt?: string
    }>('/api/admin/songs/generate-cover', {
      method: 'POST',
      body: {
        title: props.songTitle || 'Det 7:e Gunget Singel',
        isOriginal: props.isOriginal,
        originalArtist: props.originalArtist,
        lyrics: props.lyrics,
        era: aiEra.value,
        stylePreset: aiStylePreset.value,
        layout: aiLayout.value,
        agingEffect: aiAgingEffect.value,
        photoFilter: aiPhotoFilter.value,
        badgeFormat: aiBadgeFormat.value,
        subtitle: aiCustomSubtitle.value || undefined,
        catalogNumber: aiCatalogNumber.value || undefined,
        includeBand: aiIncludeBand.value,
        customPrompt: aiPromptMode.value === 'custom' ? aiCustomPrompt.value : undefined,
        textRenderer: aiTextRenderer.value,
        source: aiCoverSource.value,
        photoPath: activePhoto,
        photoUrl: activePhoto,
      },
    })

    clearInterval(stepTimer)
    const coverResultUrl = res.coverUrl || res.url
    if (res.success && coverResultUrl) {
      currentCanvasBlob.value = null
      generatedCoverResult.value = {
        ...res,
        url: coverResultUrl,
        coverUrl: coverResultUrl,
      }
      emit('toast', '✓ Singelomslaget har skapats!')
    } else {
      aiGenerationError.value = 'Inget bildresultat returnerades från servern.'
    }
  } catch (err: unknown) {
    clearInterval(stepTimer)
    const errorObj = err as { statusCode?: number; data?: { statusCode?: number; statusMessage?: string; message?: string }; message?: string }
    const isAuth = errorObj?.statusCode === 401 || errorObj?.data?.statusCode === 401 || errorObj?.data?.statusMessage === 'Unauthorized'
    const errMsg = isAuth
      ? 'Inloggningssessionen har löpt ut. Logga in igen som administratör för att använda Gemini AI.'
      : (errorObj?.data?.message || errorObj?.data?.statusMessage || errorObj?.message || 'Ett fel uppstod vid bildgenerering.')
    aiGenerationError.value = errMsg
    emit('toast', `⚠️ ${errMsg}`)
  } finally {
    isGeneratingCover.value = false
  }
}

const applyGeneratedCover = async () => {
  const chosenUrl = generatedCoverResult.value?.coverUrl || generatedCoverResult.value?.url
  if (!chosenUrl) return

  if (chosenUrl.startsWith('data:') && currentCanvasBlob.value) {
    try {
      isApplyingCover.value = true
      emit('toast', '⏳ Sparar och laddar upp singelomslaget till molnet...')
      const safeTitle = (props.songTitle || 'omslag').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)
      const fileName = `cover_${safeTitle}_${Date.now()}.jpg`
      const file = new File([currentCanvasBlob.value], fileName, { type: 'image/jpeg' })
      const uploadedUrl = await uploadAdminFile(file)
      showCoverZoomModal.value = false
      emit('apply', uploadedUrl)
      emit('update:modelValue', false)
      emit('toast', '✓ Singelomslaget har sparats och tilldelats låten!')
      return
    } catch (uploadErr: unknown) {
      const msg = uploadErr instanceof Error ? uploadErr.message : 'Kunde inte ladda upp omslaget'
      const errObj = uploadErr as { statusCode?: number }
      const isAuthErr = msg.includes('Obehörig') || msg.includes('Unauthorized') || errObj?.statusCode === 401
      if (isAuthErr) {
        aiGenerationError.value = 'Inloggningssessionen har löpt ut. Logga in i ny flik och klicka sedan på "Använd detta omslag" igen.'
        emit('toast', '⚠️ Inloggningen har löpt ut. Logga in igen för att spara omslaget.')
      } else {
        emit('toast', `⚠️ Uppladdning misslyckades: ${msg}`)
      }
      return
    } finally {
      isApplyingCover.value = false
    }
  }

  showCoverZoomModal.value = false
  emit('apply', chosenUrl)
  emit('update:modelValue', false)
  emit('toast', '✓ Omslaget har tilldelats låten! Kom ihåg att spara låten när du är klar.')
}
</script>

<template>
  <!-- VINTAGE VINYL & AI COVER STUDIO MODAL -->
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden"
  >
    <div class="stage-card max-w-5xl w-full max-h-[94vh] flex flex-col rounded-3xl border-2 border-primary/40 shadow-2xl bg-base-100 relative overflow-hidden">
      <!-- 1. Header -->
      <div class="flex items-center justify-between gap-3 border-b border-primary/20 p-3 sm:px-5 sm:py-3.5 flex-shrink-0 bg-base-100">
        <div class="space-y-0.5">
          <div class="flex items-center gap-2">
            <span class="text-xl animate-pulse">✨</span>
            <h3 class="font-heading text-base sm:text-lg text-primary font-black">
              Cover Studio (7"-singel)
            </h3>
          </div>
          <p class="text-[11px] text-base-content/70 hidden sm:block">
            Skapa autentiskt vinylsingelomslag för <strong class="text-primary font-bold">{{ songTitle || 'låten' }}</strong>. Bandnamn & låttitel stämplas automatiskt.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            v-if="generatedCoverResult"
            type="button"
            class="btn btn-xs btn-primary rounded-full font-bold px-3 py-1.5 h-auto flex items-center gap-1 cursor-pointer shadow-md hover:scale-105 transition-transform"
            title="Spara och tilldela detta omslag till låten"
            :disabled="isGeneratingCover || isApplyingCover"
            @click="applyGeneratedCover"
          >
            <span v-if="isApplyingCover" class="loading loading-spinner loading-xs" />
            <span v-else>✓</span>
            <span>{{ isApplyingCover ? 'Sparar...' : 'Använd omslag' }}</span>
          </button>

          <button
            type="button"
            class="btn btn-xs btn-outline btn-secondary rounded-full font-bold px-3 py-1.5 h-auto flex items-center gap-1 cursor-pointer"
            title="Slumpa fram en helt ny kombination av layout, färg och patina!"
            :disabled="isGeneratingCover"
            @click="randomizeCoverStyle"
          >
            <span>🎲</span>
            <span class="hidden sm:inline">Slumpa stil</span>
          </button>

          <div
            v-if="aiEngineHealth"
            class="hidden sm:flex badge badge-sm gap-1.5 font-mono py-2 px-2.5 border shadow-sm"
            :class="aiEngineHealth.available ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-amber-500/15 border-amber-500/40 text-amber-300'"
            :title="aiEngineHealth.message"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="aiEngineHealth.available ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'" />
            <span class="font-bold text-[9px]">{{ aiEngineHealth.available ? 'Gemini AI Aktiv' : 'Grafikmotor' }}</span>
          </div>

          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost text-lg cursor-pointer"
            :disabled="isGeneratingCover"
            @click="emit('update:modelValue', false)"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- 2. Body -->
      <div class="p-3 sm:p-4 overflow-y-auto flex-1">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
          <!-- LEFT COLUMN: Låtinfo & Bildkälla -->
          <div class="md:col-span-6 space-y-2.5 text-xs">
            <div class="p-2.5 bg-base-200/80 rounded-xl border border-primary/20 space-y-1.5">
              <div class="flex items-center justify-between">
                <div class="truncate mr-2">
                  <span class="text-[9px] uppercase font-bold text-secondary tracking-wider block">Låt & Band</span>
                  <span class="font-heading font-black text-primary text-sm truncate">{{ songTitle || 'Namnlös låt' }}</span>
                  <span class="text-base-content/80 ml-1.5 font-mono text-[10px] font-bold">
                    • DET 7:e GUNGET
                  </span>
                </div>
                <span class="badge badge-xs font-mono flex-shrink-0" :class="isOriginal ? 'badge-primary font-bold' : 'badge-outline border-secondary text-secondary'">
                  {{ isOriginal ? 'SIDA A (Original)' : 'SIDA B (Cover)' }}
                </span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-primary/10 text-[11px]">
                <div>
                  <label class="block text-[9px] text-base-content/60 font-mono mb-0.5">Undertitel (Valfritt):</label>
                  <input
                    v-model="aiCustomSubtitle"
                    type="text"
                    :placeholder="isOriginal ? 'ORIGINALKOMPOSITION' : `COVER AV ${(originalArtist || '').toUpperCase()}`"
                    class="input input-bordered input-xs w-full bg-base-100 font-mono text-[10px]"
                    @input="debouncedGenerateCover(750)"
                    @blur="generateCoverWithAi"
                    @keydown.enter.prevent="generateCoverWithAi"
                  >
                </div>
                <div>
                  <label class="block text-[9px] text-base-content/60 font-mono mb-0.5">Katalognummer:</label>
                  <div class="flex items-center gap-1">
                    <input
                      v-model="aiCatalogNumber"
                      type="text"
                      placeholder="T.ex. D7G-45-777"
                      class="input input-bordered input-xs flex-1 bg-base-100 font-mono text-[10px]"
                      @input="debouncedGenerateCover(750)"
                      @blur="generateCoverWithAi"
                      @keydown.enter.prevent="generateCoverWithAi"
                    >
                    <button
                      type="button"
                      class="btn btn-xs btn-outline btn-secondary font-mono text-[10px] px-2 h-6 min-h-0 cursor-pointer flex items-center gap-1 shadow-sm flex-shrink-0"
                      title="Slumpa ett nytt vintage katalognummer"
                      @click="randomizeCatalogNumber"
                    >
                      <span>🎲</span>
                      <span>Slumpa</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bildkälla -->
            <div class="space-y-1.5">
              <span class="text-[11px] font-bold text-secondary flex items-center justify-between">
                <span class="flex items-center gap-1.5">
                  <span>🖼️</span> Välj bildkälla:
                </span>
                <span v-if="aiCoverSource === 'photo' && photoSubSource === 'upload' && uploadedCoverPhoto" class="text-[10px] text-emerald-400 font-mono">
                  ✓ Eget foto aktivt
                </span>
                <span v-else-if="aiCoverSource === 'photo' && photoSubSource === 'gallery'" class="text-[10px] text-secondary font-mono">
                  ✓ Galleribild aktiv
                </span>
                <span v-else-if="aiCoverSource === 'photo' && photoSubSource === 'band'" class="text-[10px] text-primary font-mono">
                  ✓ Bandfoto aktivt
                </span>
              </span>

              <div class="grid grid-cols-2 gap-1.5 bg-base-200 p-1 rounded-xl border border-white/5 font-bold font-mono text-xs">
                <button
                  type="button"
                  class="py-1.5 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  :class="aiCoverSource === 'photo' ? 'bg-primary text-neutral font-black shadow' : 'text-base-content/70 hover:text-primary'"
                  :disabled="isGeneratingCover"
                  @click="aiCoverSource = 'photo'; generateCoverWithAi()"
                >
                  <span>📸</span>
                  <span>Fotografi</span>
                </button>

                <button
                  type="button"
                  class="py-1.5 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  :class="aiCoverSource === 'ai' ? 'bg-primary text-neutral font-black shadow' : 'text-base-content/70 hover:text-primary'"
                  :disabled="isGeneratingCover"
                  @click="aiCoverSource = 'ai'; generateCoverWithAi()"
                >
                  <span>🤖</span>
                  <span>Gemini AI-konst</span>
                </button>
              </div>

              <!-- Sub-options for Photo source -->
              <div v-if="aiCoverSource === 'photo'" class="p-2.5 bg-base-200/60 rounded-xl border border-primary/20 space-y-2">
                <div class="grid grid-cols-3 gap-1 bg-base-300/80 p-0.5 rounded-lg text-[10px] font-mono font-bold">
                  <button
                    type="button"
                    class="py-1 px-1.5 rounded transition-all text-center cursor-pointer flex items-center justify-center gap-1"
                    :class="photoSubSource === 'band' ? 'bg-primary text-neutral font-black shadow-sm' : 'text-base-content/70 hover:text-primary'"
                    :disabled="isGeneratingCover"
                    @click="photoSubSource = 'band'; generateCoverWithAi()"
                  >
                    <span>🎸</span>
                    <span class="truncate">Bandfoton ({{ bandPhotosList.length }})</span>
                  </button>

                  <button
                    type="button"
                    class="py-1 px-1.5 rounded transition-all text-center cursor-pointer flex items-center justify-center gap-1"
                    :class="photoSubSource === 'gallery' ? 'bg-primary text-neutral font-black shadow-sm' : 'text-base-content/70 hover:text-primary'"
                    :disabled="isGeneratingCover"
                    @click="photoSubSource = 'gallery'; if (!selectedGalleryPhoto && galleryPhotos[0]?.mediaUrl) selectedGalleryPhoto = galleryPhotos[0].mediaUrl; generateCoverWithAi()"
                  >
                    <span>🖼️</span>
                    <span class="truncate">Galleriet ({{ galleryPhotos.length }})</span>
                  </button>

                  <button
                    type="button"
                    class="py-1 px-1.5 rounded transition-all text-center cursor-pointer flex items-center justify-center gap-1"
                    :class="photoSubSource === 'upload' ? 'bg-primary text-neutral font-black shadow-sm' : 'text-base-content/70 hover:text-primary'"
                    :disabled="isGeneratingCover"
                    @click="photoSubSource = 'upload'; if (uploadedCoverPhoto) generateCoverWithAi()"
                  >
                    <span>📷</span>
                    <span class="truncate">Eget foto</span>
                  </button>
                </div>

                <!-- Tab 1: Bandfoton -->
                <div v-if="photoSubSource === 'band'" class="space-y-1.5">
                  <div class="grid grid-cols-7 gap-1.5">
                    <button
                      v-for="(bp, idx) in bandPhotosList"
                      :key="bp.path"
                      type="button"
                      class="relative rounded-lg overflow-hidden border-2 transition-all aspect-square cursor-pointer group"
                      :class="selectedBandPhoto === bp.path ? 'border-primary ring-2 ring-primary/50 shadow-md scale-105 z-10' : 'border-white/10 hover:border-primary/50 opacity-70 hover:opacity-100'"
                      :title="bp.label"
                      @click="selectedBandPhoto = bp.path; generateCoverWithAi()"
                    >
                      <img :src="bp.path" :alt="bp.label" class="w-full h-full object-cover">
                      <span class="absolute bottom-0 inset-x-0 bg-black/75 text-[8px] font-mono text-center py-0.5 text-white/90 truncate px-0.5">
                        #{{ idx + 1 }}
                      </span>
                    </button>
                  </div>

                  <select
                    v-model="selectedBandPhoto"
                    :disabled="isGeneratingCover"
                    class="select select-bordered w-full bg-base-100 select-xs text-[11px] font-semibold"
                    @change="generateCoverWithAi"
                  >
                    <option v-for="bp in bandPhotosList" :key="bp.path" :value="bp.path">
                      {{ bp.label }}
                    </option>
                  </select>
                </div>

                <!-- Tab 2: Galleribilder -->
                <div v-else-if="photoSubSource === 'gallery'" class="space-y-1.5">
                  <div v-if="galleryPhotos.length === 0" class="p-3 text-center text-base-content/60 bg-base-100/50 rounded-lg text-xs">
                    Inga foton hittades i galleriet.
                  </div>

                  <div v-else class="space-y-1.5">
                    <div class="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-32 overflow-y-auto p-1 bg-base-100/60 rounded-lg border border-white/5">
                      <button
                        v-for="gp in galleryPhotos"
                        :key="gp.id"
                        type="button"
                        class="relative rounded-lg overflow-hidden border-2 transition-all aspect-square cursor-pointer group"
                        :class="selectedGalleryPhoto === gp.mediaUrl ? 'border-primary ring-2 ring-primary/50 shadow-md scale-105 z-10' : 'border-white/10 hover:border-primary/50 opacity-75 hover:opacity-100'"
                        :title="gp.captionSv || gp.epkTitleSv || 'Galleribild'"
                        @click="selectedGalleryPhoto = gp.mediaUrl; generateCoverWithAi()"
                      >
                        <img :src="gp.mediaUrl" :alt="gp.captionSv || 'Galleribild'" class="w-full h-full object-cover">
                      </button>
                    </div>

                    <select
                      v-model="selectedGalleryPhoto"
                      :disabled="isGeneratingCover"
                      class="select select-bordered w-full bg-base-100 select-xs text-[11px] font-semibold"
                      @change="generateCoverWithAi"
                    >
                      <option v-for="(gp, i) in galleryPhotos" :key="gp.id" :value="gp.mediaUrl">
                        {{ gp.captionSv || gp.epkTitleSv || `Galleribild #${i + 1}` }}
                      </option>
                    </select>
                  </div>
                </div>

                <!-- Tab 3: Eget foto -->
                <div v-else-if="photoSubSource === 'upload'" class="space-y-2">
                  <div class="flex items-center justify-between gap-2">
                    <label class="btn btn-xs btn-outline btn-secondary rounded-lg cursor-pointer whitespace-nowrap" :class="isUploading ? 'loading' : ''">
                      <span>📷 Ladda upp foto från dator</span>
                      <input
                        type="file"
                        accept="image/*"
                        class="hidden"
                        @change="handleCoverPhotoUpload"
                      >
                    </label>

                    <button
                      v-if="uploadedCoverPhoto"
                      type="button"
                      class="btn btn-xs btn-ghost text-error text-[10px] cursor-pointer"
                      title="Ta bort uppladdat foto och återgå till bandfoto"
                      @click="uploadedCoverPhoto = null; photoSubSource = 'band'; generateCoverWithAi()"
                    >
                      ✕ Ta bort foto
                    </button>
                  </div>

                  <div v-if="uploadedCoverPhoto" class="flex items-center gap-2 p-1.5 bg-base-300/80 rounded-lg border border-emerald-500/30">
                    <img :src="uploadedCoverPhoto" alt="Uppladdat foto" class="w-10 h-10 object-cover rounded-md border border-primary/40 shadow">
                    <div class="text-[10px] truncate flex-1">
                      <span class="font-bold text-emerald-400 block flex items-center gap-1">
                        <span>✓</span> Eget foto aktivt
                      </span>
                      <span class="text-base-content/60 font-mono text-[9px] truncate block">{{ uploadedCoverPhoto }}</span>
                    </div>
                  </div>

                  <div v-else class="p-2.5 border-2 border-dashed border-white/10 rounded-xl text-center space-y-0.5">
                    <p class="text-xs text-base-content/70">
                      Inget eget foto uppladdat för denna låt än.
                    </p>
                    <p class="text-[9px] text-base-content/50">
                      Klicka på knappen ovan för att ladda upp en bild.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Sub-options for AI source -->
              <div v-else class="p-2.5 bg-base-200/60 rounded-xl border border-primary/20 space-y-1.5">
                <div class="flex items-center justify-between">
                  <label class="text-[11px] font-bold text-secondary">Inkludera bandmedlemmarna:</label>
                  <input v-model="aiIncludeBand" type="checkbox" class="toggle toggle-primary toggle-xs" @change="generateCoverWithAi">
                </div>
                <p class="text-[10px] text-base-content/60">
                  När aktiverad använder AI referensfotot av Janis, Marcus, Bosse och Jonas på scen.
                </p>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: Live Förhandsgranskning & Stylingfält -->
          <div class="md:col-span-6 space-y-2.5 text-xs">
            <div class="p-2.5 sm:p-3 bg-black/60 rounded-xl border border-primary/30 flex flex-col items-center justify-center relative overflow-hidden min-h-[180px]">
              <!-- STATE 1: Genererar -->
              <div v-if="isGeneratingCover" class="py-3 flex flex-col items-center justify-center text-center space-y-2.5">
                <div class="relative w-16 h-16 flex items-center justify-center">
                  <div class="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-60 pointer-events-none" />
                  <div class="absolute inset-1 rounded-full border-2 border-primary/40 animate-spin opacity-80" style="animation-duration: 4s;" />
                  <div class="w-14 h-14 rounded-full bg-[#0d0b0a] border-2 border-amber-900/60 shadow-2xl flex items-center justify-center relative overflow-hidden animate-spin" style="animation-duration: 2.5s;">
                    <div class="w-5 h-5 rounded-full bg-gradient-to-tr from-secondary via-primary to-secondary flex flex-col items-center justify-center p-0.5 text-[5px] font-black text-neutral shadow-inner">
                      <span>45</span>
                    </div>
                  </div>
                </div>

                <div class="space-y-1 max-w-xs">
                  <h4 class="text-xs font-heading font-black text-primary animate-pulse">
                    {{
                      aiCoverProgressStep === 1
                        ? '1/4 Förbereder komposition...'
                        : aiCoverProgressStep === 2
                          ? '2/4 Applicerar färgton & vinylpatina...'
                          : aiCoverProgressStep === 3
                            ? '3/4 Stämplar bandnamn & låttitel...'
                            : '4/4 Färdigställer högupplöst singelfodral...'
                    }}
                  </h4>
                  <div class="w-44 bg-base-300 rounded-full h-1.5 overflow-hidden border border-primary/20 mt-1">
                    <div
                      class="bg-gradient-to-r from-secondary to-primary h-full transition-all duration-700 rounded-full"
                      :style="{ width: `${aiCoverProgressStep * 25}%` }"
                    />
                  </div>
                </div>
              </div>

              <!-- STATE 2: Färdigt resultat -->
              <div v-else-if="generatedCoverResult" class="flex items-center justify-center gap-3.5 w-full py-0.5">
                <div
                  class="relative w-36 sm:w-40 aspect-square flex-shrink-0 group cursor-pointer"
                  title="🔍 Klicka för att granska omslaget i full storlek!"
                  @click="showCoverZoomModal = true"
                >
                  <div class="absolute -top-2 -right-2 w-32 h-32 rounded-full bg-[#0d0b0a] border border-white/10 shadow-2xl flex items-center justify-center animate-spin pointer-events-none group-hover:scale-105 transition-transform" style="animation-duration: 16s;">
                    <div class="w-8 h-8 rounded-full bg-primary text-neutral text-[7px] font-black flex flex-col items-center justify-center shadow-inner">
                      <span>45</span>
                      <span>RPM</span>
                    </div>
                  </div>

                  <div class="relative z-10 w-full h-full rounded-lg overflow-hidden border-2 border-amber-900/60 shadow-2xl bg-[#140e0a] group-hover:border-primary group-hover:shadow-primary/40 transition-all">
                    <img
                      :src="generatedCoverResult.coverUrl || generatedCoverResult.url"
                      :alt="generatedCoverResult.title || 'Skivomslag'"
                      class="w-full h-full object-cover"
                    >
                    <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 text-white text-[10px] font-bold backdrop-blur-[1px]">
                      <span class="text-base">🔍</span>
                      <span>Klicka för att förstora</span>
                    </div>
                  </div>
                </div>

                <div class="space-y-1 text-left flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="inline-flex px-2 py-0.5 rounded bg-emerald-800 text-emerald-100 font-mono text-[9px] font-bold">
                      ✓ STÄMPLAT & KLART
                    </span>
                    <button
                      type="button"
                      class="text-[10px] text-primary hover:underline font-mono cursor-pointer flex items-center gap-0.5"
                      title="Förstora skivomslaget för att se alla detaljer"
                      @click="showCoverZoomModal = true"
                    >
                      <span>🔍</span>
                      <span>Förstora</span>
                    </button>
                  </div>
                  <p class="text-xs text-base-content font-heading font-black truncate">
                    {{ songTitle || 'Det 7:e Gunget' }}
                  </p>
                  <p class="text-[10px] text-base-content/70 font-mono">
                    7"-singel • 45 RPM
                  </p>
                  <div class="text-[9px] text-base-content/60 font-mono space-y-0.5 pt-1 border-t border-white/10">
                    <div class="truncate">Stil: <span class="text-primary font-bold">{{ generatedCoverResult.styleName || aiStylePreset }}</span></div>
                    <div class="truncate">Layout: <span class="text-secondary font-bold">{{ generatedCoverResult.layout || aiLayout }}</span></div>
                  </div>
                </div>
              </div>

              <!-- STATE 3: Initialt (Tomt) -->
              <div v-else class="py-3 flex flex-col items-center justify-center text-center space-y-1.5">
                <div class="w-14 h-14 rounded-xl border-2 border-dashed border-primary/40 bg-base-200/50 flex flex-col items-center justify-center text-primary/60">
                  <span class="text-xl">💿</span>
                </div>
                <p class="text-[10px] text-base-content/60 max-w-xs">
                  Klicka på <strong class="text-primary">"Skapa från foto"</strong> eller <strong class="text-secondary">"Slumpa stil"</strong>.
                </p>
              </div>

              <div v-if="aiGenerationError" class="p-2 mt-2 bg-error/15 border border-error/40 rounded-lg text-center text-[11px] text-error w-full space-y-1">
                <div class="font-bold flex items-center justify-center gap-1">
                  <span>⚠️</span>
                  <span>{{ aiGenerationError }}</span>
                </div>
                <div v-if="aiGenerationError.includes('Logga in') || aiGenerationError.includes('session')" class="pt-0.5">
                  <NuxtLink
                    to="/admin/login"
                    target="_blank"
                    class="btn btn-xs btn-primary font-bold shadow-sm inline-flex items-center gap-1 text-[10px]"
                  >
                    <span>🔑</span>
                    <span>Logga in i ny flik</span>
                  </NuxtLink>
                </div>
              </div>
            </div>

            <!-- 2. Layout & Styling Settings Grid -->
            <div class="p-2.5 bg-base-200/70 rounded-xl border border-primary/20 space-y-2 text-xs">
              <div>
                <div class="flex items-center justify-between mb-0.5">
                  <label class="text-[10px] font-bold text-secondary">Layoutmall (Var hamnar texten?):</label>
                  <button
                    type="button"
                    class="text-[9px] text-primary hover:underline cursor-pointer font-mono"
                    @click="aiLayout = 'auto'; generateCoverWithAi()"
                  >
                    🎲 Auto
                  </button>
                </div>
                <select v-model="aiLayout" :disabled="isGeneratingCover" class="select select-bordered w-full bg-base-100 select-xs text-[11px]" @change="generateCoverWithAi">
                  <option value="top_bottom">Classic 70s (Topp- & Bottenbalk)</option>
                  <option value="diagonal_sash">Diagonal Retro Sash (Hörnbanderoll)</option>
                  <option value="sidebar_modern">Blue Note Kolumn (Modernistiskt Sidoband)</option>
                  <option value="poster_frame">Vintage Posterram (Minimalistisk Ram)</option>
                  <option value="center_badge">Vinyl Rondell (Cirkulär Skivetikett)</option>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[10px] font-bold text-secondary mb-0.5">Skivbolagstema & Färg:</label>
                  <select v-model="aiStylePreset" :disabled="isGeneratingCover" class="select select-bordered w-full bg-base-100 select-xs text-[10px]" @change="generateCoverWithAi">
                    <option value="auto">🎲 Auto (Baserat på låten)</option>
                    <option value="sonet_gold">🟡 Sonet (Guld & Svart)</option>
                    <option value="chess_crimson">🔴 Chess (Djupröd & Kräm)</option>
                    <option value="stax_amber">🟠 Stax (Bärnsten & Rost)</option>
                    <option value="bluenote_navy">🔵 Blue Note (Nattblå & Cyan)</option>
                    <option value="vintage_cream">⚪ Sepia (Krämvit & Läder)</option>
                    <option value="harvest_green">🟢 Harvest (Skogsgrön)</option>
                    <option value="monochrome_accent">⚫ Mono Deluxe (Svartvitt)</option>
                  </select>
                </div>

                <div>
                  <label class="block text-[10px] font-bold text-secondary mb-0.5">Vinylpatina & Slitage:</label>
                  <select v-model="aiAgingEffect" :disabled="isGeneratingCover" class="select select-bordered w-full bg-base-100 select-xs text-[10px]" @change="generateCoverWithAi">
                    <option value="ringwear">💿 Vinylring (Ringwear)</option>
                    <option value="both">📜 Ring + Kartongveck</option>
                    <option value="worn_cardboard">📦 Endast kartong</option>
                    <option value="none">✨ Nyskick / Rent</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[10px] font-bold text-secondary mb-0.5">Fotofilter / Färgton:</label>
                  <select v-model="aiPhotoFilter" :disabled="isGeneratingCover" class="select select-bordered w-full bg-base-100 select-xs text-[10px]" @change="generateCoverWithAi">
                    <option value="vintage_warm">🎞️ Analog Ektachrome</option>
                    <option value="natural">📷 Naturliga färger</option>
                    <option value="bw">🖤 Rå svartvit / Duotone</option>
                    <option value="punchy">💥 Rikt mättat 70-tal</option>
                  </select>
                </div>

                <div>
                  <label class="block text-[10px] font-bold text-secondary mb-0.5">Format-badge:</label>
                  <select v-model="aiBadgeFormat" :disabled="isGeneratingCover" class="select select-bordered w-full bg-base-100 select-xs text-[10px]" @change="generateCoverWithAi">
                    <option value="45_rpm">45 R.P.M.</option>
                    <option value="stereo">FULL STEREO</option>
                    <option value="mono">HI-FI MONO</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Action Footer -->
      <div class="border-t border-primary/20 p-3.5 sm:p-4 bg-base-200/95 backdrop-blur-md flex-shrink-0 flex items-center justify-between gap-2">
        <template v-if="!isGeneratingCover && !generatedCoverResult">
          <button
            type="button"
            class="btn btn-ghost btn-sm rounded-full cursor-pointer"
            @click="emit('update:modelValue', false)"
          >
            Avbryt
          </button>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="btn btn-outline btn-secondary btn-sm rounded-full font-bold gap-1 cursor-pointer"
              @click="randomizeCoverStyle"
            >
              <span>🎲 Slumpa stil</span>
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm rounded-full font-bold px-5 shadow-lg shadow-primary/30 flex items-center gap-2 cursor-pointer"
              @click="generateCoverWithAi"
            >
              <span>{{ aiCoverSource === 'photo' ? '📷' : '✨' }}</span>
              <span>{{ aiCoverSource === 'photo' ? 'Skapa från foto' : 'Generera med AI' }}</span>
            </button>
          </div>
        </template>

        <template v-else-if="isGeneratingCover">
          <span class="text-xs text-primary font-mono animate-pulse flex items-center gap-1.5">
            <span>⏳</span> Komponerar singelomslag med typografi...
          </span>
          <button
            type="button"
            class="btn btn-ghost btn-sm rounded-full text-xs cursor-pointer"
            @click="emit('update:modelValue', false)"
          >
            Avbryt
          </button>
        </template>

        <template v-else-if="generatedCoverResult">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="btn btn-outline btn-secondary btn-sm rounded-full gap-1.5 font-bold text-xs cursor-pointer"
              :disabled="isGeneratingCover"
              title="Slumpa fram en helt ny kombination av layout, färg och patina!"
              @click="randomizeCoverStyle"
            >
              <span>🎲</span>
              <span>Slumpa ny stil</span>
            </button>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="btn btn-ghost btn-sm rounded-full text-xs cursor-pointer"
              @click="emit('update:modelValue', false)"
            >
              Avbryt
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm rounded-full font-bold px-5 shadow-lg shadow-primary/30 text-xs sm:text-sm cursor-pointer"
              :disabled="isGeneratingCover || isApplyingCover"
              @click="applyGeneratedCover"
            >
              <span v-if="isApplyingCover" class="loading loading-spinner loading-xs" />
              <span v-else>✓</span>
              <span>{{ isApplyingCover ? 'Sparar omslag...' : 'Använd detta omslag' }}</span>
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>

  <!-- COVER STUDIO ZOOM MODAL (HIGH RES INSPECTION) -->
  <div
    v-if="showCoverZoomModal && generatedCoverResult"
    class="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
    @click="showCoverZoomModal = false"
  >
    <div
      class="stage-card max-w-2xl w-full p-4 sm:p-6 rounded-3xl border-2 border-primary/50 shadow-2xl space-y-3.5 bg-base-100 flex flex-col items-center max-h-[96vh] overflow-y-auto"
      @click.stop
    >
      <div class="flex items-center justify-between w-full border-b border-primary/20 pb-2.5">
        <div class="truncate mr-2">
          <span class="text-[10px] uppercase font-bold text-secondary font-mono block">Högupplöst Granskning</span>
          <h3 class="font-heading text-base sm:text-lg text-primary font-black truncate">
            {{ songTitle || 'Det 7:e Gunget' }} • 7"-singelomslag
          </h3>
        </div>
        <button
          type="button"
          class="btn btn-sm btn-circle btn-ghost text-lg cursor-pointer"
          title="Stäng förstoringsvy"
          @click="showCoverZoomModal = false"
        >
          ✕
        </button>
      </div>

      <div class="relative w-full max-w-[500px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-900/70 bg-[#140e0a]">
        <img
          :src="generatedCoverResult.coverUrl || generatedCoverResult.url"
          :alt="generatedCoverResult.title || 'Skivomslag i full storlek'"
          class="w-full h-full object-cover"
        >
      </div>

      <div class="flex items-center justify-between w-full text-xs font-mono text-base-content/70 px-1 pt-1">
        <div>
          <span class="text-primary font-bold">{{ generatedCoverResult.styleName || aiStylePreset }}</span>
          <span class="mx-1">•</span>
          <span>{{ generatedCoverResult.layout || aiLayout }}</span>
          <span v-if="aiCatalogNumber" class="mx-1">•</span>
          <span v-if="aiCatalogNumber" class="text-secondary font-bold">{{ aiCatalogNumber }}</span>
        </div>
        <span class="badge badge-sm badge-outline border-secondary text-secondary font-mono">
          45 R.P.M.
        </span>
      </div>

      <div class="flex items-center justify-end gap-2 w-full pt-2 border-t border-primary/10">
        <button
          type="button"
          class="btn btn-ghost btn-sm rounded-full text-xs cursor-pointer"
          @click="showCoverZoomModal = false"
        >
          Stäng
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm rounded-full font-bold px-5 shadow-lg shadow-primary/30 text-xs sm:text-sm cursor-pointer flex items-center gap-1.5"
          @click="applyGeneratedCover"
        >
          <span>✓</span>
          <span>Använd detta omslag</span>
        </button>
      </div>
    </div>
  </div>
</template>

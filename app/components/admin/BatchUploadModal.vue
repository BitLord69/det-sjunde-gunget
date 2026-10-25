<script setup lang="ts">
interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'uploaded', count: number): void
}>()

interface BatchItem {
  id: string
  file: File
  previewUrl: string
  name: string
  sizeStr: string
  resolution?: string
  status: 'pending' | 'uploading' | 'saving' | 'done' | 'error'
  errorMsg?: string
  progress: number
}

const isBatchProcessing = ref(false)
const batchQueue = ref<BatchItem[]>([])
const batchFileInput = ref<HTMLInputElement | null>(null)

const batchCategory = ref<'photo' | 'fan'>('photo')
const batchFrameStyle = ref('polaroid')
const batchBaseCaption = ref('')
const batchIsEpk = ref(false)
const batchShowOnBandPage = ref(false)

const { uploadAdminFile } = useAdminUpload()

// Automagisk läsning av upplösning för varje fil
const inspectImageResolution = async (file: File): Promise<string | null> => {
  try {
    let width = 0
    let height = 0
    const sizeStr = file.size >= 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`

    const objectUrl = URL.createObjectURL(file)
    await new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        width = img.naturalWidth
        height = img.naturalHeight
        URL.revokeObjectURL(objectUrl)
        resolve()
      }
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Kunde inte läsa bildfilen'))
      }
      img.src = objectUrl
    })

    if (!width || !height) return null
    const parts: string[] = [`${width} × ${height} px`, sizeStr]
    if (width >= 2000 || height >= 2000) {
      parts.push('300 DPI')
    }
    return parts.join(' • ')
  } catch {
    return null
  }
}

const close = () => {
  if (isBatchProcessing.value) {
    if (!confirm('Uppladdning pågår. Vill du verkligen avbryta?')) return
  }
  batchQueue.value.forEach((item) => {
    try {
      URL.revokeObjectURL(item.previewUrl)
    } catch {}
  })
  batchQueue.value = []
  isBatchProcessing.value = false
  emit('update:modelValue', false)
}

const triggerBatchFilePicker = () => {
  batchFileInput.value?.click()
}

const handleBatchFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const files = Array.from(input.files)
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue

    const previewUrl = URL.createObjectURL(file)
    const sizeStr = file.size >= 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`

    const item: BatchItem = reactive({
      id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      previewUrl,
      name: file.name,
      sizeStr,
      status: 'pending',
      progress: 0,
    })

    batchQueue.value.push(item)

    inspectImageResolution(file).then((res) => {
      if (res) item.resolution = res
    })
  }

  input.value = ''
}

const removeBatchItem = (index: number) => {
  if (isBatchProcessing.value) return
  const item = batchQueue.value[index]
  if (item) {
    try {
      URL.revokeObjectURL(item.previewUrl)
    } catch {}
    batchQueue.value.splice(index, 1)
  }
}

const clearBatchQueue = () => {
  if (isBatchProcessing.value) return
  batchQueue.value.forEach((item) => {
    try {
      URL.revokeObjectURL(item.previewUrl)
    } catch {}
  })
  batchQueue.value = []
}

const batchCompletedCount = computed(() => {
  return batchQueue.value.filter((i) => i.status === 'done').length
})

const batchTotalProgress = computed(() => {
  if (!batchQueue.value.length) return 0
  const sum = batchQueue.value.reduce((acc, curr) => acc + (curr.progress || 0), 0)
  return Math.round(sum / batchQueue.value.length)
})

const startBatchUpload = async () => {
  if (isBatchProcessing.value || !batchQueue.value.length) return
  isBatchProcessing.value = true

  let successCount = 0

  for (const item of batchQueue.value) {
    if (item.status === 'done') continue

    try {
      item.status = 'uploading'
      item.progress = 10

      const url = await uploadAdminFile(item.file, {
        onProgress: (p) => {
          item.progress = Math.min(90, Math.max(10, p))
        },
      })

      item.status = 'saving'
      item.progress = 95

      const cleanFileName = item.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      const caption = batchBaseCaption.value.trim() || cleanFileName

      await $fetch('/api/admin/gallery', {
        method: 'POST',
        body: {
          category: batchCategory.value,
          mediaUrl: url,
          frameStyle: batchFrameStyle.value === 'random'
            ? ['polaroid', 'pinned', 'taped', 'wood', 'grunge'][Math.floor(Math.random() * 5)]
            : batchFrameStyle.value,
          captionSv: caption,
          captionEn: caption,
          isEpk: batchIsEpk.value,
          epkResolution: item.resolution || null,
          showOnBandPage: batchShowOnBandPage.value,
        },
      })

      item.status = 'done'
      item.progress = 100
      successCount++
    } catch (err: unknown) {
      item.status = 'error'
      item.errorMsg = err instanceof Error ? err.message : 'Fel vid uppladdning'
      console.error(`Fel vid batchuppladdning av ${item.name}:`, err)
    }
  }

  isBatchProcessing.value = false
  if (successCount > 0) {
    emit('uploaded', successCount)
  }
}
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    @click.self="close"
  >
    <!-- Hidden multi file input -->
    <input
      ref="batchFileInput"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="handleBatchFileSelect"
    >

    <div class="stage-card p-5 sm:p-8 rounded-3xl border border-primary/40 shadow-2xl max-w-4xl w-full bg-base-100 space-y-6 my-6 max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-primary/20 pb-4 flex-shrink-0">
        <div>
          <h3 class="font-heading text-xl sm:text-2xl text-primary font-bold flex items-center gap-2">
            <span>⚡</span>
            <span>Batch-uppladdning för Galleriet</span>
          </h3>
          <p class="text-xs text-base-content/70">
            Ladda upp flera konsert- och pressbilder samtidigt. Automatisk upplösningsanalys och gemensamma stilinställningar.
          </p>
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-circle text-lg"
          :disabled="isBatchProcessing"
          @click="close"
        >
          ✕
        </button>
      </div>

      <!-- Body / Content -->
      <div class="space-y-5 overflow-y-auto pr-1 flex-1 min-h-0">
        <!-- Dropzone -->
        <div
          class="border-2 border-dashed border-primary/40 rounded-2xl p-6 sm:p-8 text-center bg-base-200/50 hover:bg-base-200/80 transition-all cursor-pointer flex flex-col items-center justify-center gap-2.5"
          @click="triggerBatchFilePicker"
        >
          <span class="text-4xl">📸</span>
          <div class="space-y-1">
            <p class="font-bold text-sm text-base-content">
              Klicka här för att välja bilder från datorn
            </p>
            <p class="text-xs text-base-content/60">
              Eller markera och släpp flera filer direkt. Stödjer JPEG, PNG, WebP och RAW/TIFF upp till 50 MB per bild.
            </p>
          </div>
          <button
            type="button"
            class="btn btn-secondary btn-sm rounded-full font-bold px-6 mt-1 pointer-events-none"
          >
            + Välj filer (flervalsstöd)
          </button>
        </div>

        <!-- Batch Settings Options -->
        <div v-if="batchQueue.length > 0" class="p-4 rounded-2xl bg-base-200/70 border border-primary/20 space-y-4">
          <h4 class="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-2">
            <span>⚙️</span>
            <span>Gemensamma inställningar för valda bilder ({{ batchQueue.length }} st)</span>
          </h4>

          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <!-- Kategori -->
            <div>
              <label class="block font-bold text-base-content/80 mb-1">Kategori</label>
              <select
                v-model="batchCategory"
                :disabled="isBatchProcessing"
                class="select select-bordered select-sm w-full bg-base-100 text-xs"
              >
                <option value="photo">📷 Officiellt fotogalleri (Scen & Rep)</option>
                <option value="fan">🌀 Fan Central (Fansen & fläktarna)</option>
              </select>
            </div>

            <!-- Ramstil -->
            <div>
              <label class="block font-bold text-base-content/80 mb-1">Ramstil</label>
              <select
                v-model="batchFrameStyle"
                :disabled="isBatchProcessing"
                class="select select-bordered select-sm w-full bg-base-100 text-xs"
              >
                <option value="polaroid">📷 Klassisk Polaroid</option>
                <option value="pinned">📌 Nålat anslag</option>
                <option value="taped">🏷️ Tejpat vintage</option>
                <option value="wood">🖼️ Träram</option>
                <option value="grunge">🎞️ Mörk grunge</option>
                <option value="random">🎲 Slumpa stilar organiskt</option>
              </select>
            </div>

            <!-- Gemensam text / prefix -->
            <div class="sm:col-span-2 lg:col-span-1">
              <label class="block font-bold text-base-content/80 mb-1">Gemensam bildtext (valfritt)</label>
              <input
                v-model="batchBaseCaption"
                type="text"
                placeholder="t.ex. Höganäs Bryggeri 2026"
                :disabled="isBatchProcessing"
                class="input input-bordered input-sm w-full bg-base-100 text-xs"
              >
            </div>
          </div>

          <!-- Toggles -->
          <div class="flex flex-wrap items-center gap-4 pt-1 border-t border-base-content/10 text-xs">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="batchIsEpk"
                type="checkbox"
                class="checkbox checkbox-secondary checkbox-xs"
                :disabled="isBatchProcessing"
              >
              <span class="font-bold text-base-content">🌟 Markera som EPK-pressbilder</span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="batchShowOnBandPage"
                type="checkbox"
                class="checkbox checkbox-primary checkbox-xs"
                :disabled="isBatchProcessing"
              >
              <span class="font-bold text-base-content">🎸 Visa på 'Om bandet'-sidan</span>
            </label>
          </div>
        </div>

        <!-- Queue Items Grid -->
        <div v-if="batchQueue.length > 0" class="space-y-2">
          <div class="flex items-center justify-between text-xs font-bold text-base-content/70 pb-1">
            <span>Uppladdningskö ({{ batchCompletedCount }} av {{ batchQueue.length }} klara)</span>
            <button
              type="button"
              class="btn btn-ghost btn-xs text-error cursor-pointer"
              :disabled="isBatchProcessing"
              @click="clearBatchQueue"
            >
              Rensa alla
            </button>
          </div>

          <div class="grid sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto p-1">
            <div
              v-for="(item, idx) in batchQueue"
              :key="item.id"
              class="p-2.5 rounded-xl bg-base-200/80 border border-primary/20 flex items-center gap-3 relative overflow-hidden"
            >
              <!-- Thumbnail -->
              <img
                :src="item.previewUrl"
                :alt="item.name"
                class="w-14 h-14 object-cover rounded-lg border border-primary/30 flex-shrink-0"
              >

              <!-- Details -->
              <div class="min-w-0 flex-1 space-y-0.5">
                <p class="font-bold text-xs truncate text-base-content" :title="item.name">
                  {{ item.name }}
                </p>
                <p class="text-[10px] text-base-content/60 font-mono flex items-center gap-1.5 flex-wrap">
                  <span>{{ item.sizeStr }}</span>
                  <span v-if="item.resolution" class="badge badge-xs badge-neutral font-bold text-[9px]">
                    {{ item.resolution }}
                  </span>
                </p>

                <!-- Status -->
                <div class="text-[11px] pt-0.5 font-bold flex items-center gap-1.5">
                  <span v-if="item.status === 'pending'" class="text-base-content/60">⏳ Väntar</span>
                  <span v-else-if="item.status === 'uploading'" class="text-secondary animate-pulse flex items-center gap-1">
                    <span class="loading loading-spinner loading-xs" />
                    Laddar upp... {{ item.progress }}%
                  </span>
                  <span v-else-if="item.status === 'saving'" class="text-primary animate-pulse">
                    💾 Sparar till databas...
                  </span>
                  <span v-else-if="item.status === 'done'" class="text-success flex items-center gap-1">
                    ✓ Klar!
                  </span>
                  <span v-else-if="item.status === 'error'" class="text-error" :title="item.errorMsg">
                    ⚠️ {{ item.errorMsg || 'Fel' }}
                  </span>
                </div>
              </div>

              <!-- Remove Button -->
              <button
                v-if="!isBatchProcessing && item.status !== 'done'"
                type="button"
                class="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-error flex-shrink-0"
                @click="removeBatchItem(idx)"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <!-- Total Progress Bar -->
        <div v-if="isBatchProcessing || batchCompletedCount > 0" class="space-y-1.5 pt-2 border-t border-primary/20">
          <div class="flex items-center justify-between text-xs font-bold">
            <span class="text-secondary">Totalt förlopp</span>
            <span class="font-mono text-base-content">{{ batchCompletedCount }} av {{ batchQueue.length }} klara ({{ batchTotalProgress }}%)</span>
          </div>
          <progress
            class="progress progress-secondary w-full h-2.5 rounded-full"
            :value="batchTotalProgress"
            max="100"
          />
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="flex items-center justify-between pt-4 border-t border-primary/20 flex-shrink-0">
        <button
          type="button"
          class="btn btn-ghost btn-sm rounded-xl font-bold cursor-pointer"
          :disabled="isBatchProcessing"
          @click="close"
        >
          {{ batchCompletedCount === batchQueue.length && batchQueue.length > 0 ? 'Klar & Stäng' : 'Avbryt' }}
        </button>

        <button
          type="button"
          class="btn btn-primary btn-sm rounded-xl font-bold px-6 shadow-md shadow-primary/30 flex items-center gap-2 cursor-pointer"
          :disabled="isBatchProcessing || batchQueue.length === 0 || batchCompletedCount === batchQueue.length"
          @click="startBatchUpload"
        >
          <span v-if="isBatchProcessing" class="loading loading-spinner loading-xs" />
          <span v-else>🚀</span>
          <span>{{ isBatchProcessing ? 'Laddar upp...' : `Starta uppladdning (${batchQueue.length} st)` }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

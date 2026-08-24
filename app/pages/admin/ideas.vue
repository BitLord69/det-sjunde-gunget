<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useSeoMeta({
  title: 'Riff- & Idébank | Det 7:e Gunget Admin',
})

const { adminUser } = useAdminAuth()

const toastMessage = ref('')
const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

// Fetch all ideas / voice memos
const { data: ideasData, refresh: refreshIdeas, status: ideasStatus } = await useFetch<any[]>('/api/admin/ideas', {
  default: () => [],
})

// Fetch all songs for linking
const { data: songsData } = await useFetch<any[]>('/api/songs', {
  default: () => [],
})

// ----------------- RECORDING STATE & WEB AUDIO -----------------
const isRecording = ref(false)
const isPaused = ref(false)
const recordSeconds = ref(0)
let recordTimerInterval: any = null
let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let audioStream: MediaStream | null = null
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let animationFrameId: number | null = null

const recordedBlob = ref<Blob | null>(null)
const recordedAudioUrl = ref<string | null>(null)
const recordedDuration = ref<number>(0)
const isUploadingAudio = ref(false)
const isSavingIdea = ref(false)

// Canvas visualizer ref
const visualizerCanvas = ref<HTMLCanvasElement | null>(null)
const audioLevel = ref<number>(0) // 0 to 100 for VU meter

// Form fields for new / recorded idea
const ideaForm = ref({
  title: '',
  key: 'A',
  bpm: null as number | null,
  tags: 'Riff, Replokal',
  notes: '',
  recordedBy: adminUser.value?.name || 'Janis',
  linkedSongId: '',
  audioUrl: '',
  duration: 0,
})

// Quick keys list
const musicalKeys = ['A', 'Am', 'A7', 'Blues i A', 'B', 'Bm', 'C', 'C7', 'D', 'Dm', 'D7', 'E', 'Em', 'E7', 'F', 'F#m', 'G', 'Gm', 'G7']
const quickTags = ['Munspel', 'Slide', 'Intro', 'Refräng', 'Shuffle', 'Solo', 'Groove', 'Gubb-blues']
const bandMembers = ['Janis', 'Bosse', 'Marcus', 'Jonas']

// ----------------- TAP TEMPO TOOL -----------------
const tapTimes = ref<number[]>([])
const tapTempoDisplay = ref<number | null>(null)

const handleTapTempo = () => {
  const now = performance.now()
  tapTimes.value.push(now)
  if (tapTimes.value.length > 5) {
    tapTimes.value.shift()
  }

  const times = tapTimes.value
  if (times.length >= 2) {
    const intervals: number[] = []
    for (let i = 1; i < times.length; i++) {
      const curr = times[i]
      const prev = times[i - 1]
      if (curr !== undefined && prev !== undefined) {
        intervals.push(curr - prev)
      }
    }
    if (intervals.length === 0) return

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const secondLast = times[times.length - 2]
    // Reset if pause > 2 seconds
    if (secondLast !== undefined && now - secondLast > 2000) {
      tapTimes.value = [now]
      return
    }
    const calculatedBpm = Math.round(60000 / avgInterval)
    if (calculatedBpm >= 40 && calculatedBpm <= 260) {
      tapTempoDisplay.value = calculatedBpm
      ideaForm.value.bpm = calculatedBpm
    }
  }
}

// ----------------- AUDIO RECORDING ACTIONS -----------------
const startRecording = async () => {
  try {
    audioChunks = []
    recordedBlob.value = null
    recordedAudioUrl.value = null
    recordSeconds.value = 0

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('⚠️ Din webbläsare stöder inte mikrofoninspelning direkt.')
      return
    }

    audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })

    // Setup Web Audio API visualizer
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      audioContext = new AudioCtx()
      const source = audioContext.createMediaStreamSource(audioStream)
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 128
      source.connect(analyser)
      drawVisualizer()
    } catch (e) {
      console.warn('Web Audio visualizer failed to initialize', e)
    }

    // Determine supported mime type
    let mimeType = 'audio/webm;codecs=opus'
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg'
      } else {
        mimeType = ''
      }
    }

    mediaRecorder = mimeType ? new MediaRecorder(audioStream, { mimeType }) : new MediaRecorder(audioStream)

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blobType = mediaRecorder?.mimeType || 'audio/webm'
      recordedBlob.value = new Blob(audioChunks, { type: blobType })
      recordedAudioUrl.value = URL.createObjectURL(recordedBlob.value)
      recordedDuration.value = recordSeconds.value
      ideaForm.value.duration = recordSeconds.value

      // Suggest default title if empty
      if (!ideaForm.value.title) {
        const d = new Date()
        const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
        ideaForm.value.title = `Replokals-riff (${timeStr})`
      }

      cleanupMediaStream()
    }

    mediaRecorder.start(250) // slice every 250ms
    isRecording.value = true
    isPaused.value = false

    recordTimerInterval = setInterval(() => {
      recordSeconds.value++
      // Auto stop at 120s (2 minutes max for a quick sketch)
      if (recordSeconds.value >= 120) {
        stopRecording()
        showToast('⏱️ Maxgräns (2 min) nådd — inspelning sparad som utkast!')
      }
    }, 1000)
  } catch (err: any) {
    console.error('Error starting recording:', err)
    showToast(`⚠️ Kunde inte starta mikrofonen: ${err?.message || 'Kontrollera mikrofontillstånd.'}`)
    cleanupMediaStream()
  }
}

const stopRecording = () => {
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop()
    isRecording.value = false
    isPaused.value = false
  }
  if (recordTimerInterval) {
    clearInterval(recordTimerInterval)
    recordTimerInterval = null
  }
}

const cancelRecording = () => {
  stopRecording()
  recordedBlob.value = null
  recordedAudioUrl.value = null
  recordSeconds.value = 0
  audioChunks = []
  cleanupMediaStream()
}

const cleanupMediaStream = () => {
  if (audioStream) {
    audioStream.getTracks().forEach((t) => t.stop())
    audioStream = null
  }
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close()
    audioContext = null
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  audioLevel.value = 0
}

const drawVisualizer = () => {
  if (!analyser || !isRecording.value) return

  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  analyser.getByteFrequencyData(dataArray)

  // Calculate average volume level for VU meter
  let sum = 0
  for (let i = 0; i < bufferLength; i++) {
    sum += dataArray[i] ?? 0
  }
  const avg = sum / bufferLength
  audioLevel.value = Math.min(100, Math.round((avg / 128) * 100))

  // Draw on canvas if present
  if (visualizerCanvas.value) {
    const canvas = visualizerCanvas.value
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const barWidth = (canvas.width / bufferLength) * 2.2
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i] ?? 0
        const barHeight = (val / 255) * canvas.height
        // Vintage amber/gold gradient
        ctx.fillStyle = i % 2 === 0 ? '#E2BD72' : '#F43F5E'
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight)
        x += barWidth
      }
    }
  }

  animationFrameId = requestAnimationFrame(drawVisualizer)
}

// ----------------- UPLOAD AUDIO (RECORDED OR FILE) -----------------
const uploadRecordedBlob = async (): Promise<string | null> => {
  if (!recordedBlob.value) return null

  const formData = new FormData()
  const ext = recordedBlob.value.type.includes('mp4') ? 'm4a' : 'webm'
  const file = new File([recordedBlob.value], `riff-${Date.now()}.${ext}`, { type: recordedBlob.value.type })
  formData.append('file', file)

  isUploadingAudio.value = true
  try {
    const res = await $fetch<{ success: boolean; url: string }>('/api/admin/upload', {
      method: 'POST',
      body: formData,
    })
    if (res.success && res.url) {
      return res.url
    }
    return null
  } catch (err: any) {
    showToast(`⚠️ Uppladdning av ljud misslyckades: ${err?.data?.statusMessage || err?.message}`)
    return null
  } finally {
    isUploadingAudio.value = false
  }
}

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const file = input.files[0]
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)
  isUploadingAudio.value = true

  try {
    const res = await $fetch<{ success: boolean; url: string }>('/api/admin/upload', {
      method: 'POST',
      body: formData,
    })
    if (res.success && res.url) {
      ideaForm.value.audioUrl = res.url
      if (!ideaForm.value.title) {
        ideaForm.value.title = file.name.replace(/\.[^/.]+$/, '')
      }
      showToast('✓ Ljudfilen har laddats upp!')
    }
  } catch (err: any) {
    showToast(`⚠️ Filuppladdning misslyckades: ${err?.data?.statusMessage || err?.message}`)
  } finally {
    isUploadingAudio.value = false
    input.value = ''
  }
}

// ----------------- SAVE IDEA -----------------
const saveIdea = async () => {
  if (!ideaForm.value.title) {
    showToast('⚠️ Vänligen ange en titel för idén.')
    return
  }

  isSavingIdea.value = true

  try {
    let finalAudioUrl = ideaForm.value.audioUrl

    // If we have a recorded blob that hasn't been uploaded yet
    if (recordedBlob.value && !finalAudioUrl) {
      const uploadedUrl = await uploadRecordedBlob()
      if (!uploadedUrl) {
        isSavingIdea.value = false
        return
      }
      finalAudioUrl = uploadedUrl
    }

    if (!finalAudioUrl) {
      showToast('⚠️ Ingen ljudinspelning eller ljudfil finns att spara.')
      isSavingIdea.value = false
      return
    }

    const payload = {
      title: ideaForm.value.title,
      audioUrl: finalAudioUrl,
      duration: ideaForm.value.duration || recordedDuration.value || 0,
      key: ideaForm.value.key,
      bpm: ideaForm.value.bpm,
      tags: ideaForm.value.tags,
      notes: ideaForm.value.notes,
      recordedBy: ideaForm.value.recordedBy,
      linkedSongId: ideaForm.value.linkedSongId || null,
    }

    await $fetch('/api/admin/ideas', {
      method: 'POST',
      body: payload,
    })

    showToast('🎸 Idén har sparats i Riff- & Idébanken!')

    // Reset form
    ideaForm.value = {
      title: '',
      key: 'A',
      bpm: null,
      tags: 'Riff, Replokal',
      notes: '',
      recordedBy: adminUser.value?.name || 'Janis',
      linkedSongId: '',
      audioUrl: '',
      duration: 0,
    }
    recordedBlob.value = null
    recordedAudioUrl.value = null
    recordedDuration.value = 0
    tapTempoDisplay.value = null
    tapTimes.value = []

    await refreshIdeas()
  } catch (err: any) {
    console.error('Error saving idea:', err)
    showToast(`⚠️ Kunde inte spara idén: ${err?.data?.statusMessage || err?.message}`)
  } finally {
    isSavingIdea.value = false
  }
}

// ----------------- EDITING MODAL -----------------
const editingIdea = ref<any | null>(null)
const isUpdatingIdea = ref(false)

const openEditModal = (idea: any) => {
  editingIdea.value = { ...idea }
}

const closeEditModal = () => {
  editingIdea.value = null
}

const updateIdea = async () => {
  if (!editingIdea.value) return
  isUpdatingIdea.value = true

  try {
    await $fetch(`/api/admin/ideas/${editingIdea.value.id}`, {
      method: 'PUT',
      body: {
        title: editingIdea.value.title,
        key: editingIdea.value.key,
        bpm: editingIdea.value.bpm,
        tags: editingIdea.value.tags,
        notes: editingIdea.value.notes,
        recordedBy: editingIdea.value.recordedBy,
        linkedSongId: editingIdea.value.linkedSongId || null,
      },
    })
    showToast('✓ Idén har uppdaterats!')
    closeEditModal()
    await refreshIdeas()
  } catch (err: any) {
    showToast(`⚠️ Kunde inte uppdatera: ${err?.data?.statusMessage || err?.message}`)
  } finally {
    isUpdatingIdea.value = false
  }
}

// ----------------- DELETE IDEA -----------------
const deleteIdea = async (id: string, title: string) => {
  const confirmed = confirm(`Vill du verkligen radera idén "${title}"?`)
  if (!confirmed) return

  try {
    await $fetch(`/api/admin/ideas/${id}`, {
      method: 'DELETE',
    })
    showToast('🗑️ Idén raderades.')
    await refreshIdeas()
  } catch (err: any) {
    showToast(`⚠️ Kunde inte radera: ${err?.data?.statusMessage || err?.message}`)
  }
}

// ----------------- FILTERING & SEARCH -----------------
const searchQuery = ref('')
const filterKey = ref('ALL')
const filterMember = ref('ALL')

const filteredIdeas = computed(() => {
  let list = Array.isArray(ideasData.value) ? ideasData.value : []

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(
      (item) =>
        item.title?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q) ||
        item.tags?.toLowerCase().includes(q) ||
        item.linkedSongTitle?.toLowerCase().includes(q)
    )
  }

  if (filterKey.value !== 'ALL') {
    list = list.filter((item) => item.key === filterKey.value)
  }

  if (filterMember.value !== 'ALL') {
    list = list.filter((item) => item.recordedBy === filterMember.value)
  }

  return list
})

// ----------------- AUDIO PLAYBACK SPEED & HELPERS -----------------
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const formatDate = (timestamp: any) => {
  if (!timestamp) return ''
  const d = new Date(typeof timestamp === 'number' ? timestamp : Number(timestamp))
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Custom player per card
const activeAudioCard = ref<string | null>(null)
const playbackSpeed = ref<Record<string, number>>({})

const setSpeed = (id: string, speed: number, audioEl: HTMLAudioElement) => {
  playbackSpeed.value[id] = speed
  if (audioEl) {
    audioEl.playbackRate = speed
  }
}

onUnmounted(() => {
  cleanupMediaStream()
})
</script>

<template>
  <div class="space-y-6">
    <!-- TOAST NOTIFICATION -->
    <div
      v-if="toastMessage"
      class="fixed bottom-5 right-5 z-50 alert alert-info shadow-2xl border border-primary/40 text-primary-content bg-primary max-w-sm"
    >
      <span class="font-bold text-sm">{{ toastMessage }}</span>
    </div>

    <!-- HEADER -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-primary/20 pb-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-2xl">🎙️</span>
          <h1 class="text-2xl sm:text-3xl font-heading font-black text-primary tracking-tight">
            Riff- & Idébank
          </h1>
        </div>
        <p class="text-xs sm:text-sm text-base-content/70 font-sans mt-0.5">
          Replokals-arkiv för snabba 30-sekunders skisser, munspels-hooks och sångidéer.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <span class="badge badge-primary font-mono text-xs font-bold px-3 py-3">
          {{ ideasData.length }} {{ ideasData.length === 1 ? 'idé sparad' : 'idéer sparade' }}
        </span>
      </div>
    </div>

    <!-- 1. LIVE RECORDER & CAPTURE WORKBENCH -->
    <div class="bg-base-200/90 rounded-3xl p-4 sm:p-6 border border-primary/30 shadow-xl space-y-6 relative overflow-hidden">
      <!-- Background vintage grain accent -->
      <div class="absolute -right-10 -bottom-10 opacity-5 pointer-events-none text-9xl font-black font-mono">
        REC
      </div>

      <div class="flex flex-col lg:flex-row items-stretch gap-6">
        <!-- LEFT: TAPE RECORDER INTERACTION -->
        <div class="lg:w-5/12 flex flex-col items-center justify-center p-5 rounded-2xl bg-base-300/80 border border-primary/20 text-center space-y-4 shadow-inner">
          <div class="flex items-center justify-between w-full text-xs font-mono font-bold text-base-content/60">
            <span class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full" :class="isRecording ? 'bg-red-500 animate-ping' : 'bg-base-content/30'" />
              {{ isRecording ? 'SPELAR IN...' : 'KLAR FÖR INSPELNING' }}
            </span>
            <span class="text-primary font-bold">OPTIMAL SKISS: ~30s</span>
          </div>

          <!-- TIME COUNTER -->
          <div class="font-mono text-4xl sm:text-5xl font-black tracking-wider" :class="isRecording ? 'text-red-500' : 'text-primary'">
            {{ formatTime(isRecording ? recordSeconds : recordedDuration || 0) }}
          </div>

          <!-- VU METER / LEVEL BARS -->
          <div class="w-full space-y-1">
            <div class="h-3 w-full bg-base-100 rounded-full overflow-hidden p-0.5 border border-primary/20 flex items-center">
              <div
                class="h-full rounded-full transition-all duration-75"
                :class="[
                  audioLevel > 80 ? 'bg-red-500' : audioLevel > 50 ? 'bg-amber-400' : 'bg-primary'
                ]"
                :style="{ width: `${audioLevel}%` }"
              />
            </div>
            <div class="flex justify-between text-[9px] font-mono text-base-content/40 px-1">
              <span>-40dB</span>
              <span>-20dB</span>
              <span>-6dB</span>
              <span>0dB (PEAK)</span>
            </div>
          </div>

          <!-- REAL-TIME CANVAS VISUALIZER -->
          <canvas
            ref="visualizerCanvas"
            width="280"
            height="40"
            class="w-full h-10 rounded-lg bg-base-100/80 border border-primary/20"
          />

          <!-- BIG RECORD BUTTONS -->
          <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              v-if="!isRecording && !recordedAudioUrl"
              type="button"
              class="btn btn-lg btn-error text-white font-heading font-black shadow-lg hover:scale-105 transition-transform flex items-center gap-2 px-6 rounded-2xl"
              @click="startRecording"
            >
              <span class="text-xl">🎙️</span>
              <span>Starta inspelning</span>
            </button>

            <button
              v-if="isRecording"
              type="button"
              class="btn btn-lg btn-error font-heading font-black text-white shadow-xl animate-pulse flex items-center gap-2 px-6 rounded-2xl"
              @click="stopRecording"
            >
              <span class="text-lg">⏹️</span>
              <span>Stoppa & Granska</span>
            </button>

            <button
              v-if="isRecording"
              type="button"
              class="btn btn-sm btn-ghost text-base-content/60 hover:text-error"
              @click="cancelRecording"
            >
              Avbryt
            </button>

            <div v-if="recordedAudioUrl && !isRecording" class="flex flex-col items-center gap-2 w-full">
              <!-- Preview Audio Element -->
              <audio :src="recordedAudioUrl" controls class="w-full mt-2 h-10" />
              <div class="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  class="btn btn-xs btn-outline btn-error rounded-xl flex items-center gap-1"
                  @click="cancelRecording"
                >
                  <span>↺ Ta om inspelning</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ALTERNATIVE: UPLOAD AUDIO FILE -->
          <div class="pt-2 border-t border-primary/10 w-full flex items-center justify-between text-xs text-base-content/60">
            <span>Eller ladda upp en sparad fil:</span>
            <label class="btn btn-xs btn-ghost text-primary underline cursor-pointer">
              <span>{{ isUploadingAudio ? 'Laddar upp...' : 'Välj fil (.mp3/.m4a)' }}</span>
              <input
                type="file"
                accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.webm"
                class="hidden"
                :disabled="isUploadingAudio"
                @change="handleFileUpload"
              >
            </label>
          </div>
        </div>

        <!-- RIGHT: METADATA & QUICK TAGGING FORM -->
        <div class="lg:w-7/12 space-y-4">
          <h3 class="text-base font-bold font-heading text-primary flex items-center gap-2">
            <span>🏷️</span>
            <span>Detaljer & Märkning för riffet</span>
          </h3>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- TITLE -->
            <div class="sm:col-span-2 space-y-1">
              <label class="text-xs font-bold font-mono text-base-content/80">Titel / Arbetsnamn *</label>
              <input
                v-model="ideaForm.title"
                type="text"
                placeholder="t.ex. Tungt munspelsintro i A eller Shuffle-vers"
                class="input input-sm sm:input-md input-bordered w-full rounded-xl bg-base-100 font-medium"
              >
            </div>

            <!-- TONART (KEY) SELECTOR -->
            <div class="space-y-1">
              <label class="text-xs font-bold font-mono text-base-content/80">Tonart</label>
              <div class="flex gap-1.5">
                <select
                  v-model="ideaForm.key"
                  class="select select-sm select-bordered w-full rounded-xl bg-base-100 font-mono font-bold"
                >
                  <option v-for="k in musicalKeys" :key="k" :value="k">
                    {{ k }}
                  </option>
                </select>
              </div>
            </div>

            <!-- BPM & TAP TEMPO -->
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold font-mono text-base-content/80">Tempo (BPM)</label>
                <button
                  type="button"
                  class="btn btn-xs btn-outline btn-primary rounded-lg font-mono font-bold text-[10px]"
                  title="Klicka rytmiskt i takt med låten"
                  @click="handleTapTempo"
                >
                  🥁 Tappa tempo {{ tapTempoDisplay ? `(${tapTempoDisplay})` : '' }}
                </button>
              </div>
              <input
                v-model.number="ideaForm.bpm"
                type="number"
                min="40"
                max="260"
                placeholder="t.ex. 120"
                class="input input-sm select-bordered w-full rounded-xl bg-base-100 font-mono"
              >
            </div>

            <!-- RECORDED BY (BAND MEMBER) -->
            <div class="space-y-1">
              <label class="text-xs font-bold font-mono text-base-content/80">Inspelat av</label>
              <select
                v-model="ideaForm.recordedBy"
                class="select select-sm select-bordered w-full rounded-xl bg-base-100"
              >
                <option v-for="m in bandMembers" :key="m" :value="m">{{ m }}</option>
                <option value="Hela bandet">Hela bandet (Replokal)</option>
              </select>
            </div>

            <!-- LINK TO EXISTING SONG (OPTIONAL) -->
            <div class="space-y-1">
              <label class="text-xs font-bold font-mono text-base-content/80">Koppla till låt i repertoaren</label>
              <select
                v-model="ideaForm.linkedSongId"
                class="select select-sm select-bordered w-full rounded-xl bg-base-100 text-xs"
              >
                <option value="">-- Fristående idé / Ny låt --</option>
                <option v-for="s in songsData" :key="s.id" :value="s.id">
                  {{ s.title }} {{ s.isOriginal ? '(Original)' : '(Cover)' }}
                </option>
              </select>
            </div>

            <!-- TAGS -->
            <div class="sm:col-span-2 space-y-1.5">
              <label class="text-xs font-bold font-mono text-base-content/80">Taggar (Klicka för att lägga till)</label>
              <input
                v-model="ideaForm.tags"
                type="text"
                placeholder="Munspel, Slide, Intro..."
                class="input input-sm input-bordered w-full rounded-xl bg-base-100 text-xs"
              >
              <div class="flex flex-wrap gap-1 pt-1">
                <button
                  v-for="tag in quickTags"
                  :key="tag"
                  type="button"
                  class="badge badge-xs bg-base-100 hover:bg-primary hover:text-primary-content cursor-pointer border border-primary/30 font-medium py-2 px-2 rounded-lg"
                  @click="ideaForm.tags = ideaForm.tags ? `${ideaForm.tags}, ${tag}` : tag"
                >
                  + {{ tag }}
                </button>
              </div>
            </div>

            <!-- NOTES / CHORDS -->
            <div class="sm:col-span-2 space-y-1">
              <label class="text-xs font-bold font-mono text-base-content/80">Anteckningar & ackordskisser</label>
              <textarea
                v-model="ideaForm.notes"
                rows="2"
                placeholder="t.ex. Shuffle-komp på gitarr, Janis kör 2:a positionen på A-munspel, paus på 4:e takten..."
                class="textarea textarea-sm textarea-bordered w-full rounded-xl bg-base-100 text-xs font-sans"
              />
            </div>
          </div>

          <!-- SAVE ACTION BUTTON -->
          <div class="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              class="btn btn-primary font-bold px-8 rounded-2xl shadow-lg flex items-center gap-2"
              :disabled="isSavingIdea || isUploadingAudio || (!recordedBlob && !ideaForm.audioUrl)"
              @click="saveIdea"
            >
              <span v-if="isSavingIdea" class="loading loading-spinner loading-xs" />
              <span v-else>💾</span>
              <span>{{ isSavingIdea ? 'Sparar...' : 'Spara idé i banken' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. SAVED IDEAS VAULT & FILTER BAR -->
    <div class="space-y-4">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-base-200/60 p-3 rounded-2xl border border-primary/20">
        <!-- SEARCH -->
        <div class="flex-grow max-w-md">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 Sök idéer, tonarter, munspel, anteckningar..."
            class="input input-sm input-bordered w-full rounded-xl bg-base-100 text-xs"
          >
        </div>

        <!-- FILTERS -->
        <div class="flex items-center gap-2 overflow-x-auto text-xs">
          <!-- Filter Key -->
          <select
            v-model="filterKey"
            class="select select-xs select-bordered rounded-xl bg-base-100 font-mono font-bold"
          >
            <option value="ALL">Alla tonarter</option>
            <option v-for="k in musicalKeys" :key="k" :value="k">Tonart: {{ k }}</option>
          </select>

          <!-- Filter Member -->
          <select
            v-model="filterMember"
            class="select select-xs select-bordered rounded-xl bg-base-100"
          >
            <option value="ALL">Alla medlemmar</option>
            <option v-for="m in bandMembers" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
      </div>

      <!-- IDEAS LIST (CASSETTE TAPE CARDS) -->
      <div v-if="filteredIdeas.length === 0" class="text-center py-12 bg-base-200/40 rounded-3xl border border-dashed border-primary/30 p-8 space-y-3">
        <span class="text-5xl opacity-40">📼</span>
        <h3 class="text-lg font-bold font-heading text-primary">Inga sparade riff eller idéer hittades</h3>
        <p class="text-xs text-base-content/60 max-w-sm mx-auto">
          Starta en inspelning ovan med mikrofonen eller ladda upp en röstmemo-fil för att bygga upp replokals-arkivet.
        </p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="idea in filteredIdeas"
          :key="idea.id"
          class="bg-base-200/90 rounded-2xl p-4 border border-primary/30 shadow-md hover:border-primary/60 transition-all space-y-3 flex flex-col justify-between"
        >
          <!-- CARD TOP: CASSETTE BADGE & INFO -->
          <div class="space-y-2">
            <div class="flex items-start justify-between gap-2">
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <span class="text-base">📼</span>
                  <h3 class="font-bold font-heading text-primary text-base leading-snug">
                    {{ idea.title }}
                  </h3>
                </div>
                <div class="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-base-content/60">
                  <span>📅 {{ formatDate(idea.createdAt) }}</span>
                  <span>•</span>
                  <span>👤 {{ idea.recordedBy || 'Bandet' }}</span>
                  <span v-if="idea.duration">• ⏱️ {{ formatTime(idea.duration) }}</span>
                </div>
              </div>

              <!-- KEY BADGE -->
              <span
                v-if="idea.key"
                class="badge badge-warning font-mono font-black text-xs px-2.5 py-2 shadow-sm rounded-lg"
              >
                {{ idea.key }}
              </span>
            </div>

            <!-- LINKED SONG -->
            <div v-if="idea.linkedSongTitle" class="text-xs font-semibold text-amber-300 flex items-center gap-1 bg-base-300/80 px-2.5 py-1 rounded-lg border border-primary/20">
              <span>🎵 Kopplad till låt:</span>
              <span class="underline font-bold">{{ idea.linkedSongTitle }}</span>
            </div>

            <!-- NOTES -->
            <p v-if="idea.notes" class="text-xs text-base-content/80 bg-base-100/60 p-2.5 rounded-xl border border-primary/10 whitespace-pre-line font-sans italic">
              "{{ idea.notes }}"
            </p>

            <!-- TAGS & BPM CHIPS -->
            <div class="flex flex-wrap items-center gap-1 text-[11px]">
              <span v-if="idea.bpm" class="badge badge-xs bg-base-300 text-primary font-mono font-bold">
                🥁 {{ idea.bpm }} BPM
              </span>
              <span
                v-for="t in (idea.tags || '').split(',').map((s: string) => s.trim()).filter(Boolean)"
                :key="t"
                class="badge badge-xs bg-base-100 text-base-content/70 border border-primary/20"
              >
                #{{ t }}
              </span>
            </div>
          </div>

          <!-- CARD BOTTOM: CUSTOM AUDIO PLAYER & ACTIONS -->
          <div class="space-y-2 pt-2 border-t border-primary/10">
            <!-- Native HTML5 audio player -->
            <div class="flex items-center gap-2 bg-base-300/90 p-2 rounded-xl border border-primary/20">
              <audio
                :ref="`audio-${idea.id}`"
                :src="idea.audioUrl"
                controls
                class="w-full h-8"
              />
            </div>

            <!-- TOOLBAR: SLOW-DOWN SPEED / EDIT / DELETE -->
            <div class="flex items-center justify-between text-xs pt-1">
              <!-- PLAYBACK SPEED CONTROLS FOR PRACTICING RIFFS -->
              <div class="flex items-center gap-1 text-[10px] font-mono">
                <span class="text-base-content/50">Tempo:</span>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs px-1.5 py-0 h-5 min-h-0 rounded font-bold"
                  :class="playbackSpeed[idea.id] === 0.75 ? 'bg-primary text-primary-content' : 'text-base-content/70'"
                  @click="setSpeed(idea.id, 0.75, ($refs[`audio-${idea.id}`] as any)?.[0] || ($refs[`audio-${idea.id}`] as any))"
                >
                  0.75x
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs px-1.5 py-0 h-5 min-h-0 rounded font-bold"
                  :class="!playbackSpeed[idea.id] || playbackSpeed[idea.id] === 1.0 ? 'bg-primary text-primary-content' : 'text-base-content/70'"
                  @click="setSpeed(idea.id, 1.0, ($refs[`audio-${idea.id}`] as any)?.[0] || ($refs[`audio-${idea.id}`] as any))"
                >
                  1.0x
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs px-1.5 py-0 h-5 min-h-0 rounded font-bold"
                  :class="playbackSpeed[idea.id] === 1.25 ? 'bg-primary text-primary-content' : 'text-base-content/70'"
                  @click="setSpeed(idea.id, 1.25, ($refs[`audio-${idea.id}`] as any)?.[0] || ($refs[`audio-${idea.id}`] as any))"
                >
                  1.25x
                </button>
              </div>

              <!-- EDIT & DELETE BUTTONS -->
              <div class="flex items-center gap-1">
                <a
                  :href="idea.audioUrl"
                  download
                  class="btn btn-ghost btn-xs text-base-content/60 hover:text-primary"
                  title="Ladda ner ljudfil"
                >
                  ⬇️
                </a>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs text-base-content/70 hover:text-primary font-bold"
                  @click="openEditModal(idea)"
                >
                  ✏️ Ändra
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs text-error font-bold"
                  @click="deleteIdea(idea.id, idea.title)"
                >
                  🗑️ Radera
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. EDIT IDEA MODAL -->
    <dialog v-if="editingIdea" class="modal modal-open bg-black/70 backdrop-blur-sm z-50">
      <div class="modal-box bg-base-200 border border-primary/40 rounded-3xl max-w-lg shadow-2xl space-y-4">
        <div class="flex items-center justify-between border-b border-primary/20 pb-3">
          <h3 class="font-heading font-black text-lg text-primary flex items-center gap-2">
            <span>✏️</span>
            <span>Redigera Idé</span>
          </h3>
          <button type="button" class="btn btn-sm btn-circle btn-ghost" @click="closeEditModal">✕</button>
        </div>

        <div class="space-y-3 text-xs">
          <!-- TITLE -->
          <div class="space-y-1">
            <label class="font-bold font-mono text-base-content/80">Titel *</label>
            <input
              v-model="editingIdea.title"
              type="text"
              class="input input-sm input-bordered w-full rounded-xl bg-base-100 font-bold"
            >
          </div>

          <!-- KEY & BPM -->
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="font-bold font-mono text-base-content/80">Tonart</label>
              <select
                v-model="editingIdea.key"
                class="select select-sm select-bordered w-full rounded-xl bg-base-100 font-mono font-bold"
              >
                <option v-for="k in musicalKeys" :key="k" :value="k">{{ k }}</option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="font-bold font-mono text-base-content/80">BPM</label>
              <input
                v-model.number="editingIdea.bpm"
                type="number"
                class="input input-sm input-bordered w-full rounded-xl bg-base-100 font-mono"
              >
            </div>
          </div>

          <!-- RECORDED BY & LINKED SONG -->
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="font-bold font-mono text-base-content/80">Inspelat av</label>
              <select
                v-model="editingIdea.recordedBy"
                class="select select-sm select-bordered w-full rounded-xl bg-base-100"
              >
                <option v-for="m in bandMembers" :key="m" :value="m">{{ m }}</option>
                <option value="Hela bandet">Hela bandet</option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="font-bold font-mono text-base-content/80">Koppla till låt</label>
              <select
                v-model="editingIdea.linkedSongId"
                class="select select-sm select-bordered w-full rounded-xl bg-base-100 text-xs"
              >
                <option :value="null">-- Fristående --</option>
                <option v-for="s in songsData" :key="s.id" :value="s.id">{{ s.title }}</option>
              </select>
            </div>
          </div>

          <!-- TAGS -->
          <div class="space-y-1">
            <label class="font-bold font-mono text-base-content/80">Taggar</label>
            <input
              v-model="editingIdea.tags"
              type="text"
              class="input input-sm input-bordered w-full rounded-xl bg-base-100"
            >
          </div>

          <!-- NOTES -->
          <div class="space-y-1">
            <label class="font-bold font-mono text-base-content/80">Anteckningar</label>
            <textarea
              v-model="editingIdea.notes"
              rows="3"
              class="textarea textarea-sm textarea-bordered w-full rounded-xl bg-base-100"
            />
          </div>
        </div>

        <div class="modal-action flex items-center justify-end gap-2 pt-2 border-t border-primary/10">
          <button type="button" class="btn btn-sm btn-ghost rounded-xl" @click="closeEditModal">
            Avbryt
          </button>
          <button
            type="button"
            class="btn btn-sm btn-primary font-bold rounded-xl"
            :disabled="isUpdatingIdea"
            @click="updateIdea"
          >
            <span v-if="isUpdatingIdea" class="loading loading-spinner loading-xs" />
            <span>Spara ändringar</span>
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

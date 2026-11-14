<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  title: string
  audioUrl: string
  lyrics: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'apply', syncedLyrics: string): void
}>()

interface TapSyncLineItem {
  id: number
  text: string
  timestamp?: number
  isHeader?: boolean
  isSolo?: boolean
}

const tapSyncAudioRef = ref<HTMLAudioElement | null>(null)
const tapSyncAudioCurrentTime = ref(0)
const tapSyncAudioDuration = ref(0)
const tapSyncIsPlaying = ref(false)
const tapSyncLines = ref<TapSyncLineItem[]>([])
const tapSyncCurrentIndex = ref(0)

const formatSeconds = (secs: number) => {
  if (isNaN(secs) || secs < 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  const ms = Math.floor((secs % 1) * 10)
  return `${m}:${s < 10 ? '0' : ''}${s}.${ms}`
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      const parsed = parseLrc(props.lyrics || '')
      tapSyncLines.value = parsed.lines
        .map((l, i) => ({
          id: i,
          text: l.text,
          timestamp: l.time,
          isHeader: l.isHeader,
          isSolo: l.isSolo,
        }))
        .filter((l) => l.text.length > 0 || l.isHeader)

      const firstUnstamped = tapSyncLines.value.findIndex((l) => !l.isHeader && l.timestamp === undefined)
      tapSyncCurrentIndex.value = firstUnstamped >= 0 ? firstUnstamped : 0
      tapSyncAudioCurrentTime.value = 0
      tapSyncIsPlaying.value = false

      nextTick(() => {
        if (tapSyncAudioRef.value) {
          tapSyncAudioRef.value.currentTime = 0
        }
      })
    } else if (tapSyncAudioRef.value) {
      tapSyncAudioRef.value.pause()
      tapSyncIsPlaying.value = false
    }
  },
  { immediate: true },
)

const closeModal = () => {
  if (tapSyncAudioRef.value) {
    tapSyncAudioRef.value.pause()
  }
  tapSyncIsPlaying.value = false
  emit('update:modelValue', false)
}

const toggleTapSyncPlay = () => {
  if (!tapSyncAudioRef.value) return
  if (tapSyncAudioRef.value.paused) {
    tapSyncAudioRef.value
      .play()
      .then(() => {
        tapSyncIsPlaying.value = true
      })
      .catch((err) => {
        console.warn('Playback error:', err)
      })
  } else {
    tapSyncAudioRef.value.pause()
    tapSyncIsPlaying.value = false
  }
}

const onTapSyncAudioTimeUpdate = () => {
  if (tapSyncAudioRef.value) {
    tapSyncAudioCurrentTime.value = tapSyncAudioRef.value.currentTime
    tapSyncAudioDuration.value = tapSyncAudioRef.value.duration || 0
  }
}

const onTapSyncAudioEnded = () => {
  tapSyncIsPlaying.value = false
}

const stampCurrentLine = () => {
  if (tapSyncCurrentIndex.value >= tapSyncLines.value.length) return
  const line = tapSyncLines.value[tapSyncCurrentIndex.value]
  if (line) {
    line.timestamp = tapSyncAudioCurrentTime.value
    tapSyncCurrentIndex.value++
    while (
      tapSyncCurrentIndex.value < tapSyncLines.value.length &&
      tapSyncLines.value[tapSyncCurrentIndex.value]?.isHeader
    ) {
      tapSyncCurrentIndex.value++
    }
  }
}

const stampSoloBreak = () => {
  const insertIdx = tapSyncCurrentIndex.value
  tapSyncLines.value.splice(insertIdx, 0, {
    id: Date.now(),
    text: '(Solo / Paus)',
    timestamp: tapSyncAudioCurrentTime.value,
    isSolo: true,
  })
  tapSyncCurrentIndex.value++
}

const undoLastStamp = () => {
  if (tapSyncCurrentIndex.value <= 0) return
  tapSyncCurrentIndex.value--
  const line = tapSyncLines.value[tapSyncCurrentIndex.value]
  if (line) {
    line.timestamp = undefined
  }
}

const resetTapSync = () => {
  tapSyncLines.value.forEach((l) => {
    l.timestamp = undefined
  })
  tapSyncCurrentIndex.value = 0
  if (tapSyncAudioRef.value) {
    tapSyncAudioRef.value.currentTime = 0
  }
}

const applyTapSync = () => {
  const outputLines = tapSyncLines.value.map((l) => {
    if (l.isHeader) {
      return l.text.startsWith('[') ? l.text : `[${l.text}]`
    }
    if (l.timestamp !== undefined) {
      return `${formatLrcTimestamp(l.timestamp)} ${l.text}`
    }
    return l.text
  })

  if (tapSyncAudioRef.value) {
    tapSyncAudioRef.value.pause()
  }
  tapSyncIsPlaying.value = false
  emit('apply', outputLines.join('\n'))
  emit('update:modelValue', false)
}

const onSyncKeydown = (e: KeyboardEvent) => {
  if (!props.modelValue) return
  const target = e.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
  if (e.code === 'Space') {
    e.preventDefault()
    stampCurrentLine()
  }
}

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('keydown', onSyncKeydown)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', onSyncKeydown)
  }
})
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-hidden"
  >
    <div class="stage-card max-w-2xl w-full max-h-[94vh] flex flex-col rounded-3xl border-2 border-primary/40 shadow-2xl bg-base-100 relative overflow-hidden">
      <!-- 1. Modal Header -->
      <div class="flex items-center justify-between border-b border-primary/20 p-4 flex-shrink-0 bg-base-100">
        <div class="space-y-0.5">
          <div class="flex items-center gap-2">
            <span class="text-xl">⏱️</span>
            <h3 class="font-heading text-lg text-primary font-black">
              Text-synkare (Tap-to-sync)
            </h3>
          </div>
          <p class="text-xs text-base-content/70">
            Synka <strong class="text-primary">{{ title || 'låten' }}</strong> till musiken. Tryck <kbd class="kbd kbd-xs bg-base-300 font-mono text-primary font-bold">Mellanslag</kbd> eller klicka på knappen i takt med att raderna sjungs!
          </p>
        </div>

        <button
          type="button"
          class="btn btn-sm btn-circle btn-ghost text-lg cursor-pointer"
          @click="closeModal"
        >
          ✕
        </button>
      </div>

      <!-- 2. Audio Player Bar -->
      <div class="bg-base-200/90 border-b border-primary/20 p-3 flex flex-col gap-2 flex-shrink-0">
        <audio
          ref="tapSyncAudioRef"
          :src="audioUrl || undefined"
          preload="metadata"
          @timeupdate="onTapSyncAudioTimeUpdate"
          @ended="onTapSyncAudioEnded"
        />

        <div class="flex items-center justify-between gap-3">
          <button
            type="button"
            class="btn btn-sm btn-primary rounded-full px-4 font-bold flex items-center gap-2 cursor-pointer shadow-md"
            :disabled="!audioUrl"
            @click="toggleTapSyncPlay"
          >
            <span>{{ tapSyncIsPlaying ? '⏸ Pausa' : '▶ Spela musik' }}</span>
          </button>

          <div class="flex items-center gap-2 font-mono text-xs">
            <span class="text-amber-300 font-black text-sm">{{ formatSeconds(tapSyncAudioCurrentTime) }}</span>
            <span class="text-base-content/40">/</span>
            <span class="text-base-content/70">{{ formatSeconds(tapSyncAudioDuration) }}</span>
          </div>

          <div class="text-[11px] font-mono text-secondary font-bold">
            {{ tapSyncLines.filter(l => l.timestamp !== undefined).length }} / {{ tapSyncLines.filter(l => !l.isHeader).length }} rader synkade
          </div>
        </div>

        <input
          v-if="audioUrl"
          type="range"
          min="0"
          :max="tapSyncAudioDuration || 180"
          step="0.1"
          :value="tapSyncAudioCurrentTime"
          class="range range-xs range-primary w-full cursor-pointer"
          @input="(e) => {
            const val = parseFloat((e.target as HTMLInputElement).value);
            tapSyncAudioCurrentTime = val;
            if (tapSyncAudioRef) tapSyncAudioRef.currentTime = val;
          }"
        >
        <div v-else class="text-[11px] text-amber-400/90 bg-amber-950/20 p-1.5 rounded-lg border border-amber-500/20 text-center">
          💡 Tips: Ladda upp låtens ljudfil (MP3/WAV) i formuläret för att höra musiken spelas medan du trycker.
        </div>
      </div>

      <!-- 3. Main Center Stage: Live Tap & Prompter Card -->
      <div class="p-4 overflow-y-auto flex-1 space-y-3.5">
        <div class="p-4 sm:p-5 rounded-2xl bg-base-200 border-2 border-primary/40 space-y-3 shadow-lg relative overflow-hidden">
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-secondary font-bold">
              {{ tapSyncCurrentIndex >= tapSyncLines.length ? '✓ Alla rader har stämplats!' : `Rad ${tapSyncCurrentIndex + 1} av ${tapSyncLines.length}` }}
            </span>
            <span class="badge badge-xs font-mono" :class="tapSyncIsPlaying ? 'badge-primary animate-pulse' : 'badge-ghost'">
              {{ tapSyncIsPlaying ? '▶ MUSIKEN SPELAS' : '⏸ PAUSAD' }}
            </span>
          </div>

          <div v-if="tapSyncCurrentIndex > 0 && tapSyncLines[tapSyncCurrentIndex - 1]" class="opacity-60 text-xs font-mono truncate flex items-center gap-2">
            <span class="badge badge-xs badge-outline text-emerald-400 font-mono">
              {{ formatLrcTimestamp(tapSyncLines[tapSyncCurrentIndex - 1]?.timestamp || 0) }}
            </span>
            <span class="truncate line-through text-base-content/70">{{ tapSyncLines[tapSyncCurrentIndex - 1]?.text }}</span>
          </div>

          <div class="p-3.5 rounded-xl bg-base-100 border-2 border-amber-400 shadow-inner min-h-[70px] flex flex-col justify-center text-center space-y-1">
            <span class="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold">
              {{ tapSyncCurrentIndex >= tapSyncLines.length ? 'Klart!' : 'Klicka när sångaren börjar sjunga denna rad:' }}
            </span>
            <p v-if="tapSyncCurrentIndex < tapSyncLines.length" class="font-heading font-black text-lg sm:text-xl text-primary leading-tight">
              {{ tapSyncLines[tapSyncCurrentIndex]?.text || '—' }}
            </p>
            <p v-else class="text-emerald-400 font-bold text-base flex items-center justify-center gap-1.5">
              <span>🎉</span> <span>Alla rader har fått tidsstämplar! Klicka på "Använd synkad text" nedan.</span>
            </p>
          </div>

          <div v-if="tapSyncCurrentIndex + 1 < tapSyncLines.length" class="opacity-50 text-xs font-mono truncate flex items-center gap-2">
            <span class="text-[10px] text-base-content/50 uppercase">Nästa:</span>
            <span class="truncate">{{ tapSyncLines[tapSyncCurrentIndex + 1]?.text }}</span>
          </div>

          <button
            type="button"
            class="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-600 to-primary hover:from-amber-500 hover:to-primary-focus text-neutral font-black text-base sm:text-lg shadow-xl shadow-primary/30 active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer disabled:opacity-40"
            :disabled="tapSyncCurrentIndex >= tapSyncLines.length"
            @click="stampCurrentLine"
          >
            <div class="flex items-center gap-2">
              <span>⏱️</span>
              <span>STÄMPLA DENNA RAD NU</span>
            </div>
            <span class="text-[11px] font-mono opacity-80 font-normal">
              (Tryck <kbd class="bg-black/30 px-1.5 py-0.5 rounded text-white font-bold">Mellanslag</kbd> eller klicka här vid <strong class="underline">{{ formatSeconds(tapSyncAudioCurrentTime) }}</strong>)
            </span>
          </button>

          <div class="flex items-center justify-between gap-2 pt-1 flex-wrap">
            <button
              type="button"
              class="btn btn-xs btn-outline btn-secondary rounded-lg gap-1 text-[11px] font-bold cursor-pointer"
              title="Lägg till en markering för instrumental solo / paus vid aktuell tidpunkt"
              @click="stampSoloBreak"
            >
              <span>🎷</span>
              <span>Infoga solo/paus</span>
            </button>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="btn btn-xs btn-ghost text-xs rounded-lg gap-1 cursor-pointer"
                :disabled="tapSyncCurrentIndex <= 0"
                title="Gå tillbaka och ångra stämplingen för förra raden"
                @click="undoLastStamp"
              >
                <span>↩</span>
                <span>Ångra rad</span>
              </button>

              <button
                type="button"
                class="btn btn-xs btn-ghost text-error text-xs rounded-lg gap-1 cursor-pointer"
                title="Rensa alla tidsstämplar och börja om"
                @click="resetTapSync"
              >
                <span>🔄</span>
                <span>Börja om</span>
              </button>
            </div>
          </div>
        </div>

        <div class="space-y-1.5">
          <span class="text-xs font-bold text-secondary flex items-center justify-between">
            <span>📋 Översikt över alla rader:</span>
            <span class="text-[10px] text-base-content/60 font-mono">Klicka på en rad för att hoppa i synkningen</span>
          </span>

          <div class="max-h-44 overflow-y-auto bg-base-200/70 p-2 rounded-xl border border-primary/20 space-y-1 font-mono text-xs">
            <div
              v-for="(line, idx) in tapSyncLines"
              :key="line.id"
              class="p-1.5 rounded flex items-center justify-between gap-2 cursor-pointer transition-colors"
              :class="idx === tapSyncCurrentIndex
                ? 'bg-primary text-primary-content font-bold shadow-xs'
                : line.timestamp !== undefined
                  ? 'bg-base-300/80 text-emerald-400'
                  : 'text-base-content/60 hover:bg-base-300/40'"
              @click="tapSyncCurrentIndex = idx"
            >
              <div class="flex items-center gap-2 truncate">
                <span class="text-[10px] font-mono opacity-60 w-5 text-right">{{ idx + 1 }}.</span>
                <span class="truncate">{{ line.text || '[Tom rad]' }}</span>
              </div>
              <div class="flex items-center gap-1.5 flex-shrink-0">
                <span v-if="line.timestamp !== undefined" class="badge badge-xs font-mono font-bold" :class="idx === tapSyncCurrentIndex ? 'badge-neutral text-primary' : 'badge-primary'">
                  {{ formatLrcTimestamp(line.timestamp) }}
                </span>
                <span v-else class="text-[10px] text-base-content/40 italic">Ostämpad</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Modal Footer -->
      <div class="border-t border-primary/20 p-3.5 bg-base-200 flex items-center justify-between flex-shrink-0">
        <button
          type="button"
          class="btn btn-ghost btn-sm rounded-full cursor-pointer text-xs"
          @click="closeModal"
        >
          Avbryt
        </button>

        <button
          type="button"
          class="btn btn-primary btn-sm rounded-full font-bold px-5 shadow-lg shadow-primary/30 flex items-center gap-2 cursor-pointer"
          @click="applyTapSync"
        >
          <span>✓</span>
          <span>Använd synkad text</span>
        </button>
      </div>
    </div>
  </div>
</template>

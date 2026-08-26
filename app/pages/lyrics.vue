<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

useSeoMeta({
  title: 'Låttexter | Det 7:e Gunget',
  description: 'Sjung med i Det 7:e Gungets egna låtar! Officiella låttexter, verser och refränger direkt från replokalen.',
})

interface Song {
  id: string
  title: string
  isOriginal: boolean
  originalArtist: string | null
  embedProvider: string
  embedUrl: string
  audioUrl: string | null
  duration: number | null
  lyrics: string | null
  lyricsEn: string | null
  chords: string | null
  sortOrder: number
}

const { data: songsData } = await useFetch<Song[]>('/api/songs', {
  default: () => [],
})

const songsWithLyrics = computed(() => {
  const list = songsData.value || []
  return list.filter((s) => s.lyrics && s.lyrics.trim().length > 0)
})

const activeSongId = ref<string>('')
const showChords = ref(true)
const showEnglish = ref(false)
const searchQuery = ref('')

// Initialize active song from route hash or first song with lyrics
onMounted(() => {
  const hash = route.hash ? route.hash.replace('#', '') : ''
  if (hash && songsWithLyrics.value.some((s) => s.id === hash)) {
    activeSongId.value = hash
    scrollToSong(hash)
  } else if (songsWithLyrics.value.length > 0) {
    activeSongId.value = songsWithLyrics.value[0]?.id || ''
  }
})

watch(
  () => route.hash,
  (newHash) => {
    if (newHash) {
      const id = newHash.replace('#', '')
      if (songsWithLyrics.value.some((s) => s.id === id)) {
        activeSongId.value = id
        scrollToSong(id)
      }
    }
  },
)

const scrollToSong = (id: string) => {
  setTimeout(() => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 100)
}

const selectSong = (id: string) => {
  activeSongId.value = id
  window.history.replaceState(null, '', `#${id}`)
  scrollToSong(id)
}

const filteredSongs = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return songsWithLyrics.value
  return songsWithLyrics.value.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      (s.lyrics && s.lyrics.toLowerCase().includes(q)) ||
      (s.originalArtist && s.originalArtist.toLowerCase().includes(q)),
  )
})

const activeSong = computed(() => {
  return songsWithLyrics.value.find((s) => s.id === activeSongId.value) || songsWithLyrics.value[0] || null
})

// Format lyrics into stylized verse/chorus blocks
const parseLyricsBlocks = (text: string | null) => {
  if (!text) return []
  const lines = text.split('\n')
  const blocks: { type: 'verse' | 'chorus' | 'bridge' | 'outro' | 'text'; label: string; lines: string[] }[] = []
  let currentBlock: { type: 'verse' | 'chorus' | 'bridge' | 'outro' | 'text'; label: string; lines: string[] } = {
    type: 'text',
    label: '',
    lines: [],
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      if (currentBlock.lines.length > 0) {
        blocks.push(currentBlock)
        currentBlock = { type: 'text', label: '', lines: [] }
      }
      continue
    }

    const tagMatch = line.match(/^\[(.*?)\]$/)
    if (tagMatch && tagMatch[1]) {
      if (currentBlock.lines.length > 0) {
        blocks.push(currentBlock)
      }
      const label = tagMatch[1]
      let type: 'verse' | 'chorus' | 'bridge' | 'outro' | 'text' = 'text'
      const lower = label.toLowerCase()
      if (lower.includes('refräng') || lower.includes('chorus')) type = 'chorus'
      else if (lower.includes('vers') || lower.includes('verse')) type = 'verse'
      else if (lower.includes('stick') || lower.includes('bridge') || lower.includes('solo')) type = 'bridge'
      else if (lower.includes('outro') || lower.includes('slut')) type = 'outro'

      currentBlock = { type, label, lines: [] }
    } else {
      currentBlock.lines.push(rawLine)
    }
  }

  if (currentBlock.lines.length > 0) {
    blocks.push(currentBlock)
  }

  return blocks
}
</script>

<template>
  <div class="relative min-h-screen pb-24 overflow-hidden">
    <!-- Atmospheric Stage & Rehearsal Room Background -->
    <div class="absolute inset-0 -z-10 pointer-events-none">
      <NuxtImg
        src="/media/brand/jukebox_diner_bg.webp"
        alt="Rehearsal room atmosphere"
        class="w-full h-full object-cover opacity-15 filter blur-sm scale-105"
        priority
      />
      <div class="absolute inset-0 bg-gradient-to-b from-base-100 via-base-100/90 to-base-100" />
      <div class="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 rounded-full blur-[140px]" />
    </div>

    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6 sm:space-y-8">
      <!-- HEADER: Centered with Eyebrow -->
      <PageHeader
        title="Låttexter"
        description="Sjung med i svänget! Här hittar du texterna till våra egna bluesrökare och tolkningar samt låthistorier direkt från replokalen."
      />

        <!-- Quick Filter / Search Bar -->
        <div class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <div class="relative w-full max-w-md">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Sök efter låt eller textrad..."
              class="input input-bordered input-sm sm:input-md w-full rounded-full pl-10 pr-4 bg-base-200/90 text-xs sm:text-sm border-primary/30 focus:border-primary"
            />
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-base-content/50">🔍</span>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="btn btn-sm rounded-full text-xs font-bold border transition-colors cursor-pointer"
              :class="showChords ? 'btn-primary shadow-sm' : 'btn-outline border-primary/30 text-base-content/70'"
              @click="showChords = !showChords"
            >
              🎸 {{ showChords ? 'Dölj ackord' : 'Visa ackord' }}
            </button>

            <button
              type="button"
              class="btn btn-sm rounded-full text-xs font-bold border transition-colors cursor-pointer"
              :class="showEnglish ? 'btn-secondary shadow-sm' : 'btn-outline border-secondary/30 text-base-content/70'"
              @click="showEnglish = !showEnglish"
            >
              🇬🇧 {{ showEnglish ? 'Svenska texter' : 'Engelsk översättning' }}
            </button>
          </div>
        </div>
      </div>

      <!-- MAIN SONGBOOK LAYOUT (Index on left, Song Sheet on right) -->
      <div class="grid lg:grid-cols-[300px_1fr] gap-8 items-start">
        <!-- LEFT: Spiral Song Index Sidebar -->
        <div class="stage-card p-5 rounded-3xl border border-primary/30 space-y-4 shadow-xl lg:sticky lg:top-24">
          <div class="flex items-center justify-between border-b border-primary/20 pb-3">
            <span class="font-heading text-lg text-primary font-bold">Innehållsförteckning</span>
            <span class="badge badge-primary font-mono text-xs font-bold">{{ filteredSongs.length }} låtar</span>
          </div>

          <div class="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
            <button
              v-for="(song, idx) in filteredSongs"
              :key="song.id"
              type="button"
              class="w-full text-left p-3 rounded-xl font-medium text-xs sm:text-sm transition-all flex items-center justify-between gap-2 cursor-pointer"
              :class="
                activeSongId === song.id
                  ? 'bg-primary text-primary-content font-bold shadow-md shadow-primary/20 scale-[1.02]'
                  : 'bg-base-200/70 hover:bg-base-200 text-base-content/80 hover:text-primary'
              "
              @click="selectSong(song.id)"
            >
              <div class="flex items-center gap-2.5 truncate">
                <span class="font-mono text-xs opacity-70 w-4 text-right flex-shrink-0">{{ idx + 1 }}.</span>
                <span class="truncate">{{ song.title }}</span>
              </div>
              <span
                v-if="song.isOriginal"
                class="badge badge-xs font-mono font-bold uppercase flex-shrink-0"
                :class="activeSongId === song.id ? 'badge-neutral text-primary' : 'badge-primary badge-outline'"
              >
                Egen
              </span>
            </button>
          </div>

          <!-- Jukebox Direct Link -->
          <div class="pt-4 border-t border-primary/20 text-center">
            <NuxtLink :to="localePath('/music')" class="btn btn-outline btn-secondary btn-sm w-full rounded-full font-bold">
              🎵 Lyssna i Jukeboxen →
            </NuxtLink>
          </div>
        </div>

        <!-- RIGHT: Authentic Weathered Stage Binder Sheet -->
        <div v-if="activeSong" :id="activeSong.id" class="songbook-sheet relative bg-[#faf6ed] text-[#1c1611] p-6 sm:p-10 lg:p-12 rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-[#dfd2be] space-y-8 select-text">
          <!-- Spiral binder hole punch marks on top left -->
          <div class="hidden sm:flex items-center gap-6 absolute top-3 left-8 pointer-events-none opacity-60">
            <div v-for="h in 6" :key="h" class="w-3.5 h-3.5 rounded-full bg-[#1a120b] shadow-inner border border-[#4d3824]" />
          </div>

          <!-- Song Header Title & Info -->
          <div class="border-b-2 border-dashed border-[#8c765c]/40 pb-6 pt-2">
            <div class="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
              <div>
                <div class="text-[10px] sm:text-xs font-mono font-black uppercase tracking-widest text-[#801b1c] flex items-center gap-2">
                  <span>★ DET 7:E GUNGET ★</span>
                  <span v-if="activeSong.isOriginal" class="bg-[#ecd5c3] px-2 py-0.5 rounded text-[#731a1b] font-bold">ORIGINALKOMPOSITION</span>
                  <span v-else class="text-[#634e3b]">Cover av {{ activeSong.originalArtist }}</span>
                </div>

                <h2 class="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-[#1a1209] tracking-tight uppercase mt-1">
                  {{ activeSong.title }}
                </h2>
              </div>

              <!-- Jukebox Audio Jump Button -->
              <div class="flex items-center gap-2 flex-shrink-0">
                <NuxtLink
                  :to="localePath({ path: '/music', query: { song: activeSong.id } })"
                  class="btn btn-sm bg-[#912426] hover:bg-[#731a1b] text-[#faf6ed] border-none rounded-full font-bold shadow px-4 text-xs"
                >
                  ▶ Spela i Jukeboxen
                </NuxtLink>
              </div>
            </div>

            <!-- Chords / Key Sheet Info -->
            <div v-if="showChords && activeSong.chords" class="mt-4 p-3.5 rounded-xl bg-[#ede3d1] border border-[#d6c5aa] font-mono text-xs text-[#422e1b] space-y-1 shadow-inner">
              <div class="font-bold text-[#801b1c] flex items-center gap-1.5">
                <span>🎸</span> ACKORD & STRUKTUR:
              </div>
              <pre class="font-mono text-xs whitespace-pre-wrap leading-relaxed">{{ activeSong.chords }}</pre>
            </div>
          </div>

          <!-- Lyrics Body with Verse / Chorus Callouts -->
          <div class="space-y-6 text-sm sm:text-base leading-relaxed">
            <template v-if="!showEnglish || !activeSong.lyricsEn">
              <div
                v-for="(block, bIdx) in parseLyricsBlocks(activeSong.lyrics)"
                :key="bIdx"
                class="rounded-xl p-4 sm:p-5 transition-colors"
                :class="
                  block.type === 'chorus'
                    ? 'bg-[#ede0c8] border-l-4 border-[#912426] shadow-sm'
                    : block.type === 'bridge'
                      ? 'bg-[#e8dec6]/70 border-l-4 border-[#b45309] italic'
                      : 'bg-transparent'
                "
              >
                <!-- Block Label (e.g. [Refräng], [Vers 1]) -->
                <div v-if="block.label" class="text-[11px] font-mono font-black uppercase tracking-wider mb-2"
                  :class="block.type === 'chorus' ? 'text-[#912426]' : 'text-[#6e5845]'"
                >
                  {{ block.label }}
                </div>

                <div class="font-serif sm:font-sans font-medium text-[#1c150f] space-y-1 whitespace-pre-line text-sm sm:text-base">
                  <div v-for="(line, lIdx) in block.lines" :key="lIdx" class="leading-relaxed">
                    {{ line }}
                  </div>
                </div>
              </div>
            </template>

            <!-- English Translation View -->
            <template v-else>
              <div class="p-3 rounded-lg bg-secondary/15 text-secondary text-xs font-mono font-bold mb-4">
                🇬🇧 English lyric interpretation:
              </div>
              <div
                v-for="(block, bIdx) in parseLyricsBlocks(activeSong.lyricsEn)"
                :key="'en-' + bIdx"
                class="rounded-xl p-4 sm:p-5"
                :class="
                  block.type === 'chorus'
                    ? 'bg-[#ede0c8] border-l-4 border-[#912426]'
                    : 'bg-transparent'
                "
              >
                <div v-if="block.label" class="text-[11px] font-mono font-black uppercase tracking-wider mb-2 text-[#912426]">
                  {{ block.label }}
                </div>
                <div class="font-medium text-[#1c150f] space-y-1 whitespace-pre-line">
                  <div v-for="(line, lIdx) in block.lines" :key="lIdx">
                    {{ line }}
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Sheet Footer Band Stamp -->
          <div class="pt-6 border-t-2 border-dashed border-[#8c765c]/40 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-[#735e47] gap-3">
            <div class="flex items-center gap-2">
              <span>✍️ Text & Musik: Det 7:e Gunget</span>
            </div>
            <div class="font-bold text-[#801b1c]">
              VOLYM: 11 ⚡ BLUES & ROCK
            </div>
          </div>
        </div>
      </div>
    </div>
</template>

<style scoped>
.songbook-sheet {
  background: radial-gradient(ellipse at 50% 20%, #faf6ed 0%, #f3ebdb 80%, #ebdcc5 100%);
}
</style>

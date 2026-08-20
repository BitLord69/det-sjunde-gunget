<script setup lang="ts">
const { locale } = useI18n()
const localePath = useLocalePath()

interface Song {
  id: string
  title: string
  originalArtist?: string | null
  isOriginal: boolean
  audioUrl?: string | null
  coverImage?: string | null
  embedUrl?: string | null
  embedProvider?: string | null
}

interface Props {
  song: Song
  isPlaying?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPlaying: false,
})

const emit = defineEmits<{
  togglePlay: [song: Song]
}>()

const getSongCover = (song: Song) => {
  if (song.coverImage) return song.coverImage
  const slug = (song.title || '').toLowerCase()
  if (slug.includes('sjunde') || slug.includes('7:e')) return '/images/records/det-sjunde-gunget.jpg'
  if (slug.includes('sväng') || slug.includes('källaren')) return '/images/records/svang-i-kallaren.jpg'
  if (slug.includes('hoochie') || slug.includes('coochie')) return '/images/records/hoochie-coochie-man.jpg'
  if (slug.includes('bad sign') || slug.includes('born')) return '/images/records/born-under-a-bad-sign.jpg'
  if (slug.includes('thrill') || slug.includes('gone')) return '/images/records/the-thrill-is-gone.jpg'
  if (slug.includes('chicago') || slug.includes('sweet')) return '/images/records/sweet-home-chicago.jpg'
  return song.isOriginal ? '/images/records/det-sjunde-gunget.jpg' : '/images/records/hoochie-coochie-man.jpg'
}
</script>

<template>
  <div class="relative group flex flex-col justify-between">
    <!-- 1. The 7" Black Vinyl Disc (Pops up on hover; sways left/right & spins when playing) -->
    <div
      class="absolute left-1/2 -translate-x-1/2 w-[84%] aspect-square rounded-full bg-[#0d0b0a] shadow-[0_8px_30px_rgba(0,0,0,0.95)] transition-all duration-300 ease-out pointer-events-none z-0 flex items-center justify-center border border-white/5"
      :class="[
        isPlaying
          ? '-top-10 ring-2 ring-primary/40 shadow-primary/30'
          : 'top-3 group-hover:-top-10 group-hover:rotate-6',
      ]"
    >
      <!-- Spinning & Swaying Inner Disc -->
      <div
        class="relative w-full h-full rounded-full flex items-center justify-center"
        :class="isPlaying ? 'vinyl-playing-sway' : ''"
      >
        <div
          class="relative w-full h-full rounded-full flex items-center justify-center"
          :class="isPlaying ? 'vinyl-disc-spin' : ''"
        >
          <!-- Continuous Grooves Bed & Light Reflection -->
          <div
            class="absolute inset-0 rounded-full pointer-events-none opacity-40"
            style="background: conic-gradient(from 45deg, transparent 0deg, rgba(255,255,255,0.08) 45deg, transparent 90deg, transparent 180deg, rgba(255,255,255,0.08) 225deg, transparent 270deg);"
          />
          <!-- Single Run-out groove -->
          <div class="absolute inset-4 rounded-full border border-white/10" />
          <!-- Circular 45 RPM Center Label -->
          <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-secondary via-primary to-secondary text-neutral flex flex-col items-center justify-center text-center p-0.5 shadow-md flex-shrink-0">
            <span class="text-[5px] font-mono font-black uppercase tracking-tighter">7:E GUNGET</span>
            <span class="text-[6px] font-heading font-black truncate max-w-[36px] leading-tight">45 RPM</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Authentic Square 7" Cardboard Single Jacket (Cover Artwork, z-10) -->
    <div
      class="relative z-10 w-full aspect-square rounded-md border border-amber-900/40 shadow-2xl transition-all duration-500 overflow-hidden cursor-pointer bg-[#140e0a]"
      :class="[
        isPlaying
          ? 'ring-4 ring-primary shadow-primary/40 shadow-2xl scale-[1.02]'
          : 'hover:shadow-2xl hover:scale-[1.02] border-primary/20',
      ]"
      @click="$emit('togglePlay', song)"
    >
      <!-- A. Custom Full-Bleed Artwork Image -->
      <img
        v-if="getSongCover(song)"
        :src="getSongCover(song)!"
        :alt="song.title"
        class="w-full h-full object-cover rounded-sm select-none"
        loading="lazy"
      />

      <!-- B. Dynamic Vintage Stamped Sleeve fallback -->
      <div
        v-else
        class="w-full h-full p-4 flex flex-col justify-between select-none relative overflow-hidden"
        :class="[
          song.isOriginal
            ? 'bg-gradient-to-br from-[#c69352] via-[#9e6d34] to-[#6a421a] text-[#1c0f08]'
            : 'bg-gradient-to-br from-[#8e2e1e] via-[#6e1e12] to-[#451007] text-[#fef3c7]',
        ]"
      >
        <div class="absolute inset-3.5 rounded-full border border-black/15 pointer-events-none" />
        <div class="absolute inset-0 bg-radial from-transparent via-black/10 to-black/45 pointer-events-none rounded-md" />
        <div class="absolute left-1.5 top-0 bottom-0 w-[1px] bg-black/25 pointer-events-none" />

        <div
          class="relative z-10 flex items-center justify-between border-b pb-1"
          :class="song.isOriginal ? 'border-black/20' : 'border-white/15'"
        >
          <span class="text-[10px] font-heading font-black tracking-wider uppercase">
            DET 7:E GUNGET
          </span>
          <span
            class="text-[8px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
            :class="song.isOriginal ? 'bg-black/15 text-[#2b1609]' : 'bg-black/30 text-[#fde68a]'"
          >
            45 RPM HI-FI
          </span>
        </div>

        <div class="relative z-10 my-auto text-center space-y-1">
          <div class="w-14 h-14 mx-auto rounded-full border-2 border-black/20 flex items-center justify-center bg-black/10 shadow-inner">
            <span class="text-xl">🎸</span>
          </div>
          <h3
            class="font-heading text-base sm:text-lg font-black line-clamp-2 leading-tight drop-shadow-sm tracking-tight px-1"
            :class="song.isOriginal ? 'text-[#140a04]' : 'text-white'"
          >
            {{ song.title }}
          </h3>
        </div>

        <div
          class="relative z-10 text-center border-t pt-1"
          :class="song.isOriginal ? 'border-black/20' : 'border-white/15'"
        >
          <p
            class="text-[10px] font-mono font-bold truncate uppercase tracking-wider"
            :class="song.isOriginal ? 'text-[#3b1c09]' : 'text-[#fef3c7]/80'"
          >
            {{ song.isOriginal ? 'Originalkomposition' : `Cover • ${song.originalArtist || 'Okänd'}` }}
          </p>
        </div>
      </div>

      <!-- Subtle Vintage Cardboard Vignette & Ring-wear Sheen Overlay -->
      <div class="absolute inset-0 bg-radial from-transparent via-black/5 to-black/35 pointer-events-none rounded-md" />
      <div class="absolute left-1.5 top-0 bottom-0 w-[1px] bg-black/30 pointer-events-none" />

      <!-- Tactile Retro Play Badge / Center Hole Interactive Trigger -->
      <div class="absolute inset-0 flex items-center justify-center">
        <button
          type="button"
          class="w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-2xl flex items-center justify-center font-bold text-xl transition-all duration-300 cursor-pointer border-2 z-20 backdrop-blur-sm"
          :class="[
            isPlaying
              ? 'bg-primary text-neutral border-white ring-4 ring-primary/60 scale-105'
              : 'bg-black/70 hover:bg-primary text-amber-200 hover:text-neutral border-primary/60 hover:scale-110 opacity-90 group-hover:opacity-100',
          ]"
          :title="isPlaying ? 'Pausa' : 'Provlyssna'"
          @click.stop="$emit('togglePlay', song)"
        >
          <span class="drop-shadow-md">{{ isPlaying ? '⏸' : '▶' }}</span>
        </button>
      </div>

      <!-- "Spelar nu" Live Indicator Pill -->
      <div
        v-if="isPlaying"
        class="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 badge badge-primary font-mono font-black text-[9px] uppercase px-2.5 py-0.5 shadow-lg animate-pulse"
      >
        SPELAR NU
      </div>
    </div>

    <!-- Bottom Meta Links below the sleeve -->
    <div class="relative z-10 pt-2.5 px-1 flex items-center justify-between text-xs font-mono">
      <NuxtLink
        :to="localePath({ path: '/music', query: { song: song.id } })"
        class="text-primary hover:text-amber-300 font-bold flex items-center gap-1 transition-colors text-[11px]"
        title="Lyssna i Jukeboxen med låttext"
      >
        <span>📻 Jukebox</span>
      </NuxtLink>

      <span
        class="badge badge-xs font-bold text-[9px] uppercase font-mono px-2 py-0.5 shadow-sm"
        :class="song.isOriginal ? 'badge-primary text-neutral font-black' : 'badge-secondary text-neutral font-bold'"
      >
        {{ song.isOriginal ? 'Original' : 'Cover' }}
      </span>

      <a
        v-if="song.embedUrl && song.embedUrl !== '#' && !song.embedUrl.startsWith('/media/')"
        :href="song.embedUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="text-secondary hover:text-primary font-bold flex items-center gap-1 transition-colors text-[11px]"
      >
        <span>{{ song.embedProvider }}</span>
        <span>↗</span>
      </a>
      <span v-else class="text-base-content/40 text-[10px]">
        {{ song.audioUrl ? 'Direkt' : '' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
@keyframes vinyl-groove-sway {
  0%, 100% {
    transform: translateX(0px);
  }
  25% {
    transform: translateX(-3.5px);
  }
  75% {
    transform: translateX(3.5px);
  }
}

.vinyl-playing-sway {
  animation: vinyl-groove-sway 2.4s ease-in-out infinite;
}

.vinyl-disc-spin {
  animation: spin 3.2s linear infinite;
}
</style>

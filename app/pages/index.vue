<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()

useSeoMeta({
  title: 'Det 7:e Gunget | Blues och rock med glimt i ögat',
  description: 'Fyra rutinerade herrar över 50. Blues, rock, egna låtar och precis lagom mycket oväsen.',
  ogTitle: 'Det 7:e Gunget — Blues & Rock',
  ogDescription: 'Fyra herrar över 50 som fortfarande tycker ett bra riff slår friskvård. Se våra gig och lyssna!',
  ogImage: '/media/brand/Logotyp.webp',
})

// Fetch data from our APIs with graceful fallbacks
interface Gig {
  id: string
  date: number | string
  venue: string
  city: string
  ticketUrl: string | null
  status: 'upcoming' | 'sold_out' | 'free' | 'cancelled' | 'completed' | null
  notesSv: string | null
  notesEn: string | null
}
const { data: gigsData } = await useFetch<{ upcoming: Gig[]; past: Gig[]; all: Gig[] }>('/api/gigs')
const { data: bandMembers } = await useFetch('/api/band')
const { data: galleryItems } = await useFetch('/api/gallery')
const { data: songsData } = await useFetch('/api/songs')

const upcomingGigs = computed(() => gigsData.value?.upcoming || [])
const pastGigs = computed(() => gigsData.value?.past || [])

// Music Filter state
const songFilter = ref<'all' | 'original' | 'cover'>('all')
const filteredSongs = computed(() => {
  const songs = songsData.value || []
  if (songFilter.value === 'original') return songs.filter((s) => s.isOriginal)
  if (songFilter.value === 'cover') return songs.filter((s) => !s.isOriginal)
  return songs
})

// Active playing demo track
const activePlayingSong = ref<string | null>(null)
const togglePlay = (id: string) => {
  if (activePlayingSong.value === id) {
    activePlayingSong.value = null
  } else {
    activePlayingSong.value = id
  }
}

// Fan Central Category filter
const fanFilter = ref<'all' | 'people' | 'appliances'>('all')

// Contact form state
const form = reactive({
  name: '',
  email: '',
  eventType: 'Spelning / Klubb',
  date: '',
  message: '',
  honeypot: '', // bot protection
})
const formSubmitted = ref(false)
const formLoading = ref(false)

const submitBooking = async () => {
  if (form.honeypot) return // bot trap
  formLoading.value = true
  // Simulate submission
  setTimeout(() => {
    formLoading.value = false
    formSubmitted.value = true
  }, 700)
}

// Helper to format date
const formatGigDate = (dateVal: number | string | Date) => {
  const d = new Date(dateVal)
  return {
    day: d.toLocaleDateString('sv-SE', { day: 'numeric' }),
    month: d.toLocaleDateString('sv-SE', { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleDateString('sv-SE', { weekday: 'short' }),
    time: d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
  }
}
</script>

<template>
  <div class="space-y-10 sm:space-y-14">
    <!-- 1. HERO SECTION -->
    <section class="relative isolate overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28 border-b border-primary/10">
      <!-- Background Ambient Glow & Subtle Texture -->
      <div class="absolute inset-0 -z-10 tube-glow pointer-events-none opacity-70" />
      <div class="absolute inset-0 -z-10 bg-[radial-gradient(#c8793f_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      <div class="mx-auto max-w-7xl px-6 lg:px-10 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        <!-- Left: Text & Pitch -->
        <div class="space-y-8 max-w-2xl">
          <h1 class="font-heading text-5xl sm:text-7xl lg:text-8xl leading-[0.95] text-gritty pb-3">
            Det 7:e<br>Gunget
          </h1>

          <p class="text-lg sm:text-xl text-neutral-content/90 leading-relaxed font-normal pt-2">
            {{ t('hero.desc') }}
          </p>

          <!-- Sleek inline band metadata pills (clean Inter / font-mono) -->
          <div class="flex flex-wrap items-center gap-2 sm:gap-3 pt-2 text-xs font-sans">
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral/80 border border-primary/30 text-neutral-content shadow-sm">
              <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span class="text-neutral-content/70 font-medium">{{ t('hero.stats.musicians') }}:</span>
              <span class="font-bold text-primary text-sm">4</span>
            </div>
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral/80 border border-secondary/30 text-neutral-content shadow-sm">
              <span class="w-1.5 h-1.5 rounded-full bg-secondary" />
              <span class="text-neutral-content/70 font-medium">{{ t('hero.stats.avg_age') }}:</span>
              <span class="font-bold text-secondary text-sm">50+</span>
            </div>
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral/80 border border-accent/30 text-neutral-content shadow-sm">
              <span class="w-1.5 h-1.5 rounded-full bg-accent" />
              <span class="text-neutral-content/70 font-medium">{{ t('hero.stats.groove') }}:</span>
              <span class="font-bold text-accent text-sm">100%</span>
            </div>
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral/80 border border-primary/30 text-neutral-content shadow-sm">
              <span class="w-1.5 h-1.5 rounded-full bg-primary" />
              <span class="text-neutral-content/70 font-medium">{{ t('hero.stats.volume') }}:</span>
              <span class="font-bold text-primary text-sm">11</span>
            </div>
          </div>

          <!-- CTAs navigating to dedicated pages -->
          <div class="flex flex-wrap gap-4 pt-4">
            <NuxtLink :to="localePath('/gigs')" class="btn btn-primary rounded-full px-8 text-sm font-bold shadow-lg shadow-primary/25 hover:scale-105 transition-transform">
              {{ t('hero.cta_gigs') }} →
            </NuxtLink>
            <NuxtLink :to="localePath('/music')" class="btn btn-outline btn-secondary rounded-full px-8 text-sm font-bold hover:scale-105 transition-transform">
              {{ t('hero.cta_music') }}
            </NuxtLink>
          </div>
        </div>

        <!-- Right: Vintage Badge Logo Showcase -->
        <div class="flex justify-center items-center relative">
          <div class="absolute -inset-4 rounded-full bg-gradient-to-tr from-secondary/20 to-primary/20 blur-2xl opacity-60" />
          <div class="relative group">
            <NuxtImg
              src="/media/brand/Logotyp.webp"
              alt="Det 7:e Gunget emblem logotyp"
              class="w-[320px] sm:w-[420px] lg:w-[460px] object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-102 group-hover:rotate-1"
              priority
            />
            <div class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-neutral/90 border border-primary/40 px-4 py-1.5 rounded-full text-xs font-mono text-primary shadow-lg tracking-wider whitespace-nowrap">
              {{ t('hero.badge_tag') }}
            </div>
          </div>
        </div>
      </div>
    </section>


    <!-- 2. GIG / SPELNINGAR SPOTLIGHT -->
    <section id="gigs" class="mx-auto max-w-7xl px-6 lg:px-10 scroll-mt-24">
      <div class="flex flex-col md:flex-row md:items-end justify-between mb-14 pb-4 border-b border-primary/20 gap-4">
        <div>
          <span class="text-xs font-bold uppercase tracking-[0.25em] text-secondary">{{ t('gigs.section_tag') }}</span>
          <h2 class="text-3xl sm:text-5xl font-heading text-primary mt-1 text-gritty pb-2">
            {{ t('gigs.subtitle') }}
          </h2>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <p class="text-sm text-base-content/70 max-w-md">
            {{ t('gigs.desc') }}
          </p>
          <NuxtLink :to="localePath('/gigs')" class="btn btn-outline btn-primary btn-sm rounded-full font-bold flex-shrink-0">
            {{ t('gigs.all_gigs') }} →
          </NuxtLink>
        </div>
      </div>

      <!-- Gig Poster Cards Grid -->
      <div v-if="upcomingGigs.length > 0" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="(gig, index) in upcomingGigs"
          :key="gig.id"
          class="stage-card p-6 rounded-2xl relative flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 group"
          :class="index === 0 ? 'ring-2 ring-primary/40' : ''"
        >
          <!-- Gaffer tape badge on the corner -->
          <div class="absolute -top-3 -right-2 bg-secondary/80 text-neutral font-mono font-black text-[10px] uppercase px-3 py-1 rounded shadow transform rotate-3">
            {{ gig.status === 'free' ? 'Fri Entré' : gig.status === 'sold_out' ? 'Utsålt' : 'Kommande' }}
          </div>

          <div>
            <!-- Date Banner -->
            <div class="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
              <div class="bg-primary text-neutral text-center px-3.5 py-2 rounded-xl font-heading font-black shadow leading-none flex flex-col items-center justify-center">
                <span class="text-2xl leading-none">{{ formatGigDate(gig.date).day }}</span>
                <span class="text-[10px] tracking-wider">{{ formatGigDate(gig.date).month }}</span>
              </div>
              <div>
                <span class="text-xs font-bold uppercase text-secondary block">
                  {{ formatGigDate(gig.date).weekday }} • Kl {{ formatGigDate(gig.date).time }}
                </span>
                <h3 class="text-xl font-heading text-primary font-bold leading-tight group-hover:text-secondary transition-colors">
                  {{ gig.venue }}
                </h3>
                <span class="text-sm font-medium text-neutral-content/80">{{ gig.city }}</span>
              </div>
            </div>

            <!-- Notes -->
            <p class="text-sm text-neutral-content/75 italic leading-relaxed mb-6">
              "{{ gig.notesSv || gig.notesEn }}"
            </p>
          </div>

          <!-- Actions -->
          <div class="pt-4 border-t border-white/5 flex items-center justify-between">
            <a
              v-if="gig.ticketUrl && gig.ticketUrl !== '#'"
              :href="gig.ticketUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-primary btn-sm rounded-full font-bold px-5"
            >
              Köp biljett →
            </a>
            <span v-else-if="gig.status === 'free'" class="text-xs font-bold text-accent">
              Ingen förbokning krävs
            </span>
            <span v-else class="text-xs font-medium text-neutral-content/50">
              Biljetter i dörren
            </span>

            <a href="#contact" class="text-xs font-bold text-secondary hover:text-primary transition-colors underline decoration-secondary/30">
              Frågor om giget?
            </a>
          </div>
        </div>
      </div>

      <div v-else class="stage-card p-12 rounded-2xl text-center max-w-xl mx-auto space-y-4">
        <span class="text-4xl">🎸</span>
        <h3 class="text-xl font-heading text-primary">Nya datum är på gång!</h3>
        <p class="text-sm text-neutral-content/70">
          {{ t('gigs.no_upcoming') }}
        </p>
      </div>

      <!-- Past Shows Archive Teaser -->
      <div v-if="pastGigs.length > 0" class="mt-8 p-5 bg-base-200/50 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <span class="text-2xl">📜</span>
          <div>
            <span class="font-bold text-sm text-neutral-content block">Arkiv över svettiga gig</span>
            <span class="text-xs text-neutral-content/60">Senast spelade vi på {{ pastGigs[0]?.venue }} i {{ pastGigs[0]?.city }}.</span>
          </div>
        </div>
        <a href="#contact" class="btn btn-outline btn-sm btn-secondary rounded-full">
          Boka oss till ditt event →
        </a>
      </div>
    </section>


    <!-- 2.5 OFFICIELL BAND-MERCH SHOWCASE -->
    <MerchSection />


    <!-- 3. JUKEBOX & MUSIK SEKTION -->
    <section id="music" class="mx-auto max-w-7xl px-6 lg:px-10 scroll-mt-24">
      <div class="flex flex-col md:flex-row md:items-end justify-between mb-14 pb-4 border-b border-primary/20 gap-4">
        <div>
          <span class="text-xs font-bold uppercase tracking-[0.25em] text-secondary">{{ t('music.section_tag') }}</span>
          <h2 class="text-3xl sm:text-5xl font-heading text-primary mt-1 text-gritty pb-2">
            {{ t('music.title') }}
          </h2>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <!-- Filter tabs -->
          <div class="flex items-center gap-2 bg-base-200 p-1 rounded-full border border-primary/20 text-xs font-bold">
            <button
              type="button"
              class="px-4 py-1.5 rounded-full transition-colors"
              :class="songFilter === 'all' ? 'bg-primary text-primary-content font-bold' : 'text-base-content/70 hover:text-primary'"
              @click="songFilter = 'all'"
            >
              {{ t('music.all') }}
            </button>
            <button
              type="button"
              class="px-4 py-1.5 rounded-full transition-colors"
              :class="songFilter === 'original' ? 'bg-primary text-primary-content font-bold' : 'text-base-content/70 hover:text-primary'"
              @click="songFilter = 'original'"
            >
              {{ t('music.original') }}
            </button>
            <button
              type="button"
              class="px-4 py-1.5 rounded-full transition-colors"
              :class="songFilter === 'cover' ? 'bg-primary text-primary-content font-bold' : 'text-base-content/70 hover:text-primary'"
              @click="songFilter = 'cover'"
            >
              {{ t('music.cover') }}
            </button>
          </div>

          <NuxtLink :to="localePath('/music')" class="btn btn-outline btn-primary btn-sm rounded-full font-bold flex-shrink-0">
            {{ t('music.all_music') }} →
          </NuxtLink>
        </div>
      </div>

      <!-- Jukebox Player Track Grid -->
      <div class="grid md:grid-cols-2 gap-6">
        <div
          v-for="song in filteredSongs"
          :key="song.id"
          class="stage-card p-6 rounded-2xl flex flex-col justify-between border transition-all duration-300 hover:border-primary/50"
          :class="activePlayingSong === song.id ? 'border-primary shadow-lg shadow-primary/10 bg-base-200/90' : 'border-primary/20'"
        >
          <div class="flex items-start justify-between gap-4 mb-4">
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="w-12 h-12 rounded-full bg-primary text-neutral flex items-center justify-center font-bold text-lg shadow hover:scale-105 active:scale-95 transition-transform"
                :title="activePlayingSong === song.id ? 'Pausa' : 'Spela'"
                @click="togglePlay(song.id)"
              >
                {{ activePlayingSong === song.id ? '⏸' : '▶' }}
              </button>
              <div>
                <h3 class="font-heading text-lg text-primary font-bold">{{ song.title }}</h3>
                <span class="text-xs text-neutral-content/60 font-medium">
                  {{ song.isOriginal ? 'Det 7:e Gunget (Egen låt)' : `Original av ${song.originalArtist}` }}
                </span>
              </div>
            </div>

            <!-- Type badge -->
            <span
              class="badge badge-sm font-bold text-[10px] uppercase"
              :class="song.isOriginal ? 'badge-primary text-neutral' : 'badge-secondary text-neutral'"
            >
              {{ song.isOriginal ? 'Original' : 'Cover' }}
            </span>
          </div>

          <!-- Interactive Cassette / Player visual feedback -->
          <div v-if="activePlayingSong === song.id" class="my-3 p-3 bg-neutral rounded-xl border border-primary/30 flex items-center justify-between text-xs font-mono text-primary animate-pulse">
            <span>📼 SPELAR: {{ song.title }}</span>
            <span class="text-accent font-bold">128 BPM • SVÄNG PÅGÅR</span>
          </div>

          <!-- External Links to Spotify / Bandcamp / YouTube -->
          <div class="pt-4 border-t border-white/5 flex items-center justify-between text-xs">
            <span class="text-neutral-content/50 uppercase font-mono text-[10px]">
              Källa: {{ song.embedProvider }}
            </span>
            <a
              :href="song.embedUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="font-bold text-secondary hover:text-primary flex items-center gap-1 transition-colors"
            >
              <span>Öppna i {{ song.embedProvider }}</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>


    <!-- 4. BANDET (JANIS, BOSSE, MARCUS, JONAS) -->
    <section id="band" class="mx-auto max-w-7xl px-6 lg:px-10 scroll-mt-24">
      <div class="flex flex-col md:flex-row md:items-end justify-between mb-14 pb-4 border-b border-primary/20 gap-4">
        <div>
          <span class="text-xs font-bold uppercase tracking-[0.25em] text-secondary">{{ t('band.section_tag') }}</span>
          <h2 class="text-3xl sm:text-5xl font-heading text-primary mt-1 text-gritty pb-2">
            {{ t('band.title') }}
          </h2>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <p class="text-sm text-base-content/70 max-w-md">
            {{ t('band.desc') }}
          </p>
          <NuxtLink :to="localePath('/about')" class="btn btn-outline btn-primary btn-sm rounded-full font-bold flex-shrink-0">
            {{ t('band.all_band') }} →
          </NuxtLink>
        </div>
      </div>

      <!-- Band Member Cards with Tactile Framing & Gear Stats -->
      <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="member in bandMembers"
          :key="member.id"
          class="flex flex-col justify-between rounded-2xl bg-base-200/80 p-5 border border-primary/20 shadow-xl transition-all duration-300 hover:border-primary/60 hover:-translate-y-1.5"
        >
          <div>
            <!-- Photo in custom frame (polaroid style) -->
            <div class="frame-polaroid mb-6 overflow-hidden rounded">
              <NuxtImg
                :src="member.photoUrl || '/media/brand/Logotyp_mini.webp'"
                :alt="member.name"
                class="w-full aspect-[4/5] object-cover rounded filter contrast-105"
                loading="lazy"
              />
              <div class="text-center font-heading text-xs font-bold tracking-wider text-neutral mt-2">
                {{ member.name }} • {{ member.role }}
              </div>
            </div>

            <!-- Member Info & Bio -->
            <h3 class="font-heading text-2xl text-primary font-bold">{{ member.name }}</h3>
            <span class="text-xs font-bold uppercase tracking-wider text-secondary block mb-3">
              {{ member.role }}
            </span>
            <p class="text-xs text-base-content/80 leading-relaxed mb-6">
              {{ locale === 'en' && member.bioEn ? member.bioEn : member.bioSv }}
            </p>
          </div>

          <!-- Quirky Gear & Band Stats -->
          <div class="space-y-2 pt-4 border-t border-base-content/10 text-[11px]">
            <div v-if="member.gearSv" class="flex flex-col">
              <span class="font-bold text-secondary">🎸 {{ locale === 'en' ? 'Gear:' : 'Vapen:' }}</span>
              <span class="text-base-content/70">{{ locale === 'en' && member.gearEn ? member.gearEn : member.gearSv }}</span>
            </div>
            <div v-if="member.favoriteChord" class="flex flex-col">
              <span class="font-bold text-secondary">🎵 {{ locale === 'en' ? 'Favorite chord:' : 'Favoritackord:' }}</span>
              <span class="text-base-content/70">{{ member.favoriteChord }}</span>
            </div>
            <div v-if="member.weaknessSv" class="flex flex-col">
              <span class="font-bold text-secondary">⚠️ {{ locale === 'en' ? 'Weakness:' : 'Svaghet:' }}</span>
              <span class="text-base-content/70">{{ member.weaknessSv }}</span>
            </div>
            <div v-if="member.coffeeConsumption" class="flex flex-col">
              <span class="font-bold text-secondary">☕ {{ locale === 'en' ? 'Coffee consumption:' : 'Kaffestats:' }}</span>
              <span class="text-base-content/70">{{ member.coffeeConsumption }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>


    <!-- 5. FAN CENTRAL (THE LITERAL FAN JOKE) -->
    <section id="fancentral" class="mx-auto max-w-7xl px-6 lg:px-10 scroll-mt-24">
      <div class="bg-base-200/90 rounded-3xl p-8 sm:p-12 border border-secondary/30 relative overflow-hidden shadow-2xl">
        <div class="flex flex-col md:flex-row md:items-end justify-between mb-14 pb-4 border-b border-primary/20 gap-4">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-bold uppercase tracking-widest mb-2">
              <span>💨</span> {{ t('fan_central.section_tag') }}
            </div>
            <h2 class="text-3xl sm:text-5xl font-heading text-primary text-gritty">
              {{ t('fan_central.title') }}
            </h2>
          </div>
          <div class="flex flex-col sm:flex-row sm:items-center gap-4">
            <p class="text-sm text-base-content/80 max-w-md">
              {{ t('fan_central.desc') }}
            </p>
            <NuxtLink :to="localePath('/fancentral')" class="btn btn-secondary btn-sm rounded-full font-bold flex-shrink-0">
              {{ t('fan_central.open_fan_central') }} →
            </NuxtLink>
          </div>
        </div>

        <!-- Fan Categories Tabs -->
        <div class="flex flex-wrap gap-2 mb-8 text-xs font-bold">
          <button
            type="button"
            class="px-4 py-2 rounded-full transition-all"
            :class="fanFilter === 'all' ? 'bg-secondary text-secondary-content font-black shadow' : 'bg-base-300 text-base-content/70 hover:text-primary'"
            @click="fanFilter = 'all'"
          >
            Alla Fans (Båda sorterna)
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-full transition-all"
            :class="fanFilter === 'people' ? 'bg-secondary text-secondary-content font-black shadow' : 'bg-base-300 text-base-content/70 hover:text-primary'"
            @click="fanFilter = 'people'"
          >
            👥 Mänskliga Fans
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-full transition-all"
            :class="fanFilter === 'appliances' ? 'bg-secondary text-secondary-content font-black shadow' : 'bg-base-300 text-base-content/70 hover:text-primary'"
            @click="fanFilter = 'appliances'"
          >
            🌀 Bords- & Takfläktar
          </button>
        </div>

        <!-- Fan Cards Side by Side -->
        <div class="grid sm:grid-cols-2 gap-8">
          <!-- Real Fan -->
          <div
            v-if="fanFilter === 'all' || fanFilter === 'people'"
            class="bg-base-100 p-6 rounded-2xl border border-primary/20 flex flex-col justify-between"
          >
            <div>
              <div class="frame-polaroid mb-4">
                <NuxtImg
                  src="/media/fan-central/5B0EBD96-EAC2-4554-B7AF-433307968BD0.webp"
                  alt="Troget fan i publiken"
                  class="w-full aspect-[4/3] object-cover rounded"
                  loading="lazy"
                />
                <div class="text-center font-heading text-xs font-bold text-neutral mt-2">
                  Publikfavorit #1
                </div>
              </div>
              <h3 class="font-heading text-xl text-primary font-bold">Det Mänskliga Fanet</h3>
              <p class="text-xs text-base-content/75 mt-2 leading-relaxed">
                Står alltid längst fram, kan varenda textrad utantill och applåderar även när munspelssolot spårar ur.
              </p>
            </div>
            <div class="mt-4 pt-3 border-t border-base-content/10 text-[11px] font-mono text-accent">
              Status: 100% Gung-ackrediterad
            </div>
          </div>

          <!-- Electric Fan -->
          <div
            v-if="fanFilter === 'all' || fanFilter === 'appliances'"
            class="bg-base-100 p-6 rounded-2xl border border-secondary/30 flex flex-col justify-between"
          >
            <div>
              <div class="frame-taped mb-4">
                <NuxtImg
                  src="/media/fan-central/fanpic.png"
                  alt="Elektrisk bordsfläkt på scen"
                  class="w-full aspect-[4/3] object-cover rounded"
                  loading="lazy"
                />
                <div class="text-center font-mono text-xs font-bold text-secondary mt-2">
                  Modell: Andersson 45W
                </div>
              </div>
              <h3 class="font-heading text-xl text-secondary font-bold">Det Elektriska Fanet</h3>
              <p class="text-xs text-base-content/75 mt-2 leading-relaxed">
                3 hastigheter, oscillerande svängrörelse. Räddar Jonas bakom trummorna från spontan förbränning under 12-takters solon.
              </p>
            </div>
            <div class="mt-4 pt-3 border-t border-base-content/10 text-[11px] font-mono text-secondary">
              Effekt: 45 Watt ren svalka
            </div>
          </div>
        </div>
      </div>
    </section>


    <!-- 6. GALLERI & SCENLIV -->
    <section id="gallery" class="mx-auto max-w-7xl px-6 lg:px-10 scroll-mt-24">
      <div class="flex flex-col md:flex-row md:items-end justify-between mb-14 pb-4 border-b border-primary/20 gap-4">
        <div>
          <span class="text-xs font-bold uppercase tracking-[0.25em] text-secondary">Scen, Svett & Rep</span>
          <h2 class="text-3xl sm:text-5xl font-heading text-primary mt-1 text-gritty pb-2">
            Galleri
          </h2>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <p class="text-sm text-base-content/70 max-w-md">
            Ögonblick från studion, replokalen och livescener runt om i landet.
          </p>
          <NuxtLink :to="localePath('/gallery')" class="btn btn-outline btn-primary btn-sm rounded-full font-bold flex-shrink-0">
            {{ t('gallery.all_gallery') }} →
          </NuxtLink>
        </div>
      </div>

      <!-- Tactile Gallery Grid -->
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <div
          v-for="item in galleryItems"
          :key="item.id"
          class="flex flex-col justify-between"
        >
          <div
            :class="[
              item.frameStyle === 'polaroid' ? 'frame-polaroid' :
              item.frameStyle === 'taped' ? 'frame-taped' :
              item.frameStyle === 'grunge' ? 'frame-grunge' : 'frame-wood'
            ]"
            :style="{ transform: `rotate(${item.rotation || 0}deg)` }"
          >
            <NuxtImg
              :src="item.mediaUrl"
              :alt="locale === 'en' && item.altTextEn ? item.altTextEn : item.altTextSv"
              class="w-full aspect-[4/3] object-cover rounded shadow"
              loading="lazy"
            />
            <p class="text-xs text-center font-medium mt-3 italic text-neutral-content/90">
              {{ locale === 'en' && item.captionEn ? item.captionEn : item.captionSv }}
            </p>
          </div>
        </div>
      </div>
    </section>


    <!-- 7. BOKA BANDET / KONTAKTFORMULÄR -->
    <section id="contact" class="mx-auto max-w-7xl px-6 lg:px-10 scroll-mt-24">
      <div class="stage-card rounded-3xl p-8 sm:p-14 border border-primary/30 grid lg:grid-cols-2 gap-12 items-center">
        <!-- Left: Pitch & Details -->
        <div class="space-y-6">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
            <span>✉️</span> {{ t('contact.section_tag') }}
          </div>

          <h2 class="text-3xl sm:text-5xl font-heading text-primary text-gritty">
            {{ t('contact.title') }}
          </h2>

          <p class="text-base text-neutral-content/80 leading-relaxed">
            {{ t('contact.desc') }}
          </p>

          <div class="space-y-3 text-sm font-medium pt-2">
            <div class="flex items-center gap-3">
              <span class="text-primary font-bold">📍 {{ locale === 'en' ? 'Based in:' : 'Utgår från:' }}</span>
              <span>{{ locale === 'en' ? 'Ängelholm & all of Skåne' : 'Ängelholm & Skåne med omnejd' }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-primary font-bold">🎸 {{ locale === 'en' ? 'Repertoire:' : 'Repertoar:' }}</span>
              <span>{{ locale === 'en' ? 'Classic Chicago blues, swamp-rock & originals' : 'Klassisk chicagoblues, swamp-rock & egna alster' }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-primary font-bold">⚡ {{ locale === 'en' ? 'Equipment:' : 'Utrustning:' }}</span>
              <span>{{ locale === 'en' ? 'Full backline & PA can be provided' : 'Full backline & PA kan medtagas vid behov' }}</span>
            </div>
          </div>
        </div>

        <!-- Right: Contact Form -->
        <div class="bg-neutral/90 p-6 sm:p-8 rounded-2xl border border-primary/20 shadow-xl">
          <form v-if="!formSubmitted" class="space-y-4" @submit.prevent="submitBooking">
            <!-- Honeypot (bot trap) -->
            <input v-model="form.honeypot" type="text" class="hidden" tabindex="-1" autocomplete="off" />

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">{{ t('contact.name_label') }}</label>
              <input
                v-model="form.name"
                type="text"
                required
                :placeholder="t('contact.name_placeholder')"
                class="input input-bordered w-full bg-base-200 focus:border-primary text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">{{ t('contact.email_label') }}</label>
              <input
                v-model="form.email"
                type="email"
                required
                placeholder="namn@exempel.se"
                class="input input-bordered w-full bg-base-200 focus:border-primary text-sm"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">{{ t('contact.event_type_label') }}</label>
                <select v-model="form.eventType" class="select select-bordered w-full bg-base-200 focus:border-primary text-sm">
                  <option>{{ t('contact.event_club') }}</option>
                  <option>{{ t('contact.event_festival') }}</option>
                  <option>{{ t('contact.event_private') }}</option>
                  <option>{{ t('contact.event_corporate') }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">{{ t('contact.date_label') }}</label>
                <input
                  v-model="form.date"
                  type="date"
                  class="input input-bordered w-full bg-base-200 focus:border-primary text-sm"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">{{ t('contact.message_label') }}</label>
              <textarea
                v-model="form.message"
                required
                rows="4"
                :placeholder="t('contact.message_placeholder')"
                class="textarea textarea-bordered w-full bg-base-200 focus:border-primary text-sm"
              />
            </div>

            <button
              type="submit"
              class="btn btn-primary w-full font-bold shadow-lg shadow-primary/20 text-base"
              :disabled="formLoading"
            >
              {{ formLoading ? '...' : t('contact.send_button') }}
            </button>
          </form>

          <div v-else class="text-center py-10 space-y-4">
            <span class="text-5xl">🎸</span>
            <h3 class="text-2xl font-heading text-primary font-bold">{{ t('contact.success_msg') }}</h3>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
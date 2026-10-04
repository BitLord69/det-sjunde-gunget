<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()

useSeoMeta({
  title: () => `${t('seo.gigs_title')}`,
  description: () => t('seo.gigs_desc'),
  ogTitle: () => `${t('seo.gigs_og_title')}`,
  ogDescription: () => t('seo.gigs_og_desc'),
  ogImage: '/media/og/og-share.jpg',
})

interface Gig {
  id: string
  date: number | string
  venue: string
  city: string
  ticketUrl: string | null
  status: 'upcoming' | 'sold_out' | 'free' | 'cancelled' | 'completed' | null
  notesSv: string | null
  notesEn: string | null
  setlist: string | null
}

const { data: gigsData } = await useFetch<{ upcoming: Gig[]; past: Gig[]; all: Gig[] }>('/api/gigs')

const currentTab = ref<'upcoming' | 'past'>('upcoming')

const upcomingGigs = computed(() => gigsData.value?.upcoming || [])
const pastGigs = computed(() => gigsData.value?.past || [])

// Schema.org MusicEvents for Google Search Rich Results
const eventsStructuredData = computed(() => {
  return upcomingGigs.value.map(gig => ({
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: `Det 7:e Gunget live på ${gig.venue}`,
    startDate: new Date(gig.date).toISOString().split('T')[0],
    eventStatus: gig.status === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: gig.venue,
      address: {
        '@type': 'PostalAddress',
        addressLocality: gig.city,
        addressCountry: 'SE',
      },
    },
    performer: {
      '@type': 'MusicGroup',
      name: 'Det 7:e Gunget',
      url: 'https://det7egunget.se',
    },
    offers: gig.ticketUrl ? {
      '@type': 'Offer',
      url: gig.ticketUrl,
      availability: gig.status === 'sold_out' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    } : {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'SEK',
      availability: 'https://schema.org/InStock',
    },
  }))
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(eventsStructuredData.value)),
    },
  ],
})

const expandedSetlists = ref<Set<string>>(new Set())

const toggleGigSetlist = (gigId: string) => {
  if (expandedSetlists.value.has(gigId)) {
    expandedSetlists.value.delete(gigId)
  } else {
    expandedSetlists.value.add(gigId)
  }
}

export interface SetlistTrackItem {
  id?: string
  title?: string
  artist?: string
  isOriginal?: boolean | null
  setName?: string
  duration?: number
}

const parseGigSetlist = (setlistRaw: unknown): SetlistTrackItem[] => {
  if (!setlistRaw) return []
  if (Array.isArray(setlistRaw)) return setlistRaw as SetlistTrackItem[]
  if (typeof setlistRaw === 'string') {
    try {
      const parsed = JSON.parse(setlistRaw)
      return Array.isArray(parsed) ? (parsed as SetlistTrackItem[]) : []
    } catch {
      return []
    }
  }
  return []
}

const groupGigSetlist = (setlistRaw: unknown): Record<string, SetlistTrackItem[]> => {
  const tracks = parseGigSetlist(setlistRaw)
  if (!tracks.length) return {}
  const groups: Record<string, SetlistTrackItem[]> = {}
  for (const track of tracks) {
    const setName = track.setName || 'Set 1'
    if (!groups[setName]) {
      groups[setName] = []
    }
    groups[setName].push(track)
  }
  return groups
}

const formatGigDate = (dateVal: number | string | Date) => {
  const loc = locale.value === 'en' ? 'en-US' : 'sv-SE'
  const d = new Date(dateVal)
  return {
    day: d.toLocaleDateString(loc, { day: 'numeric' }),
    month: d.toLocaleDateString(loc, { month: 'short' }).toUpperCase(),
    year: d.getFullYear(),
    weekday: d.toLocaleDateString(loc, { weekday: 'long' }),
    time: d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }),
    full: d.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
  }
}
</script>

<template>
  <div class="relative min-h-screen pb-24 overflow-hidden">
    <!-- Atmospheric Ticket Booth Background -->
    <div class="absolute inset-0 -z-10 pointer-events-none">
      <NuxtImg
        src="/media/brand/ticket_booth_bg.webp"
        alt="Vintage ticket booth"
        class="w-full h-full object-cover opacity-15 filter blur-sm scale-105"
        priority
      />
      <div class="absolute inset-0 bg-gradient-to-b from-base-100 via-base-100/90 to-base-100" />
      <div class="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 rounded-full blur-[140px]" />
      <div class="absolute top-40 right-1/4 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px]" />
    </div>

    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6 sm:space-y-8">

      <!-- GIGS PAGE HEADER -->
      <PageHeader :title="t('gigs.page_title')" :description="t('gigs.desc')" />

      <!-- TICKET BOOTH WINDOW / COUNTER -->
      <div class="max-w-5xl mx-auto">
        <!-- Booth Window Frame -->
        <div class="rounded-[32px] sm:rounded-[48px] bg-gradient-to-b from-base-200/90 via-base-100 to-base-200 dark:from-[#2a1d15] dark:via-[#1a120c] dark:to-[#0d0907] border-4 border-primary/40 px-4 sm:px-8 pb-4 sm:pb-8 pt-5 sm:pt-6 shadow-2xl dark:shadow-[0_0_60px_rgba(200,121,63,0.2)] relative">
          <!-- Outer glow -->
          <div class="absolute -inset-1 rounded-[34px] sm:rounded-[50px] bg-gradient-to-r from-secondary/20 via-primary/30 to-secondary/20 blur-sm pointer-events-none -z-10" />

          <!-- Glass Window Header with "TICKETS" sign -->
          <div class="flex flex-col items-center justify-center mb-6 relative">
            <!-- "OPEN" neon badge (above) - perfectly centered vertically between top frame and Biljettluckan -->
            <div class="inline-flex items-center gap-2.5 px-5 py-1.5 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 text-sm sm:text-base font-mono font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.25)]">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
              <span>{{ t('gigs.open') }}</span>
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
            </div>

            <!-- Biljettluckan sign with symmetric spacing from ÖPPEN -->
            <div class="mt-5 sm:mt-6 inline-flex items-center gap-3 px-8 py-2.5 rounded-full bg-gradient-to-r from-base-300 via-base-200 to-base-300 dark:from-[#1a1310] dark:via-[#3a2618] dark:to-[#1a1310] border-2 border-primary/60 shadow-lg">
              <span class="text-primary text-sm">🎫</span>
              <span class="font-heading text-xl sm:text-2xl text-primary dark:text-secondary uppercase tracking-[0.25em] font-black">
                {{ t('gigs.ticket_booth') }}
              </span>
              <span class="text-primary text-sm">🎫</span>
            </div>
          </div>

          <!-- Tab Switcher (Upcoming / Past) -->
          <div class="flex items-center justify-center gap-3 mb-8">
            <button
              type="button"
              class="px-6 py-2.5 rounded-full font-bold text-sm transition-all border-2 cursor-pointer"
              :class="
                currentTab === 'upcoming'
                  ? 'bg-primary text-neutral border-primary shadow-lg shadow-primary/30 font-black'
                  : 'bg-base-200/90 text-base-content border-primary/30 hover:border-primary hover:bg-base-300'
              "
              @click="currentTab = 'upcoming'"
            >
              🎤 {{ t('gigs.upcoming_tab') }} ({{ upcomingGigs.length }})
            </button>
            <button
              type="button"
              class="px-6 py-2.5 rounded-full font-bold text-sm transition-all border-2 cursor-pointer"
              :class="
                currentTab === 'past'
                  ? 'bg-primary text-neutral border-primary shadow-lg shadow-primary/30 font-black'
                  : 'bg-base-200/90 text-base-content border-primary/30 hover:border-primary hover:bg-base-300'
              "
              @click="currentTab = 'past'"
            >
              📜 {{ t('gigs.past_tab') }} ({{ pastGigs.length }})
            </button>
          </div>

          <!-- ======================= -->
          <!-- UPCOMING GIGS AS TICKET STUBS -->
          <!-- ======================= -->
          <div v-if="currentTab === 'upcoming'" class="space-y-6">
            <div v-if="upcomingGigs.length > 0" class="space-y-6">
              <GigTicketStub
                v-for="(gig, idx) in upcomingGigs"
                :key="gig.id"
                :gig="gig"
                :index="idx"
              />
            </div>

            <!-- No Upcoming Gigs -->
            <div v-else class="text-center py-16 space-y-4">
              <span class="text-5xl">🎸</span>
              <h2 class="text-xl font-heading text-primary">{{ t('gigs.no_confirmed') }}</h2>
              <p class="text-sm text-base-content/70 max-w-md mx-auto">
                {{ t('gigs.no_upcoming') }}
              </p>
            </div>
          </div>

          <!-- ======================= -->
          <!-- PAST GIGS ARCHIVE -->
          <!-- ======================= -->
          <div v-else class="space-y-4">
            <div v-if="pastGigs.length > 0" class="space-y-3">
              <div
                v-for="gig in pastGigs"
                :key="gig.id"
                class="rounded-xl border border-base-content/10 bg-base-200/50 hover:bg-base-200/80 transition-colors p-4 space-y-3"
              >
                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <!-- Faded date stub -->
                  <div class="bg-base-300 text-base-content/70 text-center px-4 py-2 rounded-lg font-mono text-xs font-bold min-w-[90px] border border-base-content/10">
                    <div class="text-lg font-heading font-black">{{ formatGigDate(gig.date).day }}</div>
                    <div class="text-[10px] tracking-wider">{{ formatGigDate(gig.date).month }} {{ formatGigDate(gig.date).year }}</div>
                  </div>

                  <div class="flex-grow">
                    <h3 class="font-heading text-lg text-primary font-bold">{{ gig.venue }}</h3>
                    <span class="text-xs text-base-content/60">{{ gig.city }}</span>
                  </div>

                  <div class="text-xs text-base-content/60 italic sm:text-right max-w-xs">
                    "{{ locale === 'en' && gig.notesEn ? gig.notesEn : gig.notesSv }}"
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      v-if="parseGigSetlist(gig.setlist).length > 0"
                      type="button"
                      class="btn btn-xs btn-outline btn-secondary rounded-full font-bold"
                      @click="toggleGigSetlist(gig.id)"
                    >
                      🎵 {{ expandedSetlists.has(gig.id) ? t('gigs.hide_setlist') : t('gigs.show_setlist', { count: parseGigSetlist(gig.setlist).length }) }}
                    </button>

                    <!-- "Played" stamp -->
                    <div class="font-mono font-black text-[10px] uppercase text-base-content/40 border-2 border-base-content/20 px-3 py-1 rounded-full transform -rotate-6">
                      ✓ {{ t('gigs.played') }}
                    </div>
                  </div>
                </div>

                <!-- Expandable Past Gig Setlist -->
                <div
                  v-if="expandedSetlists.has(gig.id) && parseGigSetlist(gig.setlist).length > 0"
                  class="p-4 rounded-xl bg-base-300/60 border border-primary/20 space-y-3 select-text"
                >
                  <div class="text-xs font-mono font-bold text-secondary uppercase flex items-center justify-between">
                    <span>📋 {{ t('gigs.played_setlist', { venue: gig.venue }) }}</span>
                    <span>{{ t('gigs.total_songs', { count: parseGigSetlist(gig.setlist).length }) }}</span>
                  </div>

                  <div class="space-y-3">
                    <div
                      v-for="(setTracks, sName) in groupGigSetlist(gig.setlist)"
                      :key="sName"
                      class="space-y-1.5"
                    >
                      <div class="text-[11px] font-mono font-bold text-primary border-b border-primary/15 pb-0.5">
                        ▶ {{ sName }} {{ t('gigs.songs_count', { count: setTracks.length }) }}
                      </div>
                      <div class="grid sm:grid-cols-2 gap-2 text-xs font-mono">
                        <div
                          v-for="(track, tIdx) in setTracks"
                          :key="tIdx"
                          class="flex items-center justify-between p-1.5 rounded bg-base-100/70"
                        >
                          <span class="truncate">{{ tIdx + 1 }}. {{ track.title }}</span>
                          <NuxtLink
                            v-if="track.isOriginal"
                            :to="localePath('/lyrics')"
                            class="badge badge-xs badge-primary font-bold"
                          >
                            Text
                          </NuxtLink>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="p-8 text-center text-sm text-base-content/60">
              {{ t('gigs.no_past') }}
            </div>
          </div>
        </div>
      </div>

      <!-- BOOKING CTA STRIP -->
      <div class="max-w-5xl mx-auto stage-card p-8 sm:p-12 rounded-3xl border border-secondary/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div class="space-y-2">
          <h2 class="font-heading text-2xl sm:text-3xl text-primary font-bold">
            {{ t('contact.title') }}
          </h2>
          <p class="text-sm text-base-content/75 max-w-xl">
            {{ t('contact.desc') }}
          </p>
        </div>
        <NuxtLink :to="localePath('/contact')" class="btn btn-primary rounded-full px-8 font-bold shadow-lg shadow-primary/20 flex-shrink-0">
          {{ t('contact.send_button') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

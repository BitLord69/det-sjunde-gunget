<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()

useSeoMeta({
  title: 'Kommande gig & spelningar | Det 7:e Gunget',
  description: 'Se var Det 7:e Gunget spelar härnäst. Datum, spelplatser, biljetter och arkiv.',
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

const expandedSetlists = ref<Set<string>>(new Set())

const toggleGigSetlist = (gigId: string) => {
  if (expandedSetlists.value.has(gigId)) {
    expandedSetlists.value.delete(gigId)
  } else {
    expandedSetlists.value.add(gigId)
  }
}

const parseGigSetlist = (setlistRaw: any) => {
  if (!setlistRaw) return []
  if (Array.isArray(setlistRaw)) return setlistRaw
  try {
    const parsed = JSON.parse(setlistRaw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const groupGigSetlist = (setlistRaw: any) => {
  const tracks = parseGigSetlist(setlistRaw)
  if (!tracks.length) return {}
  const groups: Record<string, any[]> = {}
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

const { getGoogleCalendarUrl, downloadIcsFile } = useCalendarExport()

const exportGigSetlistAsTxt = (gig: Gig) => {
  if (import.meta.server) return

  const dateStr = new Date(gig.date).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  let output = '============================================================\r\n'
  output += `DET 7:E GUNGET — SETLISTA @ ${gig.venue.toUpperCase()} (${gig.city.toUpperCase()})\r\n`
  output += `Speldatum: ${dateStr}\r\n`
  output += 'Webb: https://www.det7egunget.se\r\n'
  output += '============================================================\r\n\r\n'

  const groups = groupGigSetlist(gig.setlist)
  const setNames = Object.keys(groups)

  if (!setNames.length) {
    output += 'Inga låtar i låtlistan för denna spelning.\r\n'
  } else {
    for (const sName of setNames) {
      const tracks = groups[sName] || []
      output += `------------------------------------------------------------\r\n`
      output += `[${sName.toUpperCase()}] (${tracks.length} låtar)\r\n`
      output += `------------------------------------------------------------\r\n`

      tracks.forEach((track: any, idx: number) => {
        const num = String(idx + 1).padStart(2, '0')
        const originalTag = track.isOriginal ? ' [Egen låt]' : (track.artist ? ` (${track.artist})` : '')
        output += `${num}. ${track.title}${originalTag}\r\n`
        if (track.notes) {
          output += `    * Notering: ${track.notes}\r\n`
        }
      })
      output += '\r\n'
    }
  }

  output += '============================================================\r\n'
  output += 'Det 7:e Gunget • Blues & rock med glimt i ögat\r\n'
  output += '============================================================\r\n'

  const blob = new Blob([output], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const cleanVenue = gig.venue.toLowerCase().replace(/[^a-z0-9]/g, '-')
  link.download = `det-7e-gunget-setlista-${cleanVenue}-${dateStr}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Ticket stub serial number generator
const ticketSerial = (gig: any, idx: number) => {
  const d = new Date(gig.date)
  return `D7G-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(idx + 1).padStart(3, '0')}`
}

// "Tear ticket" animation state
const tornTickets = ref<Set<string>>(new Set())
const tearTicket = (gigId: string) => {
  tornTickets.value.add(gigId)
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

    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 space-y-10">

      <!-- GIGS PAGE HEADER -->
      <PageHeader :title="t('gigs.subtitle')" :description="t('gigs.desc')" />

      <!-- TICKET BOOTH WINDOW / COUNTER -->
      <div class="max-w-5xl mx-auto">
        <!-- Booth Window Frame -->
        <div class="rounded-[32px] sm:rounded-[48px] bg-gradient-to-b from-base-200/90 via-base-100 to-base-200 dark:from-[#2a1d15] dark:via-[#1a120c] dark:to-[#0d0907] border-4 border-primary/40 p-4 sm:p-8 shadow-2xl dark:shadow-[0_0_60px_rgba(200,121,63,0.2)] relative">
          <!-- Outer glow -->
          <div class="absolute -inset-1 rounded-[34px] sm:rounded-[50px] bg-gradient-to-r from-secondary/20 via-primary/30 to-secondary/20 blur-sm pointer-events-none -z-10" />

          <!-- Glass Window Header with "TICKETS" sign -->
          <div class="text-center mb-6 relative">
            <div class="inline-flex items-center gap-3 px-8 py-2.5 rounded-full bg-gradient-to-r from-base-300 via-base-200 to-base-300 dark:from-[#1a1310] dark:via-[#3a2618] dark:to-[#1a1310] border-2 border-primary/60 shadow-lg">
              <span class="text-primary text-sm">🎫</span>
              <span class="font-heading text-xl sm:text-2xl text-primary dark:text-secondary uppercase tracking-[0.25em] font-black">
                {{ t('gigs.ticket_booth') }}
              </span>
              <span class="text-primary text-sm">🎫</span>
            </div>
            <!-- "OPEN" neon -->
            <div class="mt-2 inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span class="text-emerald-600 dark:text-emerald-400">{{ t('gigs.open') }}</span>
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
              <div
                v-for="(gig, idx) in upcomingGigs"
                :key="gig.id"
                class="group relative"
              >
                <!-- THE TICKET STUB -->
                <div
                  class="relative flex flex-col md:flex-row rounded-2xl overflow-hidden border-2 transition-all duration-300 shadow-xl hover:shadow-2xl"
                  :class="
                    tornTickets.has(gig.id)
                      ? 'border-accent/50 bg-base-200/90'
                      : 'border-primary/30 bg-[#fefce8] hover:border-primary'
                  "
                >
                  <!-- LEFT STUB: Date Block (the "tear-off" portion) -->
                  <div
                    class="relative flex flex-col items-center justify-center px-6 py-6 sm:px-8 sm:py-8 min-w-[120px] sm:min-w-[150px] border-r-2 border-dashed text-center"
                    :class="
                      tornTickets.has(gig.id)
                        ? 'border-accent/30 bg-accent/10'
                        : 'border-primary/30 bg-gradient-to-b from-primary via-primary/90 to-amber-700'
                    "
                  >
                    <!-- Perforation holes -->
                    <div class="absolute right-0 top-0 bottom-0 flex flex-col justify-between py-3">
                      <div v-for="hole in 6" :key="hole" class="w-3 h-3 rounded-full bg-base-100/80 -mr-1.5" />
                    </div>

                    <template v-if="!tornTickets.has(gig.id)">
                      <span class="text-4xl sm:text-5xl font-heading font-black text-neutral leading-none">
                        {{ formatGigDate(gig.date).day }}
                      </span>
                      <span class="text-xs sm:text-sm font-mono font-bold text-neutral/90 tracking-wider mt-1">
                        {{ formatGigDate(gig.date).month }}
                      </span>
                      <span class="text-[10px] font-mono text-neutral/70 mt-0.5">
                        {{ formatGigDate(gig.date).year }}
                      </span>
                      <div class="mt-3 w-full border-t border-neutral/30 pt-2">
                        <span class="text-[9px] font-mono font-bold text-neutral/80 uppercase tracking-wider">
                          {{ t('gigs.at_time') }} {{ formatGigDate(gig.date).time }}
                        </span>
                      </div>
                    </template>
                    <template v-else>
                      <span class="text-2xl">✅</span>
                      <span class="text-[10px] font-mono font-bold text-accent mt-1">{{ t('gigs.saved') }}</span>
                    </template>
                  </div>

                  <!-- RIGHT STUB: Venue, Details, Actions -->
                  <div class="flex-grow p-5 sm:p-6 flex flex-col justify-between relative"
                    :class="tornTickets.has(gig.id) ? '' : 'text-stone-900'"
                  >
                    <!-- Status stamp -->
                    <div
                      class="absolute top-3 right-3 sm:top-4 sm:right-4 font-mono font-black text-[10px] uppercase px-3 py-1 rounded-full border-2 transform -rotate-6"
                      :class="
                        gig.status === 'free'
                          ? 'text-emerald-700 border-emerald-600 bg-emerald-50'
                          : gig.status === 'sold_out'
                            ? 'text-red-700 border-red-600 bg-red-50'
                            : 'text-amber-700 border-amber-600 bg-amber-50'
                      "
                    >
                      {{ gig.status === 'free' ? t('gigs.free_entry') : gig.status === 'sold_out' ? t('gigs.sold_out') : t('gigs.tickets_available') }}
                    </div>

                    <!-- Venue & City -->
                    <div>
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-[10px] font-mono font-bold uppercase tracking-wider"
                          :class="tornTickets.has(gig.id) ? 'text-secondary' : 'text-amber-700'"
                        >
                          {{ formatGigDate(gig.date).weekday }}
                        </span>
                      </div>
                      <h2 class="font-heading text-xl sm:text-2xl font-black leading-tight pr-24"
                        :class="tornTickets.has(gig.id) ? 'text-primary' : 'text-stone-900'"
                      >
                        {{ gig.venue }}
                      </h2>
                      <div class="flex items-center gap-1.5 mt-1">
                        <span class="text-sm">📍</span>
                        <span class="text-sm font-medium"
                          :class="tornTickets.has(gig.id) ? 'text-base-content/80' : 'text-stone-700'"
                        >
                          {{ gig.city }}
                        </span>
                      </div>

                      <!-- Band banter / notes -->
                      <p class="text-xs italic mt-3 leading-relaxed max-w-md"
                        :class="tornTickets.has(gig.id) ? 'text-base-content/70' : 'text-stone-600'"
                      >
                        "{{ locale === 'en' && gig.notesEn ? gig.notesEn : gig.notesSv }}"
                      </p>
                    </div>

                    <!-- Ticket Footer: Serial, Actions -->
                    <div class="mt-5 pt-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      :class="tornTickets.has(gig.id) ? 'border-base-content/10' : 'border-stone-300'"
                    >
                      <!-- Serial Number -->
                      <div class="font-mono text-[10px] tracking-wider"
                        :class="tornTickets.has(gig.id) ? 'text-base-content/40' : 'text-stone-400'"
                      >
                        {{ ticketSerial(gig, idx) }} • DET 7:E GUNGET • ADMIT ONE
                      </div>

                      <!-- Action Buttons -->
                      <div class="flex items-center gap-2 flex-wrap">
                        <button
                          v-if="parseGigSetlist(gig.setlist).length > 0"
                          type="button"
                          class="btn btn-sm rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          :class="
                            expandedSetlists.has(gig.id)
                              ? 'bg-secondary text-secondary-content shadow'
                              : 'btn-outline border-primary/30 hover:bg-primary/20 text-stone-800'
                          "
                          @click="toggleGigSetlist(gig.id)"
                        >
                          <span>🎵</span>
                          <span>{{ expandedSetlists.has(gig.id) ? 'Dölj låtlista' : `Låtlista (${parseGigSetlist(gig.setlist).length})` }}</span>
                        </button>

                        <a
                          v-if="gig.ticketUrl && gig.ticketUrl !== '#'"
                          :href="gig.ticketUrl"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="btn btn-primary btn-sm rounded-full font-bold px-5 shadow-md text-xs"
                        >
                          🎫 {{ t('gigs.buy_ticket') }} →
                        </a>
                        <span v-else-if="gig.status === 'free'" class="text-xs font-bold text-emerald-600 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-200">
                          ✓ {{ t('gigs.free_entry') }}
                        </span>

                        <!-- Calendar Save Dropdown -->
                        <div class="dropdown dropdown-end">
                          <button
                            tabindex="0"
                            role="button"
                            type="button"
                            class="btn btn-ghost btn-sm rounded-full text-xs font-bold border border-primary/20 hover:bg-primary/10 flex items-center gap-1 cursor-pointer"
                            :class="tornTickets.has(gig.id) ? 'text-primary' : 'text-stone-700'"
                          >
                            <span>📅</span>
                            <span>{{ t('gigs.save_date') }}</span>
                            <span class="text-[9px] opacity-70">▼</span>
                          </button>
                          <ul tabindex="0" class="dropdown-content z-[20] menu p-2 shadow-2xl bg-base-100 rounded-box w-52 text-xs border border-primary/30 mt-1 space-y-1">
                            <li>
                              <a
                                :href="getGoogleCalendarUrl(gig)"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="font-bold flex items-center gap-2"
                                @click="tearTicket(gig.id)"
                              >
                                <span class="text-base">📅</span>
                                <span>Google Kalender ↗</span>
                              </a>
                            </li>
                            <li>
                              <button
                                type="button"
                                class="font-bold flex items-center gap-2 cursor-pointer"
                                @click="downloadIcsFile(gig); tearTicket(gig.id)"
                              >
                                <span class="text-base">📲</span>
                                <span>Apple / Outlook (.ics)</span>
                              </button>
                            </li>
                          </ul>
                        </div>

                        <a
                          :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gig.venue + ' ' + gig.city)}`"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="btn btn-ghost btn-sm rounded-full text-xs font-bold border border-primary/20 hover:bg-primary/10"
                          :class="tornTickets.has(gig.id) ? 'text-primary' : 'text-stone-700'"
                        >
                          🗺️ {{ t('gigs.directions') }}
                        </a>
                      </div>
                    </div>

                    <!-- EXPANDABLE GIG SETLIST DRAWER -->
                    <Transition
                      enter-active-class="transition duration-200 ease-out"
                      enter-from-class="opacity-0 -translate-y-2"
                      enter-to-class="opacity-100 translate-y-0"
                      leave-active-class="transition duration-150 ease-in"
                      leave-from-class="opacity-100 translate-y-0"
                      leave-to-class="opacity-0 -translate-y-2"
                    >
                      <div
                        v-if="expandedSetlists.has(gig.id) && parseGigSetlist(gig.setlist).length > 0"
                        class="mt-4 p-5 rounded-2xl bg-[#faf6ed] border-2 border-[#dfd2be] shadow-inner space-y-4 select-text"
                      >
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#8c765c]/30 pb-2 gap-2">
                          <div class="font-mono text-xs font-black uppercase text-[#801b1c] flex items-center gap-1.5">
                            <span>📋</span> Planerad Låtlista för {{ gig.venue }}
                          </div>
                          
                          <div class="flex items-center gap-3">
                            <span class="text-[10px] font-mono text-[#735e47] font-bold">Totalt {{ parseGigSetlist(gig.setlist).length }} låtar</span>
                            <button
                              type="button"
                              class="btn btn-xs rounded-full bg-[#ede0c8] hover:bg-primary hover:text-neutral text-[#735e47] border border-[#a8957e]/40 font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Ladda ner låtlistan som ren textfil"
                              @click="exportGigSetlistAsTxt(gig)"
                            >
                              <span>📄</span>
                              <span>Spara som .txt</span>
                            </button>
                          </div>
                        </div>

                        <!-- Multi-Set Sections (Set 1, Set 2, Set 3, Extranummer) -->
                        <div class="space-y-4">
                          <div
                            v-for="(setTracks, sName) in groupGigSetlist(gig.setlist)"
                            :key="sName"
                            class="space-y-2"
                          >
                            <!-- Set Section Header -->
                            <div class="flex items-center gap-2 border-b border-[#8c765c]/25 pb-1">
                              <span class="font-mono text-xs font-black uppercase tracking-wider text-[#801b1c]">
                                ▶ {{ sName }}
                              </span>
                              <span class="text-[10px] font-mono text-[#735e47]">({{ setTracks.length }} låtar)</span>
                            </div>

                            <div class="grid sm:grid-cols-2 gap-2 text-xs font-mono">
                              <div
                                v-for="(track, tIdx) in setTracks"
                                :key="tIdx"
                                class="flex items-center justify-between p-2 rounded-lg bg-[#f3ebd9]/75 hover:bg-[#ede0c8] transition-colors"
                              >
                                <div class="flex items-center gap-2 truncate">
                                  <span class="text-[#8c765c] font-bold text-[10px] w-4 text-right">{{ tIdx + 1 }}.</span>
                                  <span class="font-bold text-[#1c150e] truncate">{{ track.title }}</span>
                                  <span v-if="track.artist" class="text-[10px] text-[#735e47] truncate">({{ track.artist }})</span>
                                </div>

                                <div class="flex items-center gap-1 flex-shrink-0">
                                  <span v-if="track.notes" class="text-[10px] italic text-[#70563e] hidden md:inline truncate max-w-[110px]" :title="track.notes">
                                    ✎ {{ track.notes }}
                                  </span>
                                  <NuxtLink
                                    v-if="track.isOriginal"
                                    :to="localePath('/lyrics')"
                                    class="badge badge-xs bg-[#ebd1be] text-[#801b1c] border-none font-bold uppercase hover:bg-primary hover:text-neutral transition-colors"
                                    title="Läs låttext & ackord"
                                  >
                                    📜 Text
                                  </NuxtLink>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Transition>
                  </div>
                </div>
              </div>
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
                      🎵 {{ expandedSetlists.has(gig.id) ? 'Dölj setlista' : `Setlista (${parseGigSetlist(gig.setlist).length})` }}
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
                    <span>📋 Spelad Setlista på {{ gig.venue }}</span>
                    <span>{{ parseGigSetlist(gig.setlist).length }} låtar</span>
                  </div>

                  <div class="space-y-3">
                    <div
                      v-for="(setTracks, sName) in groupGigSetlist(gig.setlist)"
                      :key="sName"
                      class="space-y-1.5"
                    >
                      <div class="text-[11px] font-mono font-bold text-primary border-b border-primary/15 pb-0.5">
                        ▶ {{ sName }} ({{ setTracks.length }} låtar)
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

<script setup lang="ts">
const { locale, t } = useI18n()
const { getGoogleCalendarUrl, downloadIcsFile } = useCalendarExport()

export interface GigItem {
  id: string
  date: number | string | Date
  venue: string
  city: string
  ticketUrl?: string | null
  status?: 'upcoming' | 'sold_out' | 'free' | 'cancelled' | 'completed' | string | null
  notesSv?: string | null
  notesEn?: string | null
  setlist?: any
}

interface Props {
  gig: GigItem
  index?: number
}

const props = withDefaults(defineProps<Props>(), {
  index: 0,
})

const isTorn = ref(false)
const isSetlistOpen = ref(false)

const tearTicket = () => {
  isTorn.value = true
}

const toggleSetlist = () => {
  isSetlistOpen.value = !isSetlistOpen.value
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

const ticketSerial = computed(() => {
  const d = new Date(props.gig.date)
  return `D7G-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(props.index + 1).padStart(3, '0')}`
})

const exportGigSetlistAsTxt = () => {
  if (import.meta.server) return

  const dateStr = new Date(props.gig.date).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  let output = '============================================================\r\n'
  output += `DET 7:e GUNGET — SETLISTA @ ${props.gig.venue.toUpperCase()} (${props.gig.city.toUpperCase()})\r\n`
  output += `Speldatum: ${dateStr}\r\n`
  output += 'Webb: https://www.det7egunget.se\r\n'
  output += '============================================================\r\n\r\n'

  const groups = groupGigSetlist(props.gig.setlist)
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
  const cleanVenue = props.gig.venue.toLowerCase().replace(/[^a-z0-9]/g, '-')
  link.download = `det-7e-gunget-setlista-${cleanVenue}-${dateStr}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div
    class="relative rounded-2xl sm:rounded-3xl border-2 transition-all duration-300 overflow-hidden shadow-xl"
    :class="
      isTorn
        ? 'border-accent/40 bg-base-200/90 shadow-accent/10 translate-x-1'
        : 'border-[#c89d5c] bg-[#fbf8f1] hover:border-primary hover:shadow-2xl hover:-translate-y-0.5'
    "
  >
    <div class="flex flex-col md:flex-row items-stretch">
      <!-- LEFT STUB: Date Perforation & Calendar Stamp -->
      <div
        class="w-full md:w-36 flex-shrink-0 p-5 sm:p-6 flex flex-col items-center justify-center text-center relative border-b-2 md:border-b-0 md:border-r-2 border-dashed select-none"
        :class="
          isTorn
            ? 'border-accent/30 bg-accent/10'
            : 'border-primary/30 bg-gradient-to-b from-primary via-primary/90 to-amber-700'
        "
      >
        <!-- Perforation holes -->
        <div class="absolute right-0 top-0 bottom-0 flex flex-col justify-between py-3">
          <div v-for="hole in 6" :key="hole" class="w-3 h-3 rounded-full bg-base-100/80 -mr-1.5" />
        </div>

        <template v-if="!isTorn">
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
      <div
        class="flex-grow p-5 sm:p-6 flex flex-col justify-between relative"
        :class="isTorn ? '' : 'text-stone-900'"
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
            <span
              class="text-[10px] font-mono font-bold uppercase tracking-wider"
              :class="isTorn ? 'text-secondary' : 'text-amber-700'"
            >
              {{ formatGigDate(gig.date).weekday }}
            </span>
          </div>
          <h2
            class="font-heading text-xl sm:text-2xl font-black leading-tight pr-24"
            :class="isTorn ? 'text-primary' : 'text-stone-900'"
          >
            {{ gig.venue }}
          </h2>
          <div class="flex items-center gap-1.5 mt-1">
            <span class="text-sm">📍</span>
            <span
              class="text-sm font-medium"
              :class="isTorn ? 'text-base-content/80' : 'text-stone-700'"
            >
              {{ gig.city }}
            </span>
          </div>

          <!-- Band banter / notes -->
          <p
            v-if="gig.notesSv || gig.notesEn"
            class="text-xs italic mt-3 leading-relaxed max-w-md"
            :class="isTorn ? 'text-base-content/70' : 'text-stone-600'"
          >
            "{{ locale === 'en' && gig.notesEn ? gig.notesEn : gig.notesSv }}"
          </p>
        </div>

        <!-- Ticket Footer: Serial, Actions -->
        <div
          class="mt-5 pt-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          :class="isTorn ? 'border-base-content/10' : 'border-stone-300'"
        >
          <!-- Serial Number -->
          <div
            class="font-mono text-[10px] tracking-wider"
            :class="isTorn ? 'text-base-content/40' : 'text-stone-400'"
          >
            {{ ticketSerial }} • DET 7:e GUNGET • ADMIT ONE
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-2 flex-wrap">
            <button
              v-if="parseGigSetlist(gig.setlist).length > 0"
              type="button"
              class="btn btn-sm rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              :class="
                isSetlistOpen
                  ? 'bg-secondary text-secondary-content shadow'
                  : 'btn-outline border-primary/30 hover:bg-primary/20 text-stone-800'
              "
              @click="toggleSetlist"
            >
              <span>🎵</span>
              <span>{{ isSetlistOpen ? t('gigs.hide_setlist') : t('gigs.show_setlist', { count: parseGigSetlist(gig.setlist).length }) }}</span>
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
                :class="isTorn ? 'text-primary' : 'text-stone-700'"
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
                    @click="tearTicket"
                  >
                    <span class="text-base">📅</span>
                    <span>{{ t('gigs.google_calendar') }}</span>
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    class="font-bold flex items-center gap-2 cursor-pointer"
                    @click="downloadIcsFile(gig); tearTicket()"
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
              :class="isTorn ? 'text-primary' : 'text-stone-700'"
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
            v-if="isSetlistOpen && parseGigSetlist(gig.setlist).length > 0"
            class="mt-4 p-5 rounded-2xl bg-[#faf6ed] border-2 border-[#dfd2be] shadow-inner space-y-4 select-text"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#8c765c]/30 pb-2 gap-2">
              <div class="font-mono text-xs font-black uppercase text-[#801b1c] flex items-center gap-1.5">
                <span>📋</span> {{ t('gigs.planned_setlist', { venue: gig.venue }) }}
              </div>
              
              <div class="flex items-center gap-3">
                <span class="text-[10px] font-mono text-[#735e47] font-bold">{{ t('gigs.total_songs', { count: parseGigSetlist(gig.setlist).length }) }}</span>
                <button
                  type="button"
                  class="btn btn-xs rounded-full bg-[#ede0c8] hover:bg-primary hover:text-neutral text-[#735e47] border border-[#a8957e]/40 font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  :title="t('gigs.download_setlist_txt')"
                  @click="exportGigSetlistAsTxt"
                >
                  <span>📄</span>
                  <span>.txt</span>
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
                  <span class="text-[10px] font-mono text-[#735e47]">{{ t('gigs.songs_count', { count: setTracks.length }) }}</span>
                </div>

                <div class="grid sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div
                    v-for="(track, tIdx) in setTracks"
                    :key="tIdx"
                    class="flex items-center justify-between p-2 rounded-lg bg-[#f3ebd9]/75 hover:bg-[#ede0c8] transition-colors"
                  >
                    <div class="flex items-center gap-2 min-w-0 pr-2">
                      <span class="font-bold text-[#801b1c] text-[11px]">{{ tIdx + 1 }}.</span>
                      <span class="truncate font-semibold text-stone-900">{{ track.title }}</span>
                      <span v-if="track.artist" class="text-[10px] text-stone-500 truncate">({{ track.artist }})</span>
                    </div>

                    <div class="flex items-center gap-1 flex-shrink-0">
                      <span
                        v-if="track.isOriginal"
                        class="badge badge-xs bg-[#801b1c] text-white border-none font-bold"
                      >
                        {{ t('lyrics.original_badge') }}
                      </span>
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
</template>

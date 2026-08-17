<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: 'Kommande gig & Spelningar | Det 7:e Gunget',
  description: 'Se var Det 7:e Gunget spelar nästa gång. Datum, spelplatser, biljetter och arkiv över tidigare konserter.',
})

const { data: gigsData, pending } = await useFetch('/api/gigs')

const currentTab = ref<'upcoming' | 'past'>('upcoming')

const upcomingGigs = computed(() => gigsData.value?.upcoming || [])
const pastGigs = computed(() => gigsData.value?.past || [])

const formatGigDate = (dateVal: number | string | Date) => {
  const d = new Date(dateVal)
  return {
    day: d.toLocaleDateString('sv-SE', { day: 'numeric' }),
    month: d.toLocaleDateString('sv-SE', { month: 'short' }).toUpperCase(),
    year: d.getFullYear(),
    weekday: d.toLocaleDateString('sv-SE', { weekday: 'long' }),
    time: d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
  }
}

// Generate Google Calendar Link
const getGoogleCalendarUrl = (gig: any) => {
  const d = new Date(gig.date)
  const startTime = d.toISOString().replace(/-|:|\.\d\d\d/g, '')
  const endDate = new Date(d.getTime() + 3 * 60 * 60 * 1000)
  const endTime = endDate.toISOString().replace(/-|:|\.\d\d\d/g, '')
  const title = encodeURIComponent(`Det 7:e Gunget live @ ${gig.venue}`)
  const details = encodeURIComponent(`${gig.notesSv || gig.notesEn || ''}\nBiljetter: ${gig.ticketUrl || 'I dörren'}`)
  const location = encodeURIComponent(`${gig.venue}, ${gig.city}`)
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=${location}`
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-12 lg:px-10 space-y-12">
    <!-- Header -->
    <div class="space-y-4 max-w-3xl">
      <NuxtLink to="/" class="text-xs font-bold uppercase tracking-widest text-secondary hover:text-primary transition-colors inline-flex items-center gap-1">
        <span>←</span> Hem
      </NuxtLink>
      <h1 class="font-heading text-4xl sm:text-6xl text-primary text-gritty">
        Kommande gig
      </h1>
      <p class="text-base sm:text-lg text-base-content/80 leading-relaxed font-normal">
        Här ställer vi upp förstärkarna, stämmer gitarrerna och bjuder på tungt gung. Hitta en spelning nära dig och ta med dansskorna!
      </p>
    </div>

    <!-- Filter Tabs -->
    <div class="flex items-center gap-3 border-b border-primary/20 pb-4">
      <button
        type="button"
        class="px-5 py-2.5 rounded-full font-bold text-sm transition-all"
        :class="currentTab === 'upcoming' ? 'bg-primary text-primary-content shadow-lg shadow-primary/20' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        @click="currentTab = 'upcoming'"
      >
        Kommande gig ({{ upcomingGigs.length }})
      </button>
      <button
        type="button"
        class="px-5 py-2.5 rounded-full font-bold text-sm transition-all"
        :class="currentTab === 'past' ? 'bg-primary text-primary-content shadow-lg shadow-primary/20' : 'bg-base-200 text-base-content/70 hover:text-primary'"
        @click="currentTab = 'past'"
      >
        Spelade gig ({{ pastGigs.length }})
      </button>
    </div>

    <!-- Upcoming Gigs List -->
    <div v-if="currentTab === 'upcoming'" class="space-y-6">
      <div v-if="upcomingGigs.length > 0" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="gig in upcomingGigs"
          :key="gig.id"
          class="stage-card p-6 rounded-2xl relative flex flex-col justify-between hover:border-primary/50 transition-all hover:-translate-y-1 shadow-xl"
        >
          <!-- Status Ribbon -->
          <div class="absolute -top-3 -right-2 bg-secondary text-secondary-content font-mono font-black text-[10px] uppercase px-3 py-1 rounded shadow transform rotate-2">
            {{ gig.status === 'free' ? 'Fri entré' : gig.status === 'sold_out' ? 'Utsålt' : 'Biljetter finns' }}
          </div>

          <div>
            <!-- Date Block -->
            <div class="flex items-center gap-4 mb-4 pb-4 border-b border-base-content/10">
              <div class="bg-primary text-primary-content text-center px-3.5 py-2 rounded-xl font-heading font-black shadow leading-none flex flex-col items-center justify-center">
                <span class="text-2xl">{{ formatGigDate(gig.date).day }}</span>
                <span class="text-[10px] tracking-wider">{{ formatGigDate(gig.date).month }}</span>
              </div>
              <div>
                <span class="text-xs font-bold uppercase text-secondary block capitalize">
                  {{ formatGigDate(gig.date).weekday }} • kl {{ formatGigDate(gig.date).time }}
                </span>
                <h2 class="text-xl font-heading text-primary font-bold leading-tight mt-0.5">
                  {{ gig.venue }}
                </h2>
                <span class="text-sm font-medium text-base-content/80">{{ gig.city }}</span>
              </div>
            </div>

            <!-- Notes / Band Banter -->
            <p class="text-sm text-base-content/75 italic leading-relaxed mb-6">
              "{{ gig.notesSv || gig.notesEn }}"
            </p>
          </div>

          <!-- Actions -->
          <div class="pt-4 border-t border-base-content/10 space-y-3">
            <div class="flex items-center justify-between">
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
                Fri entré (ingen förbokning)
              </span>
              <span v-else class="text-xs font-medium text-base-content/50">
                Biljetter i dörren
              </span>

              <!-- Add to Google Calendar -->
              <a
                :href="getGoogleCalendarUrl(gig)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs font-bold text-secondary hover:text-primary transition-colors inline-flex items-center gap-1"
                title="Lägg till i Google Kalender"
              >
                <span>📅 Spara datum</span>
              </a>
            </div>

            <!-- Map Link -->
            <a
              :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gig.venue + ' ' + gig.city)}`"
              target="_blank"
              rel="noopener noreferrer"
              class="block text-[11px] text-base-content/50 hover:text-primary transition-colors"
            >
              📍 Hitta till {{ gig.venue }} i {{ gig.city }} ↗
            </a>
          </div>
        </div>
      </div>

      <div v-else class="stage-card p-12 rounded-2xl text-center max-w-xl mx-auto space-y-4">
        <span class="text-4xl">🎸</span>
        <h2 class="text-xl font-heading text-primary">Inga bekräftade datum just nu</h2>
        <p class="text-sm text-base-content/70">
          Vi repar för fullt och bokar in nya datum. Följ vårt nyhetsbrev eller boka oss till din scen nedan!
        </p>
      </div>
    </div>

    <!-- Past Gigs Archive -->
    <div v-else class="space-y-4">
      <div v-if="pastGigs.length > 0" class="divide-y divide-base-content/10 stage-card rounded-2xl p-6">
        <div
          v-for="gig in pastGigs"
          :key="gig.id"
          class="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div class="flex items-center gap-4">
            <div class="bg-base-300 text-base-content/80 text-center px-3 py-1.5 rounded-lg font-mono text-xs font-bold">
              {{ formatGigDate(gig.date).day }} {{ formatGigDate(gig.date).month }} {{ formatGigDate(gig.date).year }}
            </div>
            <div>
              <h3 class="font-heading text-lg text-primary font-bold">{{ gig.venue }}</h3>
              <span class="text-xs text-base-content/60">{{ gig.city }}</span>
            </div>
          </div>

          <div class="text-xs text-base-content/70 italic sm:text-right max-w-xs">
            "{{ gig.notesSv || gig.notesEn }}"
          </div>
        </div>
      </div>
      <div v-else class="p-8 text-center text-sm text-base-content/60">
        Inga tidigare gig i arkivet än.
      </div>
    </div>

    <!-- Booking CTA Strip -->
    <div class="stage-card p-8 sm:p-12 rounded-3xl border border-secondary/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
      <div class="space-y-2">
        <h2 class="font-heading text-2xl sm:text-3xl text-primary font-bold">
          Vill du boka Det 7:e Gunget?
        </h2>
        <p class="text-sm text-base-content/75 max-w-xl">
          Vi spelar på bluesklubbar, festivaler, pubar och privata 50-årsfester. Full backline kan medtagas vid behov.
        </p>
      </div>
      <NuxtLink to="/contact" class="btn btn-primary rounded-full px-8 font-bold shadow-lg shadow-primary/20 flex-shrink-0">
        Skicka bokningsförfrågan →
      </NuxtLink>
    </div>
  </div>
</template>

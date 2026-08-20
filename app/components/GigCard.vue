<script setup lang="ts">
const { locale } = useI18n()

interface Gig {
  id: string
  date: number | string | Date
  venue: string
  city: string
  ticketUrl?: string | null
  status?: 'upcoming' | 'sold_out' | 'free' | 'cancelled' | 'completed' | string | null
  notesSv?: string | null
  notesEn?: string | null
}

interface Props {
  gig: Gig
  featured?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  featured: false,
})

const formatGigDate = (dateVal: number | string | Date) => {
  const d = new Date(dateVal)
  const loc = locale.value === 'en' ? 'en-US' : 'sv-SE'
  return {
    day: d.toLocaleDateString(loc, { day: 'numeric' }),
    month: d.toLocaleDateString(loc, { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleDateString(loc, { weekday: 'short' }),
    time: d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }),
  }
}
</script>

<template>
  <div
    class="stage-card p-6 rounded-2xl relative flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 group"
    :class="featured ? 'ring-2 ring-primary/40' : ''"
  >
    <!-- Gaffer tape badge on the corner -->
    <div class="absolute -top-3 -right-2 bg-secondary/80 text-neutral font-mono font-black text-[10px] uppercase px-3 py-1 rounded shadow transform rotate-3">
      {{
        gig.status === 'free'
          ? (locale === 'en' ? 'Free Entry' : 'Fri Entré')
          : gig.status === 'sold_out'
          ? (locale === 'en' ? 'Sold Out' : 'Utsålt')
          : (locale === 'en' ? 'Upcoming' : 'Kommande')
      }}
    </div>

    <div>
      <!-- Date Banner -->
      <div class="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
        <div class="bg-primary text-neutral text-center px-3.5 py-2 rounded-xl font-heading font-black shadow leading-none flex flex-col items-center justify-center flex-shrink-0">
          <span class="text-2xl leading-none">{{ formatGigDate(gig.date).day }}</span>
          <span class="text-[10px] tracking-wider">{{ formatGigDate(gig.date).month }}</span>
        </div>
        <div class="min-w-0">
          <span class="text-xs font-bold uppercase text-secondary block truncate">
            {{ formatGigDate(gig.date).weekday }} • Kl {{ formatGigDate(gig.date).time }}
          </span>
          <h3 class="text-xl font-heading text-primary font-bold leading-tight group-hover:text-secondary transition-colors truncate">
            {{ gig.venue }}
          </h3>
          <span class="text-sm font-medium text-base-content/80 truncate block">{{ gig.city }}</span>
        </div>
      </div>

      <!-- Notes -->
      <p v-if="gig.notesSv || gig.notesEn" class="text-sm text-base-content/75 italic leading-relaxed mb-6">
        "{{ locale === 'en' && gig.notesEn ? gig.notesEn : (gig.notesSv || gig.notesEn) }}"
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
        {{ locale === 'en' ? 'Buy Tickets →' : 'Köp biljett →' }}
      </a>
      <span v-else-if="gig.status === 'free'" class="text-xs font-bold text-accent">
        {{ locale === 'en' ? 'No reservation needed' : 'Ingen förbokning krävs' }}
      </span>
      <span v-else class="text-xs font-medium text-base-content/60">
        {{ locale === 'en' ? 'Tickets at door' : 'Biljetter i dörren' }}
      </span>

      <a href="#contact" class="text-xs font-bold text-secondary hover:text-primary transition-colors underline decoration-secondary/30">
        {{ locale === 'en' ? 'Questions?' : 'Frågor om giget?' }}
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

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

interface Props {
  upcomingGigs: Gig[]
  pastGigs?: Gig[]
}

withDefaults(defineProps<Props>(), {
  pastGigs: () => [],
})
</script>

<template>
  <section id="gigs" class="mx-auto max-w-7xl px-6 lg:px-10 scroll-mt-24">
    <!-- Section Header -->
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
      <GigCard
        v-for="(gig, index) in upcomingGigs"
        :key="gig.id"
        :gig="gig"
        :featured="index === 0"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="stage-card p-12 rounded-2xl text-center max-w-xl mx-auto space-y-4">
      <span class="text-4xl">🎸</span>
      <h3 class="text-xl font-heading text-primary">Nya datum är på gång!</h3>
      <p class="text-sm text-base-content/70">
        {{ t('gigs.no_upcoming') }}
      </p>
    </div>

    <!-- Past Shows Archive Teaser -->
    <div v-if="pastGigs.length > 0" class="mt-8 p-5 bg-base-200/50 rounded-2xl border border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <span class="text-2xl">📜</span>
        <div>
          <span class="font-bold text-sm text-base-content block">Arkiv över svettiga gig</span>
          <span class="text-xs text-base-content/60">Senast spelade vi på {{ pastGigs[0]?.venue }} i {{ pastGigs[0]?.city }}.</span>
        </div>
      </div>
      <a href="#contact" class="btn btn-outline btn-sm btn-secondary rounded-full">
        Boka oss till ditt event →
      </a>
    </div>
  </section>
</template>

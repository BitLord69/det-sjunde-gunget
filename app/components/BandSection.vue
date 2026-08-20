<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

const { data: bandMembers } = await useFetch<any[]>('/api/band', {
  default: () => [],
})
</script>

<template>
  <section id="band" class="mx-auto max-w-7xl px-6 lg:px-10 scroll-mt-24">
    <!-- Header -->
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

    <!-- Band Member Cards Grid -->
    <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
      <BandMemberCard
        v-for="member in bandMembers"
        :key="member.id"
        :member="member"
      />
    </div>
  </section>
</template>

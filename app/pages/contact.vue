<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: computed(() => `${t('contact.title')} | Det 7:e Gunget`),
  description: computed(() => t('contact.desc')),
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 pt-4 sm:pt-6 pb-12 lg:px-10 space-y-10 sm:space-y-12">
    <!-- Header -->
    <PageHeader :title="t('contact.title')" :description="t('contact.desc')" />

    <div class="grid lg:grid-cols-[1fr_1.1fr] gap-12 items-start">
      <!-- Left: Contact Details & Tech Rider -->
      <div class="space-y-8">
        <div class="rounded-2xl p-8 bg-gradient-to-b from-base-200/90 via-base-100 to-base-200 dark:from-[#2a1d15] dark:via-[#1a120c] dark:to-[#0d0907] border-4 border-primary/40 shadow-xl space-y-6">
          <h2 class="font-heading text-2xl text-primary font-bold">{{ t('contact.details_title') }}</h2>
          
          <div class="space-y-4 text-sm font-medium">
            <div class="flex items-start gap-3">
              <span class="text-xl">✉️</span>
              <div>
                <span class="text-xs text-base-content/60 uppercase font-bold block">{{ t('contact.booking_email_label') }}</span>
                <span class="text-primary font-bold">kontakt@det7egunget.se</span>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <span class="text-xl">📍</span>
              <div>
                <span class="text-xs text-base-content/60 uppercase font-bold block">{{ t('contact.area_label') }}</span>
                <span>{{ t('contact.area_val') }}</span>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <span class="text-xl">🎸</span>
              <div>
                <span class="text-xs text-base-content/60 uppercase font-bold block">{{ t('contact.lineup_label') }}</span>
                <span>{{ t('contact.lineup_val') }}</span>
              </div>
            </div>

            <!-- Social channels -->
            <div class="pt-4 border-t border-primary/20">
              <span class="text-xs text-base-content/60 uppercase font-bold block mb-2">{{ t('contact.follow_listen') }}</span>
              <div class="flex items-center gap-2">
                <a
                  href="https://www.facebook.com/Detsjundegunget"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-xs btn-outline btn-primary rounded-full gap-1 text-xs"
                >
                  Facebook ↗
                </a>
                <a
                  href="https://www.instagram.com/det7egunget/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-xs btn-outline btn-secondary rounded-full gap-1 text-xs"
                >
                  Instagram ↗
                </a>
                <a
                  href="https://open.spotify.com/search/Det%207%3Ae%20Gunget"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-xs btn-outline rounded-full gap-1 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10"
                  :title="t('contact.spotify_soon')"
                >
                  Spotify ↗
                </a>
                <a
                  href="https://www.youtube.com/@det7egunget"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-xs btn-outline rounded-full gap-1 text-xs text-red-600 dark:text-red-400 border-red-500/40 hover:bg-red-500/10"
                >
                  YouTube ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Technical rider teaser -->
        <div class="stage-card p-6 rounded-2xl border border-primary/20 space-y-3">
          <h3 class="font-heading text-xl text-primary font-bold">{{ t('contact.simple_band_title') }}</h3>
          <p class="text-xs text-base-content/80 leading-relaxed">
            {{ t('contact.simple_band_desc') }}
          </p>
          <ul class="space-y-1.5 text-xs text-base-content/75 list-disc list-inside">
            <li>{{ t('contact.req_power') }}</li>
            <li>{{ t('contact.req_stage') }}</li>
            <li>{{ t('contact.req_vibe') }}</li>
          </ul>
        </div>
      </div>

      <!-- Right: Reusable Booking Form -->
      <BookingForm />
    </div>
  </div>
</template>

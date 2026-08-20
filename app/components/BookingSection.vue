<script setup lang="ts">
const { t, locale } = useI18n()
</script>

<template>
  <section id="contact" class="mx-auto max-w-7xl px-6 lg:px-10 scroll-mt-24">
    <div class="rounded-3xl sm:rounded-[36px] p-8 sm:p-14 bg-gradient-to-b from-base-200/90 via-base-100 to-base-200 dark:from-[#2a1d15] dark:via-[#1a120c] dark:to-[#0d0907] border-4 border-primary/40 shadow-2xl grid lg:grid-cols-2 gap-12 items-center">
      <!-- Left: Pitch & Details -->
      <div class="space-y-6">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
          <span>✉️</span> {{ t('contact.section_tag') }}
        </div>

        <h2 class="text-3xl sm:text-5xl font-heading text-primary text-gritty">
          {{ t('contact.title') }}
        </h2>

        <p class="text-base text-base-content/80 leading-relaxed">
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

      <!-- Right: Reusable Booking Form -->
      <BookingForm />
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps({
  error: {
    type: Object,
    default: () => ({}),
  },
})

const { t } = useI18n()
const localePath = useLocalePath()

const statusCode = computed(() => Number(props.error?.statusCode) || 404)
const is404 = computed(() => statusCode.value === 404)

const eyebrowText = computed(() => (is404.value ? t('error_page.eyebrow_404') : t('error_page.eyebrow_generic')))
const eyebrowParts = computed(() => eyebrowText.value.split(/(7:[eE])/g))

useHead({
  title: computed(() =>
    is404.value
      ? `404 – ${t('error_page.title_404')} | Det 7:e Gunget`
      : `${statusCode.value} – ${t('error_page.title_generic')} | Det 7:e Gunget`,
  ),
})

const handleClearError = (targetPath: string = '/') => {
  clearError({ redirect: localePath(targetPath) })
}
</script>

<template>
  <div class="min-h-screen bg-base-100 text-base-content flex flex-col selection:bg-primary selection:text-neutral">
    <!-- Main Navigation Header -->
    <SiteHeader />

    <!-- Error Hero Section -->
    <main class="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 relative overflow-hidden">
      <!-- Vintage Amp Glow Backgrounds -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] bg-amber-500/15 rounded-full blur-2xl pointer-events-none -z-10" />

      <div class="max-w-2xl w-full mx-auto text-center relative z-10">
        <!-- Eyebrow Badge with preserved '7:e' styling -->
        <div class="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs sm:text-sm font-semibold tracking-wider uppercase mb-6 shadow-sm">
          <span
            v-for="(part, idx) in eyebrowParts"
            :key="idx"
            :class="part.toLowerCase() === '7:e' ? 'normal-case' : ''"
          >
            {{ part }}
          </span>
        </div>

        <!-- Glowing Tube Indicator / Giant Error Number -->
        <div class="relative my-4 select-none">
          <div class="font-heading font-black text-9xl sm:text-[10rem] md:text-[12rem] lg:text-[13rem] tracking-wide text-primary drop-shadow-[0_0_40px_rgba(226,189,114,0.45)] leading-none animate-pulse">
            {{ statusCode }}
          </div>
        </div>

        <!-- Bluesy Error Title -->
        <h1 class="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-base-content mt-6 mb-4 leading-tight">
          {{ is404 ? t('error_page.title_404') : t('error_page.title_generic') }}
        </h1>

        <!-- Humorous Description -->
        <p class="text-base-content/80 text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-8 font-sans">
          {{ is404 ? t('error_page.desc_404') : t('error_page.desc_generic') }}
        </p>

        <!-- Action Quick Links -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 max-w-lg mx-auto">
          <!-- Back Home Button -->
          <button
            type="button"
            class="btn btn-primary w-full sm:w-auto px-6 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            @click="handleClearError('/')"
          >
            {{ t('error_page.btn_home') }}
          </button>

          <!-- Jukebox Link -->
          <button
            type="button"
            class="btn btn-outline border-primary/40 hover:border-primary hover:bg-primary/10 text-base-content w-full sm:w-auto px-5 transition-all duration-200"
            @click="handleClearError('/jukebox')"
          >
            {{ t('error_page.btn_jukebox') }}
          </button>

          <!-- Gigs Link -->
          <button
            type="button"
            class="btn btn-ghost text-base-content/70 hover:text-base-content w-full sm:w-auto px-4"
            @click="handleClearError('/gigs')"
          >
            {{ t('error_page.btn_gigs') }}
          </button>
        </div>

        <!-- Technical Debug Details (Subtle) -->
        <div v-if="!is404 && error?.message" class="mt-10 p-3 bg-neutral/60 border border-base-300 rounded-lg text-xs font-mono text-base-content/60 text-left max-w-md mx-auto overflow-x-auto">
          <p class="font-bold text-error/80 mb-1">
            {{ t('error_page.error_code') }} {{ statusCode }}
          </p>
          <p>{{ error.message }}</p>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <SiteFooter />

    <!-- Mobile Bottom Navigation Bar -->
    <MobileBottomNav />
  </div>
</template>

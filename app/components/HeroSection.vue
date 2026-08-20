<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <section class="relative isolate overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28 border-b border-primary/10">
    <!-- Background Ambient Glow & Prominent Edge Speckles -->
    <div class="absolute inset-0 -z-10 tube-glow pointer-events-none opacity-90" />
    <div class="absolute inset-0 -z-10 edge-speckles opacity-35 pointer-events-none" />

    <div class="mx-auto max-w-7xl px-6 lg:px-10 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
      <!-- Left: Text & Pitch -->
      <div class="space-y-8 max-w-2xl">
        <h1 class="text-5xl sm:text-7xl lg:text-8xl leading-[0.95] text-gritty font-castoro pb-3">
          Det 7:e<br>Gunget
        </h1>

        <p class="text-lg sm:text-xl text-base-content/85 leading-relaxed font-normal pt-2">
          {{ t('hero.desc') }}
        </p>

        <!-- Sleek inline band metadata pills -->
        <div class="flex flex-wrap items-center gap-2 sm:gap-3 pt-2 text-xs font-sans">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-base-200/90 border border-primary/30 text-base-content shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span class="text-base-content/70 font-medium">{{ t('hero.stats.musicians') }}:</span>
            <span class="font-bold text-primary text-sm">4</span>
          </div>
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-base-200/90 border border-secondary/30 text-base-content shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span class="text-base-content/70 font-medium">{{ t('hero.stats.avg_age') }}:</span>
            <span class="font-bold text-secondary text-sm">50+</span>
          </div>
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-base-200/90 border border-accent/30 text-base-content shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-accent" />
            <span class="text-base-content/70 font-medium">{{ t('hero.stats.groove') }}:</span>
            <span class="font-bold text-accent text-sm">100%</span>
          </div>
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-base-200/90 border border-primary/30 text-base-content shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-primary" />
            <span class="text-base-content/70 font-medium">{{ t('hero.stats.volume') }}:</span>
            <span class="font-bold text-primary text-sm">11</span>
          </div>
        </div>

        <!-- CTAs navigating to dedicated pages -->
        <div class="flex flex-wrap gap-4 pt-4">
          <NuxtLink :to="localePath('/gigs')" class="btn btn-primary rounded-full px-8 text-sm font-bold shadow-lg shadow-primary/25 hover:scale-105 transition-transform">
            {{ t('hero.cta_gigs') }} →
          </NuxtLink>
          <NuxtLink :to="localePath('/music')" class="btn btn-outline btn-secondary rounded-full px-8 text-sm font-bold hover:scale-105 transition-transform">
            {{ t('hero.cta_music') }}
          </NuxtLink>
        </div>
      </div>

      <!-- Right: Vintage Badge Logo Showcase -->
      <div class="flex justify-center items-center relative">
        <div class="absolute -inset-4 rounded-full bg-gradient-to-tr from-secondary/20 to-primary/20 blur-2xl opacity-60" />
        <div class="relative group">
          <div class="absolute inset-4 rounded-full bg-[#181310] -z-10 shadow-2xl dark:hidden" />
          <NuxtImg
            src="/media/brand/Logotyp.webp"
            alt="Det 7:e Gunget emblem logotyp"
            class="w-[320px] sm:w-[420px] lg:w-[460px] object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-102 group-hover:rotate-1"
            priority
          />
          <div class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-base-200/95 border border-primary/40 px-4 py-1.5 rounded-full text-xs font-mono text-primary shadow-lg tracking-wider whitespace-nowrap">
            {{ t('hero.badge_tag') }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

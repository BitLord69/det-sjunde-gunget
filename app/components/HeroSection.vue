<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

const { isPlayingHarp, playBluesHarpLick } = useBluesHarp()
const showHarpFeedback = ref(false)

const handleLogoClick = () => {
  playBluesHarpLick()
  showHarpFeedback.value = true
  setTimeout(() => {
    showHarpFeedback.value = false
  }, 2300)
}
</script>

<template>
  <section class="relative isolate overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28 border-b border-primary/10">
    <!-- Background Ambient Glow & Prominent Edge Speckles -->
    <div class="absolute inset-0 -z-10 tube-glow pointer-events-none opacity-90" />
    <div class="absolute inset-0 -z-10 edge-speckles opacity-35 pointer-events-none" />

    <div class="mx-auto max-w-7xl px-6 lg:px-10 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-start">
      <!-- Left: Text & Pitch (order-2 on mobile so logo appears first) -->
      <div class="space-y-8 max-w-2xl order-2 lg:order-1 text-center lg:text-left mx-auto lg:mx-0">
        <h1 class="text-5xl sm:text-7xl lg:text-8xl leading-[0.95] text-gritty font-castoro pb-3">
          Det 7:e<br class="hidden sm:inline lg:inline"> Gunget
        </h1>

        <p class="text-lg sm:text-xl text-base-content/85 leading-relaxed font-normal pt-2 min-h-[3.5rem] sm:min-h-[4rem]">
          {{ t('hero.desc') }}
        </p>

        <!-- Sleek inline band metadata pills -->
        <div class="flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-2.5 pt-2 text-xs font-sans min-h-[2.5rem]">
          <div class="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-base-200/90 border border-primary/30 text-base-content shadow-sm whitespace-nowrap">
            <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span class="text-base-content/70 font-medium">{{ t('hero.stats.pulse') }}:</span>
            <span class="font-bold text-primary text-sm">{{ t('hero.stats.pulse_val') }}</span>
          </div>
          <div class="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-base-200/90 border border-secondary/30 text-base-content shadow-sm whitespace-nowrap">
            <span class="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span class="text-base-content/70 font-medium">{{ t('hero.stats.joy') }}:</span>
            <span class="font-bold text-secondary text-sm">{{ t('hero.stats.joy_val') }}</span>
          </div>
          <div class="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-base-200/90 border border-accent/30 text-base-content shadow-sm whitespace-nowrap">
            <span class="w-1.5 h-1.5 rounded-full bg-accent" />
            <span class="text-base-content/70 font-medium">{{ t('hero.stats.groove') }}:</span>
            <span class="font-bold text-accent text-sm">100%</span>
          </div>
          <div class="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-base-200/90 border border-primary/30 text-base-content shadow-sm whitespace-nowrap">
            <span class="w-1.5 h-1.5 rounded-full bg-primary" />
            <span class="text-base-content/70 font-medium">{{ t('hero.stats.volume') }}:</span>
            <span class="font-bold text-primary text-sm">11</span>
          </div>
        </div>

        <!-- CTAs navigating to dedicated pages -->
        <div class="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
          <NuxtLink :to="localePath('/gigs')" class="btn btn-primary rounded-full px-8 text-sm font-bold shadow-lg shadow-primary/25 hover:scale-105 transition-transform">
            {{ t('hero.cta_gigs') }} →
          </NuxtLink>
          <NuxtLink :to="localePath('/music')" class="btn btn-outline btn-secondary rounded-full px-8 text-sm font-bold hover:scale-105 transition-transform">
            {{ t('hero.cta_music') }}
          </NuxtLink>
        </div>
      </div>

      <!-- Right: Vintage Badge Logo Showcase (order-1 on mobile so it displays on top) -->
      <div class="flex justify-center items-center relative order-1 lg:order-2 lg:pt-4">
        <div class="absolute -inset-4 rounded-full bg-gradient-to-tr from-secondary/20 to-primary/20 blur-2xl opacity-60 pointer-events-none" />
        
        <div
          class="relative group cursor-pointer select-none transition-transform duration-300 active:scale-95"
          :class="isPlayingHarp ? 'scale-105 animate-[pulse_0.4s_ease-in-out_infinite]' : 'hover:scale-102'"
          :title="t('hero.harp_tooltip')"
          @click="handleLogoClick"
        >
          <div class="absolute inset-4 rounded-full bg-[#181310] -z-10 shadow-2xl dark:hidden" />
          
          <NuxtImg
            src="/media/brand/Logotyp.webp"
            :alt="t('hero.logo_alt')"
            width="460"
            height="460"
            sizes="xs:320px sm:420px lg:460px"
            class="w-[320px] sm:w-[420px] lg:w-[460px] object-contain drop-shadow-2xl transition-transform duration-500 group-hover:rotate-1"
            :class="isPlayingHarp ? 'filter drop-shadow-[0_0_25px_rgba(200,121,63,0.85)]' : ''"
            priority
          />

          <!-- Floating Musical Notes Animation when Harp Plays -->
          <div v-if="showHarpFeedback" class="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible">
            <span class="absolute text-3xl text-amber-400 animate-bounce -top-6 -left-2 drop-shadow-lg">🪗</span>
            <span class="absolute text-2xl text-secondary animate-[ping_1.2s_cubic-bezier(0,0,0.2,1)_infinite] -top-8 right-6">🎶</span>
            <span class="absolute text-3xl text-primary animate-[bounce_0.8s_infinite] -bottom-4 left-6">🎵</span>
            <span class="absolute text-xl text-amber-300 animate-pulse top-1/2 -right-6">✨</span>
          </div>

          <!-- Interactive Badge & Harmonica Hint -->
          <div
            class="absolute bottom-2 left-1/2 -translate-x-1/2 border px-4 py-1.5 rounded-full text-xs font-mono shadow-lg tracking-wider whitespace-nowrap transition-all duration-300 flex items-center gap-1.5"
            :class="
              isPlayingHarp
                ? 'bg-primary text-neutral border-amber-300 font-black ring-4 ring-primary/40 scale-110 shadow-primary/50'
                : 'bg-base-200/95 text-primary border-primary/40 group-hover:border-primary group-hover:bg-base-300'
            "
          >
            <span>{{ isPlayingHarp ? '🪗' : '🎵' }}</span>
            <span>{{ isPlayingHarp ? '★ BLUES HARP RIFF! ★' : t('hero.badge_tag') }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

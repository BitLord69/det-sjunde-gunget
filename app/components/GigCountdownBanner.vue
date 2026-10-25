<script setup lang="ts">
import type { Gig } from '~/types'

const props = defineProps<{
  gigs?: any[]
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// Find next upcoming gig
const nextGig = computed(() => {
  const list = props.gigs || []
  if (!list.length) return null

  // Sort ascending by gig timestamp
  const sorted = [...list]
    .map((g) => {
      const ts = new Date(g.date).getTime()
      return { ...g, timestamp: ts }
    })
    .filter((g) => !isNaN(g.timestamp))
    // Keep gigs until 4 hours after start time
    .filter((g) => g.timestamp + 4 * 60 * 60 * 1000 > now.value)
    .sort((a, b) => a.timestamp - b.timestamp)

  return sorted[0] || null
})

// Countdown diff
const timeDiff = computed(() => {
  if (!nextGig.value) return null
  const diff = nextGig.value.timestamp - now.value
  return diff
})

const isLiveNow = computed(() => {
  if (!timeDiff.value) return false
  return timeDiff.value <= 0 && timeDiff.value > -4 * 60 * 60 * 1000
})

const isTonight = computed(() => {
  if (!timeDiff.value) return false
  return timeDiff.value > 0 && timeDiff.value <= 12 * 60 * 60 * 1000
})

const countdown = computed(() => {
  if (!timeDiff.value || timeDiff.value <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  const totalSecs = Math.floor(timeDiff.value / 1000)
  const days = Math.floor(totalSecs / (24 * 3600))
  const hours = Math.floor((totalSecs % (24 * 3600)) / 3600)
  const minutes = Math.floor((totalSecs % 3600) / 60)
  const seconds = totalSecs % 60

  return { days, hours, minutes, seconds }
})

const formatGigDate = (dateVal: any) => {
  try {
    const d = new Date(dateVal)
    return d.toLocaleDateString('sv-SE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return ''
  }
}

const formatGigTime = (dateVal: any) => {
  try {
    const d = new Date(dateVal)
    return d.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}
</script>

<template>
  <div class="w-full">
    <!-- STATE A: HAS UPCOMING GIG -->
    <div
      v-if="nextGig"
      class="relative overflow-hidden rounded-3xl border-2 border-primary/40 bg-gradient-to-r from-base-200/95 via-base-100 to-base-200/95 p-5 sm:p-7 shadow-2xl shadow-primary/10"
    >
      <!-- Vintage Amp Glow Backdrop -->
      <div class="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-secondary/15 blur-3xl pointer-events-none" />
      <div class="absolute -left-20 -bottom-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

      <div class="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
        <!-- Gig Info Left -->
        <div class="space-y-2 text-center lg:text-left flex-1 min-w-0">
          <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-xs font-mono font-bold text-secondary uppercase tracking-wider">
            <span class="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span>{{ isLiveNow ? t('gigs.countdown_live_now') : isTonight ? t('gigs.countdown_tonight') : t('gigs.countdown_title') }}</span>
          </div>

          <h3 class="font-heading text-2xl sm:text-3xl text-primary font-black truncate">
            {{ nextGig.venue }}
          </h3>

          <p class="text-sm sm:text-base text-base-content/80 flex items-center justify-center lg:justify-start gap-2 flex-wrap">
            <span class="font-bold text-base-content">{{ nextGig.city }}</span>
            <span class="opacity-40">•</span>
            <span>{{ formatGigDate(nextGig.date) }}</span>
            <span class="opacity-40">•</span>
            <span class="font-mono text-secondary font-bold">kl {{ formatGigTime(nextGig.date) }}</span>
          </p>
        </div>

        <!-- Countdown Clock Middle -->
        <div v-if="!isLiveNow" class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <!-- Days -->
          <div class="flex flex-col items-center">
            <div class="w-14 sm:w-16 h-16 sm:h-18 rounded-2xl bg-base-300/90 border border-primary/30 flex items-center justify-center shadow-inner relative overflow-hidden">
              <span class="font-mono text-2xl sm:text-3xl font-black text-secondary tracking-tight">
                {{ String(countdown.days).padStart(2, '0') }}
              </span>
              <div class="absolute inset-x-0 top-1/2 h-px bg-base-100/40" />
            </div>
            <span class="text-[10px] sm:text-xs font-mono font-bold text-base-content/60 uppercase tracking-widest mt-1">
              {{ t('gigs.countdown_days') }}
            </span>
          </div>

          <span class="font-mono text-xl text-primary/50 font-black mb-5">:</span>

          <!-- Hours -->
          <div class="flex flex-col items-center">
            <div class="w-14 sm:w-16 h-16 sm:h-18 rounded-2xl bg-base-300/90 border border-primary/30 flex items-center justify-center shadow-inner relative overflow-hidden">
              <span class="font-mono text-2xl sm:text-3xl font-black text-secondary tracking-tight">
                {{ String(countdown.hours).padStart(2, '0') }}
              </span>
              <div class="absolute inset-x-0 top-1/2 h-px bg-base-100/40" />
            </div>
            <span class="text-[10px] sm:text-xs font-mono font-bold text-base-content/60 uppercase tracking-widest mt-1">
              {{ t('gigs.countdown_hours') }}
            </span>
          </div>

          <span class="font-mono text-xl text-primary/50 font-black mb-5">:</span>

          <!-- Minutes -->
          <div class="flex flex-col items-center">
            <div class="w-14 sm:w-16 h-16 sm:h-18 rounded-2xl bg-base-300/90 border border-primary/30 flex items-center justify-center shadow-inner relative overflow-hidden">
              <span class="font-mono text-2xl sm:text-3xl font-black text-secondary tracking-tight">
                {{ String(countdown.minutes).padStart(2, '0') }}
              </span>
              <div class="absolute inset-x-0 top-1/2 h-px bg-base-100/40" />
            </div>
            <span class="text-[10px] sm:text-xs font-mono font-bold text-base-content/60 uppercase tracking-widest mt-1">
              {{ t('gigs.countdown_mins') }}
            </span>
          </div>

          <span class="font-mono text-xl text-primary/50 font-black mb-5">:</span>

          <!-- Seconds -->
          <div class="flex flex-col items-center">
            <div class="w-14 sm:w-16 h-16 sm:h-18 rounded-2xl bg-base-300/90 border border-primary/30 flex items-center justify-center shadow-inner relative overflow-hidden">
              <span class="font-mono text-2xl sm:text-3xl font-black text-primary animate-pulse tracking-tight">
                {{ String(countdown.seconds).padStart(2, '0') }}
              </span>
              <div class="absolute inset-x-0 top-1/2 h-px bg-base-100/40" />
            </div>
            <span class="text-[10px] sm:text-xs font-mono font-bold text-base-content/60 uppercase tracking-widest mt-1">
              {{ t('gigs.countdown_secs') }}
            </span>
          </div>
        </div>

        <!-- Live Now Badge if on stage -->
        <div v-else class="flex-shrink-0 flex items-center gap-3 px-6 py-4 rounded-2xl bg-secondary/15 border-2 border-secondary text-secondary font-black animate-pulse">
          <span class="text-2xl">🔥</span>
          <span class="font-heading tracking-wider">{{ t('gigs.countdown_live_now') }}</span>
        </div>

        <!-- Actions Right -->
        <div class="flex items-center gap-3 flex-shrink-0">
          <NuxtLink
            :to="localePath('/gigs')"
            class="btn btn-primary rounded-full px-6 font-bold shadow-lg shadow-primary/25 hover:scale-105 transition-all text-xs sm:text-sm"
          >
            <span>🎫</span>
            <span>{{ t('gigs.countdown_get_tickets') }}</span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- STATE B: NO UPCOMING GIGS (WARM BLUES FALLBACK) -->
    <div
      v-else
      class="relative overflow-hidden rounded-3xl border border-primary/25 bg-base-200/80 p-5 sm:p-6 text-center lg:text-left flex flex-col lg:flex-row items-center justify-between gap-4"
    >
      <div class="flex items-center gap-3">
        <span class="text-3xl">🎸</span>
        <div>
          <h4 class="font-heading font-bold text-primary text-base sm:text-lg">
            {{ t('gigs.countdown_no_gigs_title') }}
          </h4>
          <p class="text-xs sm:text-sm text-base-content/75 max-w-xl">
            {{ t('gigs.countdown_no_gigs_desc') }}
          </p>
        </div>
      </div>

      <NuxtLink
        :to="localePath('/contact')"
        class="btn btn-outline btn-primary btn-sm rounded-full font-bold flex-shrink-0"
      >
        {{ t('gigs.countdown_book_tip') }}
      </NuxtLink>
    </div>
  </div>
</template>

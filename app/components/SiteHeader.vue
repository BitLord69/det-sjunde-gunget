<script setup lang="ts">
const { locale, setLocale, t } = useI18n()
const localePath = useLocalePath()
const colorMode = useColorMode()

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// Mobile Menu Drawer state
const isMobileMenuOpen = ref(false)

// Reading glasses mode
const isGlassesMode = ref(false)

onMounted(() => {
  const saved = localStorage.getItem('gunget-glasses-mode')
  if (saved === 'true') {
    isGlassesMode.value = true
    document.body.classList.add('reading-glasses-mode')
  }
})

const toggleGlassesMode = () => {
  isGlassesMode.value = !isGlassesMode.value
  if (isGlassesMode.value) {
    document.body.classList.add('reading-glasses-mode')
    localStorage.setItem('gunget-glasses-mode', 'true')
  } else {
    document.body.classList.remove('reading-glasses-mode')
    localStorage.setItem('gunget-glasses-mode', 'false')
  }
}

// Master volume knob (0 to 11)
const volume = ref(8)
const showVolumeToast = ref(false)

const increaseVolume = () => {
  if (volume.value < 11) {
    volume.value++
    if (volume.value === 11) {
      showVolumeToast.value = true
      setTimeout(() => {
        showVolumeToast.value = false
      }, 3500)
    }
  } else {
    volume.value = 0
  }
}

const { data: gigsData } = await useFetch<{ upcoming: any[]; past: any[]; all: any[] }>('/api/gigs')
const nextGig = computed(() => gigsData.value?.upcoming?.[0] || null)
</script>

<template>
  <div class="contents">
    <!-- Top Announcement / Next Gig Ticker Bar (Seamless with Header background) -->
    <div class="bg-base-100/95 text-xs text-base-content/75 border-b border-primary/10 py-2 px-4 sm:px-8 relative z-50">
      <div class="mx-auto max-w-7xl flex items-center justify-between gap-4">
        <!-- Left: Live Next Gig Ticker -->
        <div class="flex items-center gap-2 font-mono text-[11px] truncate">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          <NuxtLink v-if="nextGig" :to="localePath('/gigs')" class="hover:text-primary transition-colors flex items-center gap-1.5 truncate">
            <span class="text-secondary font-bold uppercase tracking-wider">{{ t('ticker.next_gig') }}</span>
            <span class="text-primary font-bold">{{ nextGig.venue }}, {{ nextGig.city }}</span>
            <span class="text-base-content/60 hidden md:inline font-sans">
              ({{ new Date(nextGig.date).toLocaleDateString(locale === 'en' ? 'en-US' : 'sv-SE', { day: 'numeric', month: 'short' }) }})
            </span>
            <span class="text-secondary font-bold">→</span>
          </NuxtLink>
          <span v-else class="text-base-content/80">
            <span class="text-primary font-bold">Det 7:e Gunget</span> • {{ t('tagline') }}
          </span>
        </div>

        <div class="flex items-center gap-3 sm:gap-4 flex-shrink-0">
          <!-- Light / Dark Mode Sun/Moon Toggle (Icon only) -->
          <ClientOnly>
            <button
              type="button"
              class="flex items-center justify-center w-7 h-7 rounded-full transition-colors hover:text-primary hover:bg-base-200 focus:outline-none cursor-pointer text-sm"
              :title="colorMode.value === 'dark' ? t('common.toggle_light_mode') : t('common.toggle_dark_mode')"
              @click="toggleColorMode"
            >
              <span>{{ colorMode.value === 'dark' ? '🌙' : '☀️' }}</span>
            </button>
            <template #fallback>
              <div class="w-7 h-7 flex items-center justify-center text-sm">🌙</div>
            </template>
          </ClientOnly>

          <!-- Reading Glasses Quick Switch -->
          <button
            type="button"
            class="flex items-center gap-1.5 transition-colors hover:text-primary focus:outline-none cursor-pointer text-xs py-0.5 px-1.5 rounded hover:bg-base-200"
            :title="t('glasses_mode.tooltip')"
            @click="toggleGlassesMode"
          >
            <span>👓</span>
            <span class="hidden sm:inline font-medium">
              {{ isGlassesMode ? t('glasses_mode.active') : t('glasses_mode.inactive') }}
            </span>
          </button>

          <!-- Admin Login Shortcut -->
          <NuxtLink
            to="/admin/login"
            class="flex items-center gap-1 text-[11px] font-mono text-base-content/60 hover:text-primary transition-colors py-0.5 px-2 rounded hover:bg-base-200"
            title="Band Admin (Janis, Bosse, Marcus, Jonas)"
          >
            <span>🔒</span>
            <span class="hidden sm:inline">Admin</span>
          </NuxtLink>

          <!-- Language Switcher -->
          <div class="flex items-center gap-1 font-mono text-[11px]">
            <button
              type="button"
              class="px-1.5 py-0.5 rounded transition-colors"
              :class="locale === 'sv' ? 'bg-primary text-primary-content font-bold' : 'text-base-content/60 hover:text-primary'"
              @click="setLocale('sv')"
            >
              SV
            </button>
            <span class="text-base-content/30">/</span>
            <button
              type="button"
              class="px-1.5 py-0.5 rounded transition-colors"
              :class="locale === 'en' ? 'bg-primary text-primary-content font-bold' : 'text-base-content/60 hover:text-primary'"
              @click="setLocale('en')"
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Navigation Header -->
    <header class="sticky top-0 z-40 bg-base-100/95 backdrop-blur-md border-b border-primary/15 shadow-xl">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <!-- Wordmark -->
        <NuxtLink :to="localePath('/')" class="group flex items-center gap-3 focus:outline-none cursor-guitar">
          <div class="flex flex-col">
            <span class="font-heading text-2xl sm:text-3xl text-primary tracking-wide drop-shadow transition-transform group-hover:scale-102">
              Det 7:e Gunget
            </span>
            <span class="text-[10px] uppercase font-bold tracking-[0.25em] text-secondary -mt-1 font-sans">
              Blues & Rock 'n' Roll
            </span>
          </div>
        </NuxtLink>

        <!-- Desktop Navigation to Dedicated Pages -->
        <nav class="hidden items-center gap-7 text-sm font-semibold tracking-wide lg:flex font-sans">
          <NuxtLink
            class="transition-colors hover:text-primary py-1 border-b-2 border-transparent hover:border-primary"
            active-class="!text-primary !border-primary"
            :to="localePath('/gigs')"
            :title="t('nav.hints.gigs')"
          >
            {{ t('nav.gigs') }}
          </NuxtLink>
          <NuxtLink
            class="transition-colors hover:text-primary py-1 border-b-2 border-transparent hover:border-primary"
            active-class="!text-primary !border-primary"
            :to="localePath('/music')"
            :title="t('nav.hints.music')"
          >
            {{ t('nav.music') }}
          </NuxtLink>
          <NuxtLink
            class="transition-colors hover:text-primary py-1 border-b-2 border-transparent hover:border-primary"
            active-class="!text-primary !border-primary"
            :to="localePath('/lyrics')"
            :title="t('nav.hints.lyrics')"
          >
            {{ t('nav.lyrics') }}
          </NuxtLink>
          <NuxtLink
            class="transition-colors hover:text-primary py-1 border-b-2 border-transparent hover:border-primary"
            active-class="!text-primary !border-primary"
            :to="localePath('/about')"
            :title="t('nav.hints.band')"
          >
            {{ t('nav.band') }}
          </NuxtLink>
          <NuxtLink
            class="transition-colors hover:text-primary py-1 border-b-2 border-transparent hover:border-primary"
            active-class="!text-primary !border-primary"
            :to="localePath('/gallery')"
            :title="t('nav.hints.gallery')"
          >
            {{ t('nav.gallery') }}
          </NuxtLink>
          <NuxtLink
            class="group transition-colors hover:text-primary py-1 border-b-2 border-transparent hover:border-primary cursor-fan inline-flex items-center"
            active-class="!text-primary !border-primary"
            :to="localePath('/fancentral')"
            :title="t('nav.hints.fan_central')"
          >
            {{ t('nav.fan_central') }}
            <svg class="h-4 w-0 group-hover:w-4 group-hover:ml-1.5 overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-300 fan-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 13a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M14.167 10.5c.722 -1.538 1.156 -3.043 1.303 -4.514c.22 -1.63 -.762 -2.986 -3.47 -2.986s-3.69 1.357 -3.47 2.986c.147 1.471 .581 2.976 1.303 4.514"/><path d="M13.169 16.751c.97 1.395 2.057 2.523 3.257 3.386c1.3 1 2.967 .833 4.321 -1.512c1.354 -2.345 .67 -3.874 -.85 -4.498c-1.348 -.608 -2.868 -.985 -4.562 -1.128"/><path d="M8.664 13c-1.693 .143 -3.213 .52 -4.56 1.128c-1.522 .623 -2.206 2.153 -.852 4.498s3.02 2.517 4.321 1.512c1.2 -.863 2.287 -1.991 3.258 -3.386"/></svg>
          </NuxtLink>
          <a
            href="https://det-7e-gunget.myspreadshop.se"
            target="_blank"
            rel="noopener noreferrer"
            class="transition-colors hover:text-primary py-1 border-b-2 border-transparent hover:border-primary inline-flex items-center gap-1"
            :title="t('nav.hints.merch')"
          >
            <span>{{ t('nav.merch') }}</span>
            <span class="text-xs text-base-content/60">↗</span>
          </a>
        </nav>

        <!-- Interactive Volume Knob, Booking CTA, and Hamburger Button -->
        <div class="flex items-center gap-3 sm:gap-5">
          <!-- Master Volume Knob -->
          <div class="flex items-center gap-2 bg-base-200/90 dark:bg-neutral/90 px-2.5 py-1.5 rounded-full border border-primary/30 shadow-inner">
            <div class="flex flex-col text-right">
              <span class="text-[9px] font-mono uppercase tracking-widest text-secondary font-bold">{{ t('volume_knob.short_label') }}</span>
              <span class="text-xs font-mono font-bold text-primary">{{ volume }}</span>
            </div>
            <button
              type="button"
              class="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-base-300 via-base-200 to-base-300 dark:from-[#332b24] dark:via-[#1a1512] dark:to-[#0d0a08] border-2 border-primary/70 shadow flex items-center justify-center transition-transform hover:scale-110 active:scale-95 focus:outline-none cursor-pointer"
              :title="t('common.volume_knob_hint')"
              @click="increaseVolume"
            >
              <!-- Notch indicator that rotates based on volume -->
              <div
                class="absolute w-1 h-3 bg-primary rounded-full top-0.5 transition-transform duration-200"
                :style="{ transform: `rotate(${(volume / 11) * 270 - 135}deg)`, transformOrigin: 'bottom center' }"
              />
              <span class="text-[9px] font-extrabold text-primary/80 z-10">{{ volume === 11 ? '⚡' : '' }}</span>
            </button>
          </div>

          <!-- Book Us button (Desktop) -->
          <NuxtLink
            class="btn btn-primary btn-sm rounded-full px-5 font-bold shadow-md shadow-primary/20 hover:scale-105 transition-transform hidden sm:inline-flex"
            :to="localePath('/contact')"
            :title="t('nav.hints.book')"
          >
            {{ t('nav.book') }}
          </NuxtLink>

          <!-- Mobile Hamburger Toggle Button -->
          <button
            type="button"
            class="p-2 rounded-lg bg-base-200 text-primary border border-primary/30 hover:bg-base-300 dark:bg-neutral dark:hover:bg-neutral/80 focus:outline-none lg:hidden flex items-center justify-center cursor-pointer"
            aria-label="Meny"
            @click="isMobileMenuOpen = !isMobileMenuOpen"
          >
            <span v-if="!isMobileMenuOpen" class="text-lg leading-none">☰</span>
            <span v-else class="text-lg leading-none font-bold">✕</span>
          </button>
        </div>
      </div>

      <!-- Mobile Hamburger Dropdown Drawer -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-4"
      >
        <div
          v-if="isMobileMenuOpen"
          class="lg:hidden bg-base-100/95 border-b border-primary/20 px-6 py-6 space-y-4 shadow-2xl backdrop-blur-lg"
        >
          <nav class="flex flex-col space-y-3 font-semibold text-base">
            <NuxtLink
              :to="localePath('/gigs')"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 text-primary"
              :title="t('nav.hints.gigs')"
              @click="isMobileMenuOpen = false"
            >
              <span>📅 {{ t('nav.gigs') }}</span>
              <span class="text-xs text-base-content/40">›</span>
            </NuxtLink>
            <NuxtLink
              :to="localePath('/music')"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 text-primary"
              :title="t('nav.hints.music')"
              @click="isMobileMenuOpen = false"
            >
              <span>🎵 {{ t('nav.music') }}</span>
              <span class="text-xs text-base-content/40">›</span>
            </NuxtLink>
            <NuxtLink
              :to="localePath('/lyrics')"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 text-primary"
              @click="isMobileMenuOpen = false"
            >
              <span>📜 {{ t('nav.lyrics') }}</span>
              <span class="text-xs text-base-content/40">›</span>
            </NuxtLink>
            <NuxtLink
              :to="localePath('/about')"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 text-primary"
              :title="t('nav.hints.band')"
              @click="isMobileMenuOpen = false"
            >
              <span>🎸 {{ t('nav.band') }}</span>
              <span class="text-xs text-base-content/40">›</span>
            </NuxtLink>
            <NuxtLink
              :to="localePath('/gallery')"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 text-primary"
              :title="t('nav.hints.gallery')"
              @click="isMobileMenuOpen = false"
            >
              <span>📷 {{ t('nav.gallery') }}</span>
              <span class="text-xs text-base-content/40">›</span>
            </NuxtLink>
            <NuxtLink
              :to="localePath('/fancentral')"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 text-primary"
              :title="t('nav.hints.fan_central')"
              @click="isMobileMenuOpen = false"
            >
              <span>💨 {{ t('nav.fan_central') }}</span>
              <span class="text-xs text-base-content/40">›</span>
            </NuxtLink>
            <a
              href="https://det-7e-gunget.myspreadshop.se"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 text-base-content hover:text-primary"
              :title="t('nav.hints.merch')"
              @click="isMobileMenuOpen = false"
            >
              <span>👕 {{ t('nav.merch') }}</span>
              <span class="text-xs text-base-content/40">↗</span>
            </a>
            <NuxtLink
              :to="localePath('/epk')"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 text-primary"
              @click="isMobileMenuOpen = false"
            >
              <span>🎤 Presskit & Rider (EPK)</span>
              <span class="text-xs text-base-content/40">›</span>
            </NuxtLink>
            <NuxtLink
              :to="localePath('/contact')"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 text-secondary"
              :title="t('nav.hints.book')"
              @click="isMobileMenuOpen = false"
            >
              <span>✉️ {{ t('nav.book') }}</span>
              <span class="text-xs text-base-content/40">›</span>
            </NuxtLink>
            <NuxtLink
              to="/admin/login"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 text-base-content/70 border-t border-base-content/10 pt-3"
              @click="isMobileMenuOpen = false"
            >
              <span>🔒 {{ t('common.admin_login') }}</span>
              <span class="text-xs text-base-content/40">›</span>
            </NuxtLink>
          </nav>
        </div>
      </Transition>

      <!-- Volume 11 Toast / Banner Notification -->
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="showVolumeToast" class="bg-secondary text-secondary-content px-4 py-2 text-center text-xs sm:text-sm font-bold shadow-lg flex items-center justify-center gap-2">
          <span>🎸💥</span>
          <span>{{ t('volume_knob.max_msg') }}</span>
          <span>💥🎸</span>
        </div>
      </Transition>
    </header>
  </div>
</template>

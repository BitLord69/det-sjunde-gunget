<script setup lang="ts">
import { useCookieConsent } from '~/composables/useCookieConsent'

const { locale, setLocale, t } = useI18n()
const localePath = useLocalePath()
const colorMode = useColorMode()
const { openSettings: openCookieSettings } = useCookieConsent()

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

const { data: siteSettingsData } = await useFetch<{ newsletterEnabled: boolean }>('/api/settings', {
  default: () => ({ newsletterEnabled: false }),
})

// Newsletter subscription in footer
const newsletterEmail = ref('')
const newsletterSubmitted = ref(false)
const newsletterLoading = ref(false)
const newsletterError = ref('')

const handleNewsletter = async () => {
  if (!newsletterEmail.value) return
  newsletterLoading.value = true
  newsletterError.value = ''

  try {
    const res = await $fetch<{ success: boolean; message?: string }>('/api/newsletter', {
      method: 'POST',
      body: { email: newsletterEmail.value },
    })

    if (res.success) {
      newsletterSubmitted.value = true
    }
  } catch (err: any) {
    console.error('Newsletter subscription error:', err)
    newsletterError.value = err?.data?.statusMessage || 'Kunde inte registrera. Försök igen.'
  } finally {
    newsletterLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-base-100 text-base-content flex flex-col selection:bg-primary selection:text-neutral">
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
              :title="colorMode.value === 'dark' ? 'Växla till ljust läge (☀️)' : 'Växla till mörkt läge (🌙)'"
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
        <!-- Wordmark (Arvo font as specified) -->
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
              title="Klicka för att skruva upp volymen till 11!"
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
              <span>📜 Låttexter & ackord</span>
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
              <span>🔒 Admin-inloggning</span>
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

    <!-- Page Content -->
    <main class="flex-grow pb-24 lg:pb-0">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-primary/20 bg-neutral text-neutral-content pt-16 pb-28 lg:pb-12 px-6 lg:px-10 relative overflow-hidden">
      <div class="absolute inset-0 opacity-10 bg-[radial-gradient(#e2bd72_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      <div class="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
        <!-- Column 1: Brand & Logo -->
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <NuxtImg
              src="/media/brand/Logotyp_mini.webp"
              alt="Det 7:e Gunget logotyp"
              class="w-14 h-14 object-contain rounded-full shadow-lg border border-primary/30"
              loading="lazy"
            />
            <div>
              <span class="font-heading text-xl text-primary block leading-none">Det 7:e Gunget</span>
              <span class="text-xs text-secondary font-semibold">{{ t('tagline') }}</span>
            </div>
          </div>
          <p class="text-sm text-neutral-content/70 leading-relaxed">
            {{ t('hero.desc') }}
          </p>
          <!-- Social Links -->
          <div class="flex items-center gap-2.5">
            <a
              href="https://www.facebook.com/Detsjundegunget"
              target="_blank"
              rel="noopener noreferrer"
              class="w-9 h-9 rounded-full bg-base-200/60 border border-primary/20 flex items-center justify-center text-neutral-content/70 hover:text-primary hover:border-primary/50 hover:scale-110 transition-all"
              title="Facebook"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a
              href="https://www.instagram.com/det7egunget/"
              target="_blank"
              rel="noopener noreferrer"
              class="w-9 h-9 rounded-full bg-base-200/60 border border-primary/20 flex items-center justify-center text-neutral-content/70 hover:text-secondary hover:border-secondary/50 hover:scale-110 transition-all"
              title="Instagram"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a
              href="https://open.spotify.com/search/Det%207%3Ae%20Gunget"
              target="_blank"
              rel="noopener noreferrer"
              class="w-9 h-9 rounded-full bg-base-200/60 border border-primary/20 flex items-center justify-center text-neutral-content/70 hover:text-emerald-400 hover:border-emerald-500/50 hover:scale-110 transition-all"
              title="Spotify"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
            </a>
            <a
              href="https://www.youtube.com/@det7egunget"
              target="_blank"
              rel="noopener noreferrer"
              class="w-9 h-9 rounded-full bg-base-200/60 border border-primary/20 flex items-center justify-center text-neutral-content/70 hover:text-red-400 hover:border-red-500/50 hover:scale-110 transition-all"
              title="YouTube"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
          </div>
          <div class="text-xs font-mono text-neutral-content/50">
            © {{ new Date().getFullYear() }} Det 7:e Gunget. {{ t('footer.rights') }}
          </div>
        </div>

        <!-- Column 2: Quick Links -->
        <div>
          <h4 class="font-heading text-lg text-primary mb-4 border-b border-primary/20 pb-2">{{ t('footer.quick_links') }}</h4>
          <ul class="space-y-2 text-sm">
            <li><NuxtLink :to="localePath('/gigs')" class="hover:text-primary transition-colors">{{ t('nav.gigs') }} →</NuxtLink></li>
            <li><NuxtLink :to="localePath('/music')" class="hover:text-primary transition-colors">{{ t('nav.music') }} →</NuxtLink></li>
            <li><NuxtLink :to="localePath('/lyrics')" class="hover:text-primary transition-colors">📜 Låttexter & ackord →</NuxtLink></li>
            <li><NuxtLink :to="localePath('/about')" class="hover:text-primary transition-colors">{{ t('nav.band') }} →</NuxtLink></li>
            <li><NuxtLink :to="localePath('/gallery')" class="hover:text-primary transition-colors">{{ t('nav.gallery') }} →</NuxtLink></li>
            <li><NuxtLink :to="localePath('/fancentral')" class="hover:text-primary transition-colors">{{ t('nav.fan_central') }} →</NuxtLink></li>
            <li>
              <a
                href="https://det-7e-gunget.myspreadshop.se"
                target="_blank"
                rel="noopener noreferrer"
                class="hover:text-secondary text-primary/90 font-bold transition-colors inline-flex items-center gap-1"
              >
                <span>{{ t('footer.merch_shop') }}</span>
              </a>
            </li>
            <li class="pt-2 border-t border-primary/10">
              <NuxtLink :to="localePath('/privacy')" class="hover:text-primary transition-colors text-xs text-neutral-content/70 flex items-center gap-1">
                <span>🛡️</span> {{ t('footer.privacy_policy') }}
              </NuxtLink>
            </li>
            <li>
              <button
                type="button"
                class="hover:text-primary transition-colors text-xs text-neutral-content/70 flex items-center gap-1 focus:outline-none cursor-pointer"
                @click="openCookieSettings"
              >
                <span>🍪</span> {{ t('footer.cookie_settings') }}
              </button>
            </li>
          </ul>
        </div>

        <!-- Column 3: Booking & Info -->
        <div>
          <h4 class="font-heading text-lg text-primary mb-4 border-b border-primary/20 pb-2">{{ t('contact.title') }}</h4>
          <p class="text-sm text-neutral-content/75 mb-3 leading-relaxed">
            {{ t('contact.desc') }}
          </p>
          <div class="space-y-1.5 text-sm font-medium">
            <p><span class="text-secondary font-bold">{{ t('footer.email_label') }}:</span> kontakt@det7egunget.se</p>
            <p><span class="text-secondary font-bold">{{ t('footer.location_label') }}:</span> {{ t('footer.location_value') }}</p>
          </div>
          <div class="mt-4">
            <NuxtLink :to="localePath('/contact')" class="btn btn-outline btn-sm btn-primary rounded-full px-5">
              {{ t('contact.send_button') }}
            </NuxtLink>
          </div>
        </div>

        <!-- Column 4: Newsletter (if enabled) OR Band Live Banner (if newsletter is disabled) -->
        <div v-if="siteSettingsData?.newsletterEnabled" id="newsletter" class="bg-base-200/60 p-5 rounded-2xl border border-primary/20 shadow-inner">
          <h4 class="font-heading text-lg text-primary mb-2">{{ t('newsletter.title') }}</h4>
          <p class="text-xs text-neutral-content/70 mb-4">
            {{ t('newsletter.desc') }}
          </p>

          <form v-if="!newsletterSubmitted" class="space-y-2" @submit.prevent="handleNewsletter">
            <input
              v-model="newsletterEmail"
              type="email"
              required
              :placeholder="t('newsletter.placeholder')"
              class="input input-bordered input-sm w-full bg-neutral focus:border-primary text-xs"
            />
            <div v-if="newsletterError" class="text-error text-[11px] font-semibold">
              ⚠️ {{ newsletterError }}
            </div>
            <button
              type="submit"
              class="btn btn-primary btn-sm w-full font-bold shadow"
              :disabled="newsletterLoading"
            >
              {{ newsletterLoading ? '...' : t('newsletter.button') }}
            </button>
          </form>
          <div v-else class="text-emerald-400 text-xs font-bold bg-emerald-950/40 p-3 rounded-lg border border-emerald-500/30 flex items-center gap-2">
            <span>✓</span> {{ t('newsletter.success') }}
          </div>
        </div>

        <!-- Fallback Card when newsletter is disabled in admin settings -->
        <div v-else class="bg-base-200/50 p-6 rounded-2xl border border-primary/20 shadow-inner flex flex-col justify-between space-y-4">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono text-[10px] font-bold uppercase tracking-wider">
              <span>🎸</span> Det 7:e Gunget
            </div>
            <h4 class="font-heading text-lg text-primary font-bold">Äkta Skånsk Blues & Rock</h4>
            <p class="text-xs text-neutral-content/75 leading-relaxed">
              Följ oss på Facebook och Instagram för livedatum, replokalsklipp och anekdoter!
            </p>
          </div>
          <div class="flex items-center gap-2 pt-2 border-t border-primary/15">
            <NuxtLink :to="localePath('/gigs')" class="btn btn-xs btn-primary rounded-full font-bold">
              Turnédatum →
            </NuxtLink>
            <NuxtLink :to="localePath('/lyrics')" class="btn btn-xs btn-outline btn-secondary rounded-full font-bold">
              📜 Låttexter
            </NuxtLink>
          </div>
        </div>
      </div>
    </footer>

    <!-- Mobile Bottom Navigation Bar (Thumb-friendly per spec §4) -->
    <nav class="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-primary/20 bg-base-100/95 backdrop-blur-md p-1.5 lg:hidden shadow-2xl">
      <NuxtLink class="flex flex-col items-center gap-0.5 p-1 text-[10px] font-bold text-base-content/70 hover:text-primary" active-class="!text-primary" :to="localePath('/')">
        <span class="text-base">🏠</span>
        <span>{{ t('nav.home') }}</span>
      </NuxtLink>
      <NuxtLink class="flex flex-col items-center gap-0.5 p-1 text-[10px] font-bold text-base-content/70 hover:text-primary" active-class="!text-primary" :to="localePath('/gigs')">
        <span class="text-base">📅</span>
        <span>{{ t('nav.gigs') }}</span>
      </NuxtLink>
      <NuxtLink class="flex flex-col items-center gap-0.5 p-1 text-[10px] font-bold text-base-content/70 hover:text-primary" active-class="!text-primary" :to="localePath('/music')">
        <span class="text-base">🎵</span>
        <span>{{ t('nav.music') }}</span>
      </NuxtLink>
      <NuxtLink class="flex flex-col items-center gap-0.5 p-1 text-[10px] font-bold text-base-content/70 hover:text-primary" active-class="!text-primary" :to="localePath('/about')">
        <span class="text-base">🎸</span>
        <span>{{ t('nav.band') }}</span>
      </NuxtLink>
      <NuxtLink class="flex flex-col items-center gap-0.5 p-1 text-[10px] font-bold text-base-content/70 hover:text-primary" active-class="!text-primary" :to="localePath('/contact')">
        <span class="text-base">✉️</span>
        <span>{{ t('nav.book') }}</span>
      </NuxtLink>
    </nav>

    <!-- Global Cookie Consent Banner & Settings Modal -->
    <CookieConsentBanner />
  </div>
</template>

<style scoped>
.cursor-guitar {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ctext y='24' font-size='24'%3E🎸%3C/text%3E%3C/svg%3E") 4 4, pointer;
}
.cursor-fan {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='%23c87f3f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9 13a3 3 0 1 0 6 0a3 3 0 1 0 -6 0'/%3E%3Cpath d='M14.167 10.5c.722 -1.538 1.156 -3.043 1.303 -4.514c.22 -1.63 -.762 -2.986 -3.47 -2.986s-3.69 1.357 -3.47 2.986c.147 1.471 .581 2.976 1.303 4.514'/%3E%3Cpath d='M13.169 16.751c.97 1.395 2.057 2.523 3.257 3.386c1.3 1 2.967 .833 4.321 -1.512c1.354 -2.345 .67 -3.874 -.85 -4.498c-1.348 -.608 -2.868 -.985 -4.562 -1.128'/%3E%3Cpath d='M8.664 13c-1.693 .143 -3.213 .52 -4.56 1.128c-1.522 .623 -2.206 2.153 -.852 4.498s3.02 2.517 4.321 1.512c1.2 -.863 2.287 -1.991 3.258 -3.386'/%3E%3C/svg%3E") 16 16, pointer;
}
@keyframes fan-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.fan-spin {
  animation: fan-rotate 2s linear infinite;
}
</style>

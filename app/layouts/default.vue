<script setup lang="ts">
const { locale, setLocale, t } = useI18n()
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

const { data: gigsData } = await useFetch('/api/gigs')
const nextGig = computed(() => gigsData.value?.upcoming?.[0] || null)

// Newsletter subscription in footer
const newsletterEmail = ref('')
const newsletterSubmitted = ref(false)
const newsletterLoading = ref(false)

const handleNewsletter = async () => {
  if (!newsletterEmail.value) return
  newsletterLoading.value = true
  // Mock/API call simulation
  setTimeout(() => {
    newsletterLoading.value = false
    newsletterSubmitted.value = true
  }, 600)
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
          <NuxtLink v-if="nextGig" to="/gigs" class="hover:text-primary transition-colors flex items-center gap-1.5 truncate">
            <span class="text-secondary font-bold uppercase tracking-wider">Nästa gig:</span>
            <span class="text-primary font-bold">{{ nextGig.venue }}, {{ nextGig.city }}</span>
            <span class="text-base-content/60 hidden md:inline font-sans">
              ({{ new Date(nextGig.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }) }})
            </span>
            <span class="text-secondary font-bold">→</span>
          </NuxtLink>
          <span v-else class="text-base-content/80">
            <span class="text-primary font-bold">Det 7:e Gunget</span> • Blues, rock och lagom mycket oväsen
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
            to="/admin"
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
        <NuxtLink to="/" class="group flex items-center gap-3 focus:outline-none">
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
          <NuxtLink class="transition-colors hover:text-primary py-1 border-b-2 border-transparent hover:border-primary" active-class="!text-primary !border-primary" to="/gigs">
            {{ t('nav.gigs') }}
          </NuxtLink>
          <NuxtLink class="transition-colors hover:text-primary py-1 border-b-2 border-transparent hover:border-primary" active-class="!text-primary !border-primary" to="/music">
            {{ t('nav.music') }}
          </NuxtLink>
          <NuxtLink class="transition-colors hover:text-primary py-1 border-b-2 border-transparent hover:border-primary" active-class="!text-primary !border-primary" to="/about">
            {{ t('nav.band') }}
          </NuxtLink>
          <NuxtLink class="transition-colors hover:text-primary py-1 border-b-2 border-transparent hover:border-primary" active-class="!text-primary !border-primary" to="/gallery">
            {{ t('nav.gallery') }}
          </NuxtLink>
          <NuxtLink class="transition-colors hover:text-primary py-1 border-b-2 border-transparent hover:border-primary" active-class="!text-primary !border-primary" to="/fancentral">
            {{ t('nav.fan_central') }}
          </NuxtLink>
        </nav>

        <!-- Interactive Volume Knob, Booking CTA, and Hamburger Button -->
        <div class="flex items-center gap-3 sm:gap-5">
          <!-- Master Volume Knob -->
          <div class="flex items-center gap-2 bg-neutral/90 px-2.5 py-1.5 rounded-full border border-primary/20 shadow-inner">
            <div class="flex flex-col text-right">
              <span class="text-[9px] font-mono uppercase tracking-widest text-secondary font-bold">Volym</span>
              <span class="text-xs font-mono font-bold text-primary">{{ volume }}</span>
            </div>
            <button
              type="button"
              class="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#332b24] via-[#1a1512] to-[#0d0a08] border-2 border-primary/60 shadow flex items-center justify-center transition-transform hover:scale-110 active:scale-95 focus:outline-none cursor-pointer"
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
          <NuxtLink class="btn btn-primary btn-sm rounded-full px-5 font-bold shadow-md shadow-primary/20 hover:scale-105 transition-transform hidden sm:inline-flex" to="/contact">
            {{ t('nav.book') }}
          </NuxtLink>

          <!-- Mobile Hamburger Toggle Button -->
          <button
            type="button"
            class="p-2 rounded-lg bg-neutral text-primary border border-primary/25 hover:bg-neutral/80 focus:outline-none lg:hidden flex items-center justify-center"
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
              to="/gigs"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 text-primary"
              @click="isMobileMenuOpen = false"
            >
              <span>📅 {{ t('nav.gigs') }}</span>
              <span class="text-xs text-base-content/40">›</span>
            </NuxtLink>
            <NuxtLink
              to="/music"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 text-primary"
              @click="isMobileMenuOpen = false"
            >
              <span>🎵 {{ t('nav.music') }}</span>
              <span class="text-xs text-base-content/40">›</span>
            </NuxtLink>
            <NuxtLink
              to="/about"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 text-primary"
              @click="isMobileMenuOpen = false"
            >
              <span>🎸 {{ t('nav.band') }}</span>
              <span class="text-xs text-base-content/40">›</span>
            </NuxtLink>
            <NuxtLink
              to="/gallery"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 text-primary"
              @click="isMobileMenuOpen = false"
            >
              <span>📷 {{ t('nav.gallery') }}</span>
              <span class="text-xs text-base-content/40">›</span>
            </NuxtLink>
            <NuxtLink
              to="/fancentral"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 text-primary"
              @click="isMobileMenuOpen = false"
            >
              <span>💨 {{ t('nav.fan_central') }}</span>
              <span class="text-xs text-base-content/40">›</span>
            </NuxtLink>
            <NuxtLink
              to="/contact"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 text-secondary"
              @click="isMobileMenuOpen = false"
            >
              <span>✉️ {{ t('nav.book') }}</span>
              <span class="text-xs text-base-content/40">›</span>
            </NuxtLink>
            <NuxtLink
              to="/admin"
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
              <span class="text-xs text-secondary font-semibold">Blues & rock från hjärtat</span>
            </div>
          </div>
          <p class="text-sm text-neutral-content/70 leading-relaxed">
            Fyra herrar över 50. Blues, rock, egna alster, svettiga klassiker och precis lagom mycket oväsen.
          </p>
          <div class="text-xs font-mono text-neutral-content/50">
            © {{ new Date().getFullYear() }} Det 7:e Gunget. Alla rättigheter reserverade.
          </div>
        </div>

        <!-- Column 2: Quick Links -->
        <div>
          <h4 class="font-heading text-lg text-primary mb-4 border-b border-primary/20 pb-2">Sidor & navigering</h4>
          <ul class="space-y-2 text-sm">
            <li><NuxtLink to="/gigs" class="hover:text-primary transition-colors">Kommande gig & datum →</NuxtLink></li>
            <li><NuxtLink to="/music" class="hover:text-primary transition-colors">Lyssna i jukeboxen →</NuxtLink></li>
            <li><NuxtLink to="/about" class="hover:text-primary transition-colors">Möt bandet (Janis, Bosse, Marcus, Jonas) →</NuxtLink></li>
            <li><NuxtLink to="/gallery" class="hover:text-primary transition-colors">Scen- & replokalsgalleri →</NuxtLink></li>
            <li><NuxtLink to="/fancentral" class="hover:text-primary transition-colors">Fan Central (bordsfläktar & publik) →</NuxtLink></li>
          </ul>
        </div>

        <!-- Column 3: Booking & Info -->
        <div>
          <h4 class="font-heading text-lg text-primary mb-4 border-b border-primary/20 pb-2">Boka bandet</h4>
          <p class="text-sm text-neutral-content/75 mb-3 leading-relaxed">
            Vill du ha tungt sväng till din klubb, festival eller 50-årsfest?
          </p>
          <div class="space-y-1.5 text-sm font-medium">
            <p><span class="text-secondary font-bold">E-post:</span> kontakt@det7egunget.se</p>
            <p><span class="text-secondary font-bold">Plats:</span> Ängelholm & Skåne med omnejd</p>
          </div>
          <div class="mt-4">
            <NuxtLink to="/contact" class="btn btn-outline btn-sm btn-primary rounded-full px-5">
              Skicka bokningsförfrågan →
            </NuxtLink>
          </div>
        </div>

        <!-- Column 4: Newsletter -->
        <div id="newsletter" class="bg-base-200/60 p-5 rounded-2xl border border-primary/20 shadow-inner">
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
              class="input input-bordered input-sm w-full bg-neutral text-neutral-content focus:border-primary text-xs"
            />
            <button
              type="submit"
              class="btn btn-primary btn-sm w-full font-bold shadow"
              :disabled="newsletterLoading"
            >
              {{ newsletterLoading ? 'Skriver upp...' : t('newsletter.button') }}
            </button>
          </form>
          <div v-else class="text-emerald-400 text-xs font-bold bg-emerald-950/40 p-3 rounded-lg border border-emerald-500/30 flex items-center gap-2">
            <span>✓</span> {{ t('newsletter.success') }}
          </div>
        </div>
      </div>
    </footer>

    <!-- Mobile Bottom Navigation Bar (Thumb-friendly per spec §4) -->
    <nav class="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-primary/20 bg-base-100/95 backdrop-blur-md p-1.5 lg:hidden shadow-2xl">
      <NuxtLink class="flex flex-col items-center gap-0.5 p-1 text-[10px] font-bold text-base-content/70 hover:text-primary" active-class="!text-primary" to="/">
        <span class="text-base">🏠</span>
        <span>{{ t('nav.home') }}</span>
      </NuxtLink>
      <NuxtLink class="flex flex-col items-center gap-0.5 p-1 text-[10px] font-bold text-base-content/70 hover:text-primary" active-class="!text-primary" to="/gigs">
        <span class="text-base">📅</span>
        <span>{{ t('nav.gigs') }}</span>
      </NuxtLink>
      <NuxtLink class="flex flex-col items-center gap-0.5 p-1 text-[10px] font-bold text-base-content/70 hover:text-primary" active-class="!text-primary" to="/music">
        <span class="text-base">🎵</span>
        <span>{{ t('nav.music') }}</span>
      </NuxtLink>
      <NuxtLink class="flex flex-col items-center gap-0.5 p-1 text-[10px] font-bold text-base-content/70 hover:text-primary" active-class="!text-primary" to="/about">
        <span class="text-base">🎸</span>
        <span>{{ t('nav.band') }}</span>
      </NuxtLink>
      <NuxtLink class="flex flex-col items-center gap-0.5 p-1 text-[10px] font-bold text-base-content/70 hover:text-primary" active-class="!text-primary" to="/contact">
        <span class="text-base">✉️</span>
        <span>{{ t('nav.book') }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>

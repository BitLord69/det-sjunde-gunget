<script setup lang="ts">
import { useCookieConsent } from '~/composables/useCookieConsent'

const { t } = useI18n()
const localePath = useLocalePath()
const { openSettings: openCookieSettings } = useCookieConsent()

const { settingsData: siteSettingsData, contactEmail } = useSiteSettings()

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
    const errCode = err?.data?.data?.code
    if (errCode === 'INVALID_EMAIL') {
      newsletterError.value = t('newsletter.error_invalid')
    } else if (errCode === 'RATE_LIMIT_EXCEEDED') {
      newsletterError.value = t('newsletter.error_rate_limit')
    } else {
      newsletterError.value = t('newsletter.error_failed')
    }
  } finally {
    newsletterLoading.value = false
  }
}
</script>

<template>
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
            href="https://youtube.com/@det7egunget"
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
          <li><NuxtLink :to="localePath('/videos')" class="hover:text-primary transition-colors">{{ t('nav.videos') }} →</NuxtLink></li>
          <li><NuxtLink :to="localePath('/fancentral')" class="hover:text-primary transition-colors">{{ t('nav.fan_central') }} →</NuxtLink></li>
          <li><NuxtLink :to="localePath('/epk')" class="hover:text-primary transition-colors text-primary/90 font-medium">🎤 Presskit & Tech Rider →</NuxtLink></li>
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
          <p><span class="text-secondary font-bold">{{ t('footer.email_label') }}:</span> <a :href="`mailto:${contactEmail}`" class="hover:underline hover:text-primary transition-colors">{{ contactEmail }}</a></p>
          <p><span class="text-secondary font-bold">{{ t('footer.location_label') }}:</span> {{ t('footer.location_value') }}</p>
        </div>
        <div class="mt-4 flex items-center gap-2 flex-wrap">
          <NuxtLink :to="localePath('/contact')" class="btn btn-outline btn-sm btn-primary rounded-full px-5">
            {{ t('contact.send_button') }}
          </NuxtLink>
          <NuxtLink :to="localePath('/epk')" class="btn btn-ghost btn-xs text-secondary hover:text-primary transition-colors flex items-center gap-1">
            <span>🎤</span>
            <span>Tech Rider & EPK →</span>
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
          >
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
          <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono text-[10px] font-bold tracking-wider">
            <span>🎸</span> DET 7:e GUNGET
          </div>
          <h4 class="font-heading text-lg text-primary font-bold">{{ t('common.scenic_blues_rock') }}</h4>
          <p class="text-xs text-neutral-content/75 leading-relaxed">
            {{ t('common.footer_social_desc') }}
          </p>
        </div>
        <div class="flex items-center gap-2 pt-2 border-t border-primary/15">
          <NuxtLink :to="localePath('/gigs')" class="btn btn-xs btn-primary rounded-full font-bold">
            {{ t('common.tour_dates') }}
          </NuxtLink>
          <NuxtLink :to="localePath('/lyrics')" class="btn btn-xs btn-outline btn-secondary rounded-full font-bold">
            {{ t('common.lyrics_btn') }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </footer>
</template>

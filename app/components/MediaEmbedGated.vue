<script setup lang="ts">
import { useCookieConsent } from '~/composables/useCookieConsent'

const props = withDefaults(
  defineProps<{
    src: string
    title?: string
    provider?: string
    directUrl?: string
    iframeClass?: string
    containerClass?: string
  }>(),
  {
    title: '',
    provider: 'youtube',
    directUrl: '',
    iframeClass: 'w-full h-[180px] sm:h-[260px] border-0 rounded-2xl',
    containerClass: 'w-full rounded-2xl overflow-hidden bg-black/80 border border-primary/30 shadow-2xl flex items-center justify-center min-h-[180px] sm:min-h-[260px]',
  },
)

const { t } = useI18n()
const localePath = useLocalePath()
const { isConsentGiven, savePreferences } = useCookieConsent()

const enableMediaConsent = () => {
  savePreferences(true)
}

const providerName = computed(() => {
  const p = (props.provider || '').toLowerCase()
  if (p.includes('youtube')) return 'YouTube'
  if (p.includes('spotify')) return 'Spotify'
  if (p.includes('bandcamp')) return 'Bandcamp'
  return props.provider || 'Tredjepartsmedia'
})
</script>

<template>
  <div :class="containerClass">
    <!-- Consent granted: Render live iframe -->
    <iframe
      v-if="isConsentGiven('media')"
      :src="src"
      :title="title || `${providerName} spelare`"
      :class="iframeClass"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    />

    <!-- Consent needed: Privacy-friendly gated placeholder -->
    <div v-else class="p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto">
      <div class="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-2xl shadow-inner">
        <span v-if="providerName === 'YouTube'">🎬</span>
        <span v-else-if="providerName === 'Spotify'">🎧</span>
        <span v-else>🎵</span>
      </div>

      <div class="space-y-1">
        <h4 class="font-heading text-base sm:text-lg text-primary font-bold">
          {{ t('cookies.embed_gated_title', { provider: providerName }) }}
        </h4>
        <p class="text-xs sm:text-sm text-base-content/75 leading-relaxed">
          {{ t('cookies.embed_gated_desc', { provider: providerName }) }}
        </p>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          class="btn btn-primary btn-sm rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform cursor-pointer"
          @click="enableMediaConsent"
        >
          <span>✓</span> {{ t('cookies.allow_media_btn') }}
        </button>

        <a
          v-if="directUrl || src"
          :href="directUrl || src"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-outline btn-secondary btn-sm rounded-full font-medium"
        >
          <span>{{ t('cookies.open_external', { provider: providerName }) }}</span>
          <span class="text-xs">↗</span>
        </a>
      </div>

      <p class="text-[11px] text-base-content/50 pt-1">
        <NuxtLink :to="localePath('/privacy')" class="underline hover:text-primary transition-colors">
          {{ t('cookies.privacy_link') }}
        </NuxtLink>
      </p>
    </div>
  </div>
</template>

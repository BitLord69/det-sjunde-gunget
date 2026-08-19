<script setup lang="ts">
import { useCookieConsent } from '~/composables/useCookieConsent'

const { t } = useI18n()
const localePath = useLocalePath()
const {
  consent,
  hasAnswered,
  isSettingsOpen,
  acceptAll,
  acceptNecessaryOnly,
  savePreferences,
  openSettings,
  closeSettings,
} = useCookieConsent()

// Local modal state for toggling
const mediaToggle = ref(true)

watch(
  () => consent.value?.media,
  (val) => {
    mediaToggle.value = val ?? true
  },
  { immediate: true },
)

const handleSaveCustom = () => {
  savePreferences(mediaToggle.value)
}
</script>

<template>
  <ClientOnly>
    <div>
      <!-- 1. Floating Bottom Banner (Shown only if not answered yet) -->
      <Transition
        enter-active-class="transition duration-400 ease-out"
        enter-from-class="opacity-0 translate-y-8"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-300 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-8"
      >
        <div
          v-if="!hasAnswered"
          class="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 pointer-events-none"
        >
          <div class="max-w-4xl mx-auto bg-neutral/95 backdrop-blur-xl border-2 border-primary/40 rounded-3xl p-5 sm:p-7 shadow-[0_10px_40px_rgba(0,0,0,0.8)] pointer-events-auto text-neutral-content">
            <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <!-- Text Info -->
              <div class="space-y-1.5 flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-xl">🍪</span>
                  <h3 class="font-heading text-lg sm:text-xl text-primary font-bold">
                    {{ t('cookies.banner_title') }}
                  </h3>
                </div>
                <p class="text-xs sm:text-sm text-neutral-content/80 leading-relaxed font-sans">
                  {{ t('cookies.banner_desc') }}
                  <NuxtLink
                    :to="localePath('/privacy')"
                    class="text-primary hover:underline font-semibold ml-1 inline-flex items-center gap-0.5"
                  >
                    {{ t('cookies.read_policy') }} →
                  </NuxtLink>
                </p>
              </div>

              <!-- Action Buttons -->
              <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto flex-shrink-0 justify-end">
                <button
                  type="button"
                  class="btn btn-ghost btn-sm text-neutral-content/70 hover:text-primary hover:bg-base-200 text-xs font-semibold rounded-full px-3"
                  @click="openSettings"
                >
                  ⚙️ {{ t('cookies.btn_customize') }}
                </button>

                <button
                  type="button"
                  class="btn btn-outline btn-primary btn-sm rounded-full text-xs font-bold px-4"
                  @click="acceptNecessaryOnly"
                >
                  {{ t('cookies.btn_necessary_only') }}
                </button>

                <button
                  type="button"
                  class="btn btn-primary btn-sm rounded-full text-xs font-bold px-5 shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
                  @click="acceptAll"
                >
                  ✓ {{ t('cookies.btn_accept_all') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 2. Interactive Cookie Settings Modal -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="isSettingsOpen"
          class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          @click="closeSettings"
        >
          <div
            class="bg-neutral text-neutral-content border border-primary/40 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 relative"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-primary/20 pb-4">
              <div class="flex items-center gap-2.5">
                <span class="text-2xl">⚙️</span>
                <h3 class="font-heading text-xl sm:text-2xl text-primary font-bold">
                  {{ t('cookies.modal_title') }}
                </h3>
              </div>
              <button
                type="button"
                class="btn btn-circle btn-sm btn-ghost hover:bg-base-200 text-neutral-content/70 hover:text-primary"
                @click="closeSettings"
              >
                ✕
              </button>
            </div>

            <p class="text-xs sm:text-sm text-neutral-content/75 leading-relaxed">
              {{ t('cookies.modal_desc') }}
            </p>

            <!-- Cookie Categories List -->
            <div class="space-y-4">
              <!-- 1. Necessary (Always on) -->
              <div class="p-4 rounded-2xl bg-base-200/50 border border-primary/20 flex items-start justify-between gap-4">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-sm text-primary">{{ t('cookies.cat_necessary_title') }}</span>
                    <span class="badge badge-xs badge-primary font-mono font-bold">{{ t('cookies.always_active') }}</span>
                  </div>
                  <p class="text-xs text-neutral-content/70">
                    {{ t('cookies.cat_necessary_desc') }}
                  </p>
                </div>
                <div class="pt-1 text-primary">
                  <span class="text-lg">🔒</span>
                </div>
              </div>

              <!-- 2. Third-party Media (YouTube & Spotify) -->
              <div class="p-4 rounded-2xl bg-base-200/50 border border-primary/20 flex items-start justify-between gap-4">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-sm text-primary">{{ t('cookies.cat_media_title') }}</span>
                    <span class="text-xs text-secondary font-semibold">(YouTube & Spotify)</span>
                  </div>
                  <p class="text-xs text-neutral-content/70">
                    {{ t('cookies.cat_media_desc') }}
                  </p>
                </div>
                <div class="pt-1">
                  <input
                    v-model="mediaToggle"
                    type="checkbox"
                    class="toggle toggle-primary"
                  />
                </div>
              </div>
            </div>

            <!-- Footer Actions -->
            <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-primary/20">
              <NuxtLink
                :to="localePath('/privacy')"
                class="text-xs text-secondary hover:underline"
                @click="closeSettings"
              >
                {{ t('cookies.read_policy') }} →
              </NuxtLink>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="btn btn-outline btn-primary btn-sm rounded-full text-xs font-bold"
                  @click="handleSaveCustom"
                >
                  {{ t('cookies.btn_save_choices') }}
                </button>
                <button
                  type="button"
                  class="btn btn-primary btn-sm rounded-full text-xs font-bold"
                  @click="acceptAll"
                >
                  {{ t('cookies.btn_accept_all') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </ClientOnly>
</template>

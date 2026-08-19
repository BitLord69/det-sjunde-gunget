<script setup lang="ts">
import { useCookieConsent } from '~/composables/useCookieConsent'

const { t, locale } = useI18n()
const localePath = useLocalePath()

useSeoMeta({
  title: computed(() => `${t('privacy.seo_title')} | Det 7:e Gunget`),
  description: computed(() => t('privacy.seo_desc')),
  ogTitle: computed(() => `${t('privacy.seo_title')} | Det 7:e Gunget`),
  ogDescription: computed(() => t('privacy.seo_desc')),
  ogImage: '/media/og/og-share.jpg',
})

const {
  consent,
  hasAnswered,
  isConsentGiven,
  acceptAll,
  acceptNecessaryOnly,
  savePreferences,
  openSettings,
} = useCookieConsent()

const isMediaActive = computed(() => isConsentGiven('media'))

const toggleMediaConsent = () => {
  savePreferences(!isMediaActive.value)
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-12 lg:px-10 space-y-12">
    <!-- Header -->
    <div class="space-y-4 border-b border-primary/20 pb-8">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs font-mono text-secondary font-semibold">
        <span>🛡️</span>
        <span>{{ t('privacy.badge') }}</span>
      </div>
      <h1 class="font-heading text-3xl sm:text-5xl text-primary text-gritty">
        {{ t('privacy.title') }}
      </h1>
      <p class="text-base sm:text-lg text-base-content/80 leading-relaxed font-sans">
        {{ t('privacy.intro') }}
      </p>
      <div class="text-xs font-mono text-base-content/50">
        {{ t('privacy.last_updated') }}: {{ new Date().getFullYear() }}-08-19
      </div>
    </div>

    <!-- Live Interactive Cookie Preferences Card -->
    <div class="stage-card p-6 sm:p-8 rounded-3xl border-2 border-primary/30 bg-neutral/80 space-y-6 shadow-xl">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary/20 pb-4">
        <div>
          <h2 class="font-heading text-xl text-primary font-bold flex items-center gap-2">
            <span>🍪</span> {{ t('privacy.cookie_manager_title') }}
          </h2>
          <p class="text-xs text-neutral-content/70 mt-1">
            {{ t('privacy.cookie_manager_desc') }}
          </p>
        </div>
        <div class="flex-shrink-0">
          <span
            class="badge font-mono text-xs font-bold py-3 px-4"
            :class="isMediaActive ? 'badge-success text-success-content' : 'badge-warning text-warning-content'"
          >
            {{ isMediaActive ? t('privacy.status_media_allowed') : t('privacy.status_media_blocked') }}
          </span>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <!-- Necessary Cookies Info -->
        <div class="p-4 rounded-2xl bg-base-200/50 border border-primary/20 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-sm text-primary flex items-center gap-1.5">
              <span>🔒</span> {{ t('cookies.cat_necessary_title') }}
            </span>
            <span class="badge badge-xs badge-primary font-mono font-bold">{{ t('cookies.always_active') }}</span>
          </div>
          <p class="text-xs text-neutral-content/75 leading-relaxed">
            {{ t('privacy.necessary_summary') }}
          </p>
        </div>

        <!-- Third-party Media Toggle Card -->
        <div class="p-4 rounded-2xl bg-base-200/50 border border-primary/20 space-y-3 flex flex-col justify-between">
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-sm text-primary flex items-center gap-1.5">
                <span>🎬</span> {{ t('cookies.cat_media_title') }}
              </span>
              <input
                type="checkbox"
                :checked="isMediaActive"
                class="toggle toggle-primary toggle-sm"
                @change="toggleMediaConsent"
              />
            </div>
            <p class="text-xs text-neutral-content/75 leading-relaxed">
              {{ t('privacy.media_summary') }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          type="button"
          class="btn btn-outline btn-primary btn-sm rounded-full text-xs font-bold"
          @click="acceptNecessaryOnly"
        >
          {{ t('cookies.btn_necessary_only') }}
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm rounded-full text-xs font-bold shadow"
          @click="acceptAll"
        >
          ✓ {{ t('cookies.btn_accept_all') }}
        </button>
      </div>
    </div>

    <!-- Policy Sections Accordion / Content -->
    <div class="space-y-10 text-sm sm:text-base text-base-content/85 leading-relaxed font-sans">
      <!-- 1. Data Controller -->
      <section class="space-y-3">
        <h2 class="font-heading text-2xl text-primary font-bold flex items-center gap-2">
          <span>1.</span> {{ t('privacy.section1_title') }}
        </h2>
        <p>
          {{ t('privacy.section1_p1') }}
        </p>
        <div class="p-4 rounded-2xl bg-base-200/60 border border-primary/20 font-mono text-xs space-y-1">
          <p><strong class="text-primary">{{ t('privacy.controller_name') }}:</strong> Det 7:e Gunget</p>
          <p><strong class="text-primary">{{ t('footer.email_label') }}:</strong> kontakt@det7egunget.se</p>
          <p><strong class="text-primary">{{ t('footer.location_label') }}:</strong> Ängelholm & Skåne, Sverige</p>
        </div>
      </section>

      <!-- 2. Contact Form & Inquiries -->
      <section class="space-y-3">
        <h2 class="font-heading text-2xl text-primary font-bold flex items-center gap-2">
          <span>2.</span> {{ t('privacy.section2_title') }}
        </h2>
        <p>
          {{ t('privacy.section2_p1') }}
        </p>
        <ul class="list-disc pl-5 space-y-1.5 text-sm">
          <li><strong>{{ t('privacy.data_collected_label') }}:</strong> {{ t('privacy.section2_list_items') }}</li>
          <li><strong>{{ t('privacy.purpose_label') }}:</strong> {{ t('privacy.section2_purpose') }}</li>
          <li><strong>{{ t('privacy.legal_basis_label') }}:</strong> {{ t('privacy.section2_legal_basis') }}</li>
          <li><strong>{{ t('privacy.retention_label') }}:</strong> {{ t('privacy.section2_retention') }}</li>
        </ul>
      </section>

      <!-- 3. Newsletter Subscriptions -->
      <section class="space-y-3">
        <h2 class="font-heading text-2xl text-primary font-bold flex items-center gap-2">
          <span>3.</span> {{ t('privacy.section3_title') }}
        </h2>
        <p>
          {{ t('privacy.section3_p1') }}
        </p>
        <ul class="list-disc pl-5 space-y-1.5 text-sm">
          <li><strong>{{ t('privacy.data_collected_label') }}:</strong> {{ t('privacy.section3_list_items') }}</li>
          <li><strong>{{ t('privacy.purpose_label') }}:</strong> {{ t('privacy.section3_purpose') }}</li>
          <li><strong>{{ t('privacy.legal_basis_label') }}:</strong> {{ t('privacy.section3_legal_basis') }}</li>
          <li><strong>{{ t('privacy.unsubscribe_label') }}:</strong> {{ t('privacy.section3_unsubscribe') }}</li>
        </ul>
      </section>

      <!-- 4. Cookies & Storage Detail Table -->
      <section class="space-y-4">
        <h2 class="font-heading text-2xl text-primary font-bold flex items-center gap-2">
          <span>4.</span> {{ t('privacy.section4_title') }}
        </h2>
        <p>
          {{ t('privacy.section4_p1') }}
        </p>

        <div class="overflow-x-auto rounded-2xl border border-primary/20 bg-base-200/40">
          <table class="table table-sm w-full text-xs">
            <thead class="bg-base-300/80 text-primary font-mono uppercase">
              <tr>
                <th>{{ t('privacy.table_name') }}</th>
                <th>{{ t('privacy.table_type') }}</th>
                <th>{{ t('privacy.table_duration') }}</th>
                <th>{{ t('privacy.table_purpose') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-primary/10">
              <tr>
                <td class="font-mono font-bold text-secondary">i18n_redirected</td>
                <td>{{ t('cookies.cat_necessary_title') }}</td>
                <td>1 {{ t('privacy.year') }}</td>
                <td>{{ t('privacy.cookie_i18n_desc') }}</td>
              </tr>
              <tr>
                <td class="font-mono font-bold text-secondary">gunget_cookie_consent</td>
                <td>{{ t('cookies.cat_necessary_title') }}</td>
                <td>1 {{ t('privacy.year') }}</td>
                <td>{{ t('privacy.cookie_consent_desc') }}</td>
              </tr>
              <tr>
                <td class="font-mono font-bold text-secondary">gunget-glasses-mode</td>
                <td>Local Storage</td>
                <td>{{ t('privacy.persistent') }}</td>
                <td>{{ t('privacy.cookie_glasses_desc') }}</td>
              </tr>
              <tr>
                <td class="font-mono font-bold text-secondary">YouTube / Spotify</td>
                <td>{{ t('cookies.cat_media_title') }}</td>
                <td>{{ t('privacy.third_party_duration') }}</td>
                <td>{{ t('privacy.cookie_embeds_desc') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 5. GDPR Rights -->
      <section class="space-y-3">
        <h2 class="font-heading text-2xl text-primary font-bold flex items-center gap-2">
          <span>5.</span> {{ t('privacy.section5_title') }}
        </h2>
        <p>
          {{ t('privacy.section5_p1') }}
        </p>
        <div class="grid sm:grid-cols-2 gap-3 pt-2">
          <div class="p-3.5 rounded-xl bg-base-200/50 border border-primary/20 space-y-1">
            <h3 class="font-bold text-xs sm:text-sm text-primary">🔍 {{ t('privacy.right_access') }}</h3>
            <p class="text-xs text-base-content/75">{{ t('privacy.right_access_desc') }}</p>
          </div>
          <div class="p-3.5 rounded-xl bg-base-200/50 border border-primary/20 space-y-1">
            <h3 class="font-bold text-xs sm:text-sm text-primary">✏️ {{ t('privacy.right_rectification') }}</h3>
            <p class="text-xs text-base-content/75">{{ t('privacy.right_rectification_desc') }}</p>
          </div>
          <div class="p-3.5 rounded-xl bg-base-200/50 border border-primary/20 space-y-1">
            <h3 class="font-bold text-xs sm:text-sm text-primary">🗑️ {{ t('privacy.right_erasure') }}</h3>
            <p class="text-xs text-base-content/75">{{ t('privacy.right_erasure_desc') }}</p>
          </div>
          <div class="p-3.5 rounded-xl bg-base-200/50 border border-primary/20 space-y-1">
            <h3 class="font-bold text-xs sm:text-sm text-primary">⚖️ {{ t('privacy.right_complaint') }}</h3>
            <p class="text-xs text-base-content/75">{{ t('privacy.right_complaint_desc') }}</p>
          </div>
        </div>
      </section>

      <!-- Contact CTA -->
      <div class="p-6 rounded-2xl bg-primary/10 border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
        <div class="space-y-1 text-center sm:text-left">
          <h3 class="font-heading text-lg text-primary font-bold">{{ t('privacy.questions_title') }}</h3>
          <p class="text-xs sm:text-sm text-base-content/80">{{ t('privacy.questions_desc') }}</p>
        </div>
        <NuxtLink :to="localePath('/contact')" class="btn btn-primary btn-sm rounded-full px-6 font-bold shadow">
          {{ t('privacy.contact_button') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

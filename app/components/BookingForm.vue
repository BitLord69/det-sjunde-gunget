<script setup lang="ts">
const { t } = useI18n()

interface Props {
  compact?: boolean
}

withDefaults(defineProps<Props>(), {
  compact: false,
})

const form = reactive({
  name: '',
  email: '',
  phone: '',
  eventType: 'Klubb / Pub',
  date: '',
  location: '',
  message: '',
  honeypot: '',
})

const formSubmitted = ref(false)
const formLoading = ref(false)
const formError = ref('')

const submitBooking = async () => {
  if (form.honeypot) return // bot trap
  formLoading.value = true
  formError.value = ''

  try {
    const res = await $fetch<{ success: boolean; message?: string }>('/api/contact', {
      method: 'POST',
      body: { ...form },
    })

    if (res?.success) {
      formSubmitted.value = true
    } else {
      formError.value = res?.message || 'Ett fel uppstod när förfrågan skickades.'
    }
  } catch (err: any) {
    console.error('[BookingForm] Error:', err)
    formError.value = err?.data?.statusMessage || err?.data?.message || 'Kunde inte skicka förfrågan just nu. Prova igen eller mejla oss direkt.'
  } finally {
    formLoading.value = false
  }
}

const resetForm = () => {
  form.name = ''
  form.email = ''
  form.phone = ''
  form.eventType = 'Klubb / Pub'
  form.date = ''
  form.location = ''
  form.message = ''
  form.honeypot = ''
  formSubmitted.value = false
  formError.value = ''
}
</script>

<template>
  <div class="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-base-300/80 via-base-200/90 to-base-300/80 dark:from-[#140e0b] dark:to-[#0a0705] border-2 border-primary/35 shadow-xl">
    <form v-if="!formSubmitted" class="space-y-4" @submit.prevent="submitBooking">
      <!-- Honeypot (bot trap) -->
      <input v-model="form.honeypot" type="text" class="hidden" tabindex="-1" autocomplete="off" />

      <!-- Error Alert -->
      <div v-if="formError" class="p-3 bg-error/20 border border-error/40 text-error text-xs rounded-xl">
        {{ formError }}
      </div>

      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
          {{ t('contact.name_label') }} *
        </label>
        <input
          v-model="form.name"
          type="text"
          required
          :placeholder="t('contact.name_placeholder')"
          class="input input-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 focus:border-primary text-sm shadow-inner"
        />
      </div>

      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
          {{ t('contact.email_label') }} *
        </label>
        <input
          v-model="form.email"
          type="email"
          required
          placeholder="namn@exempel.se"
          class="input input-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 focus:border-primary text-sm shadow-inner"
        />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
            {{ t('contact.event_type_label') }}
          </label>
          <select v-model="form.eventType" class="select select-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 focus:border-primary text-sm shadow-inner">
            <option value="Klubb / Pub">{{ t('contact.event_club') }}</option>
            <option value="Festival">{{ t('contact.event_festival') }}</option>
            <option value="Privatfest">{{ t('contact.event_private') }}</option>
            <option value="Företagsevent">{{ t('contact.event_corporate') }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
            {{ t('contact.date_label') }}
          </label>
          <input
            v-model="form.date"
            type="date"
            class="input input-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 focus:border-primary text-sm shadow-inner"
          />
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
          {{ t('contact.message_label') }} *
        </label>
        <textarea
          v-model="form.message"
          required
          rows="4"
          :placeholder="t('contact.message_placeholder')"
          class="textarea textarea-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 focus:border-primary text-sm shadow-inner"
        />
      </div>

      <button
        type="submit"
        class="btn btn-primary w-full font-bold shadow-lg shadow-primary/20 text-base cursor-pointer"
        :class="formLoading ? 'loading' : ''"
        :disabled="formLoading"
      >
        <span>{{ formLoading ? 'Skickar...' : t('contact.send_button') }}</span>
      </button>
    </form>

    <div v-else class="text-center py-10 space-y-4">
      <span class="text-5xl">🎸</span>
      <h3 class="text-2xl font-heading text-primary font-bold">{{ t('contact.success_msg') }}</h3>
      <p class="text-xs text-base-content/75 max-w-sm mx-auto">
        Tack för din förfrågan! Vi återkopplar så snart vi tagit av oss gitarrerna.
      </p>
      <button type="button" class="btn btn-outline btn-primary btn-sm rounded-full mt-2" @click="resetForm">
        Skicka en till förfrågan
      </button>
    </div>
  </div>
</template>

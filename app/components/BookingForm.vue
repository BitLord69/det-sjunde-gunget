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
  venue: '',
  streetAddress: '',
  postalCode: '',
  city: '',
  website: '',
  message: '',
  honeypot: '',
})

const formSubmitted = ref(false)
const formLoading = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})

const clearFieldError = (fieldName: string) => {
  if (fieldErrors.value[fieldName]) {
    delete fieldErrors.value[fieldName]
  }
  if (Object.keys(fieldErrors.value).length === 0) {
    formError.value = ''
  }
}

const submitBooking = async () => {
  if (form.honeypot) return // bot trap
  formLoading.value = true
  formError.value = ''
  fieldErrors.value = {}

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
    fieldErrors.value = {}

    // Extrahera fältspecifika fel från serverns Zod-validering
    const rawFieldErrors = err?.data?.data?.fieldErrors
    if (rawFieldErrors && typeof rawFieldErrors === 'object') {
      const messages: string[] = []
      for (const [key, list] of Object.entries(rawFieldErrors)) {
        if (Array.isArray(list) && list.length > 0) {
          fieldErrors.value[key] = String(list[0])
          messages.push(String(list[0]))
        }
      }
      if (messages.length > 0) {
        formError.value = messages.join('. ')
        return
      }
    }

    const errCode = err?.data?.data?.code
    if (errCode === 'RATE_LIMIT_EXCEEDED') {
      formError.value = t('contact.error_rate_limit')
    } else if (errCode === 'BOOKING_SAVE_FAILED') {
      formError.value = t('contact.error_failed')
    } else {
      formError.value = err?.data?.message || t('contact.error_validation')
    }
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
  form.venue = ''
  form.streetAddress = ''
  form.postalCode = ''
  form.city = ''
  form.website = ''
  form.message = ''
  form.honeypot = ''
  formSubmitted.value = false
  formError.value = ''
  fieldErrors.value = {}
}
</script>

<template>
  <div class="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-base-300/80 via-base-200/90 to-base-300/80 dark:from-[#140e0b] dark:to-[#0a0705] border-2 border-primary/35 shadow-xl">
    <form v-if="!formSubmitted" class="space-y-4" @submit.prevent="submitBooking">
      <!-- Honeypot (bot trap) -->
      <input v-model="form.honeypot" type="text" class="hidden" tabindex="-1" autocomplete="off" >

      <!-- Error Alert -->
      <div v-if="formError" class="p-3.5 bg-error/15 border-2 border-error/50 text-error text-xs rounded-xl flex items-center gap-2 font-bold shadow-lg">
        <span class="text-base">⚠️</span>
        <span>{{ formError }}</span>
      </div>

      <!-- Namn -->
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
          {{ t('contact.name_label') }}
        </label>
        <input
          v-model="form.name"
          type="text"
          required
          :placeholder="t('contact.name_placeholder')"
          class="input input-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 focus:border-primary text-sm shadow-inner transition-colors"
          :class="{ '!border-error focus:!border-error ring-1 ring-error/50': fieldErrors.name }"
          @input="clearFieldError('name')"
        >
        <p v-if="fieldErrors.name" class="text-error text-xs font-semibold mt-1 flex items-center gap-1">
          <span>⚠️</span> {{ fieldErrors.name }}
        </p>
      </div>

      <!-- E-post & Telefon -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
            {{ t('contact.email_label') }}
          </label>
          <input
            v-model="form.email"
            type="email"
            required
            :placeholder="t('contact.email_placeholder')"
            class="input input-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 focus:border-primary text-sm shadow-inner transition-colors"
            :class="{ '!border-error focus:!border-error ring-1 ring-error/50': fieldErrors.email }"
            @input="clearFieldError('email')"
          >
          <p v-if="fieldErrors.email" class="text-error text-xs font-semibold mt-1 flex items-center gap-1">
            <span>⚠️</span> {{ fieldErrors.email }}
          </p>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
            {{ t('contact.phone_label') }}
          </label>
          <input
            v-model="form.phone"
            type="tel"
            :placeholder="t('contact.phone_placeholder')"
            class="input input-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 focus:border-primary text-sm shadow-inner transition-colors"
            :class="{ '!border-error focus:!border-error ring-1 ring-error/50': fieldErrors.phone }"
            @input="clearFieldError('phone')"
          >
          <p v-if="fieldErrors.phone" class="text-error text-xs font-semibold mt-1 flex items-center gap-1">
            <span>⚠️</span> {{ fieldErrors.phone }}
          </p>
        </div>
      </div>

      <!-- Typ av evenemang & Önskat datum -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            :placeholder="t('contact.date_placeholder')"
            class="input input-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 focus:border-primary text-sm shadow-inner"
          >
        </div>
      </div>

      <!-- Adresssektion: Lokal / Ställe & Gatuadress -->
      <div class="pt-2 border-t border-primary/20 space-y-3">
        <span class="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
          <IconMapPin class="w-4 h-4 text-primary" /> {{ t('contact.address_section_title') }}
        </span>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
            {{ t('contact.venue_label') }}
          </label>
          <input
            v-model="form.venue"
            type="text"
            :placeholder="t('contact.venue_placeholder')"
            class="input input-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 focus:border-primary text-sm shadow-inner transition-colors"
            :class="{ '!border-error focus:!border-error ring-1 ring-error/50': fieldErrors.venue }"
            @input="clearFieldError('venue')"
          >
          <p v-if="fieldErrors.venue" class="text-error text-xs font-semibold mt-1 flex items-center gap-1">
            <span>⚠️</span> {{ fieldErrors.venue }}
          </p>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
            {{ t('contact.street_address_label') }}
          </label>
          <input
            v-model="form.streetAddress"
            type="text"
            :placeholder="t('contact.street_address_placeholder')"
            class="input input-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 focus:border-primary text-sm shadow-inner transition-colors"
            :class="{ '!border-error focus:!border-error ring-1 ring-error/50': fieldErrors.streetAddress }"
            @input="clearFieldError('streetAddress')"
          >
          <p v-if="fieldErrors.streetAddress" class="text-error text-xs font-semibold mt-1 flex items-center gap-1">
            <span>⚠️</span> {{ fieldErrors.streetAddress }}
          </p>
        </div>

        <!-- Postnummer & Ort -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
              {{ t('contact.postal_code_label') }}
            </label>
            <input
              v-model="form.postalCode"
              type="text"
              :placeholder="t('contact.postal_code_placeholder')"
              class="input input-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 focus:border-primary text-sm shadow-inner transition-colors"
              :class="{ '!border-error focus:!border-error ring-1 ring-error/50': fieldErrors.postalCode }"
              @input="clearFieldError('postalCode')"
            >
            <p v-if="fieldErrors.postalCode" class="text-error text-xs font-semibold mt-1 flex items-center gap-1">
              <span>⚠️</span> {{ fieldErrors.postalCode }}
            </p>
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
              {{ t('contact.city_label') }}
            </label>
            <input
              v-model="form.city"
              type="text"
              :placeholder="t('contact.city_placeholder')"
              class="input input-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 focus:border-primary text-sm shadow-inner transition-colors"
              :class="{ '!border-error focus:!border-error ring-1 ring-error/50': fieldErrors.city }"
              @input="clearFieldError('city')"
            >
            <p v-if="fieldErrors.city" class="text-error text-xs font-semibold mt-1 flex items-center gap-1">
              <span>⚠️</span> {{ fieldErrors.city }}
            </p>
          </div>
        </div>
      </div>

      <!-- Webbadress / URL -->
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
          {{ t('contact.website_label') }}
        </label>
        <input
          v-model="form.website"
          type="text"
          :placeholder="t('contact.website_placeholder')"
          class="input input-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 focus:border-primary text-sm shadow-inner transition-colors"
          :class="{ '!border-error focus:!border-error ring-1 ring-error/50': fieldErrors.website }"
          @input="clearFieldError('website')"
        >
        <p v-if="fieldErrors.website" class="text-error text-xs font-semibold mt-1 flex items-center gap-1">
          <span>⚠️</span> {{ fieldErrors.website }}
        </p>
      </div>

      <!-- Meddelande -->
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
          {{ t('contact.message_label') }}
        </label>
        <textarea
          v-model="form.message"
          required
          rows="4"
          :placeholder="t('contact.message_placeholder')"
          class="textarea textarea-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 focus:border-primary text-sm shadow-inner transition-colors"
          :class="{ '!border-error focus:!border-error ring-1 ring-error/50': fieldErrors.message }"
          @input="clearFieldError('message')"
        />
        <p v-if="fieldErrors.message" class="text-error text-xs font-semibold mt-1 flex items-center gap-1">
          <span>⚠️</span> {{ fieldErrors.message }}
        </p>
      </div>

      <button
        type="submit"
        class="btn btn-primary w-full font-bold shadow-lg shadow-primary/20 text-base cursor-pointer"
        :class="formLoading ? 'loading' : ''"
        :disabled="formLoading"
      >
        <span>{{ formLoading ? t('contact.submitting') : t('contact.send_button') }}</span>
      </button>
    </form>

    <div v-else class="text-center py-10 space-y-4">
      <span class="text-5xl">🎸</span>
      <h3 class="text-2xl font-heading text-primary font-bold">{{ t('contact.success_msg') }}</h3>
      <p class="text-xs text-base-content/75 max-w-sm mx-auto">
        {{ t('contact.success_subtext') }}
      </p>
      <button type="button" class="btn btn-outline btn-primary btn-sm rounded-full mt-2 cursor-pointer" @click="resetForm">
        {{ t('contact.send_another') }}
      </button>
    </div>
  </div>
</template>

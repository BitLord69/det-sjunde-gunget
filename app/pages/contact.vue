<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: 'Boka Oss & Kontakt | Det 7:e Gunget',
  description: 'Boka Det 7:e Gunget till festival, pub, klubb eller privatfest. Kontaktformulär, teknisk rider och bokningsinfo.',
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

const submitForm = async () => {
  if (form.honeypot) return
  formLoading.value = true
  formError.value = ''

  try {
    const res = await $fetch<{ success: boolean; message?: string }>('/api/contact', {
      method: 'POST',
      body: { ...form },
    })

    if (res.success) {
      formSubmitted.value = true
    }
  } catch (err: any) {
    console.error('Contact form submission error:', err)
    formError.value = err?.data?.statusMessage || err?.data?.message || 'Ett fel uppstod när förfrågan skickades. Vänligen kontrollera uppgifterna eller mejla oss direkt.'
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
  <div class="mx-auto max-w-7xl px-6 py-12 lg:px-10 space-y-16">
    <!-- Header -->
    <div class="space-y-4 max-w-3xl mb-14">
      <h1 class="font-heading text-4xl sm:text-6xl text-primary text-gritty pb-2">
        {{ t('contact.title') }}
      </h1>
      <p class="text-base sm:text-lg text-base-content/80 leading-relaxed font-normal">
        {{ t('contact.desc') }}
      </p>
    </div>

    <div class="grid lg:grid-cols-[1fr_1.1fr] gap-12 items-start">
      <!-- Left: Contact Details & Tech Rider -->
      <div class="space-y-8">
        <div class="rounded-2xl p-8 bg-gradient-to-b from-base-200/90 via-base-100 to-base-200 dark:from-[#2a1d15] dark:via-[#1a120c] dark:to-[#0d0907] border-4 border-primary/40 shadow-xl space-y-6">
          <h2 class="font-heading text-2xl text-primary font-bold">Kontaktuppgifter</h2>
          
          <div class="space-y-4 text-sm font-medium">
            <div class="flex items-start gap-3">
              <span class="text-xl">✉️</span>
              <div>
                <span class="text-xs text-base-content/60 uppercase font-bold block">Bokningsmejl</span>
                <span class="text-primary font-bold">kontakt@det7egunget.se</span>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <span class="text-xl">📍</span>
              <div>
                <span class="text-xs text-base-content/60 uppercase font-bold block">Område</span>
                <span>Ängelholm & Skåne med omnejd (hela landet på förfrågan)</span>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <span class="text-xl">🎸</span>
              <div>
                <span class="text-xs text-base-content/60 uppercase font-bold block">Sättning</span>
                <span>4 musiker: sång/munspel, elgitarr, elbas, trummor</span>
              </div>
            </div>

            <!-- Social channels -->
            <div class="pt-4 border-t border-primary/20">
              <span class="text-xs text-base-content/60 uppercase font-bold block mb-2">Följ & Lyssna</span>
              <div class="flex items-center gap-2">
                <a
                  href="https://www.facebook.com/Detsjundegunget"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-xs btn-outline btn-primary rounded-full gap-1 text-xs"
                >
                  Facebook ↗
                </a>
                <a
                  href="https://www.instagram.com/det7egunget/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-xs btn-outline btn-secondary rounded-full gap-1 text-xs"
                >
                  Instagram ↗
                </a>
                <a
                  href="https://open.spotify.com/search/Det%207%3Ae%20Gunget"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-xs btn-outline rounded-full gap-1 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10"
                  title="Kommer snart på Spotify"
                >
                  Spotify ↗
                </a>
                <a
                  href="https://www.youtube.com/@det7egunget"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-xs btn-outline rounded-full gap-1 text-xs text-red-600 dark:text-red-400 border-red-500/40 hover:bg-red-500/10"
                >
                  YouTube ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Tech Rider Card -->
        <div class="rounded-2xl p-8 bg-gradient-to-b from-base-200/90 via-base-100 to-base-200 dark:from-[#2a1d15] dark:via-[#1a120c] dark:to-[#0d0907] border-4 border-secondary/40 shadow-xl space-y-4">
          <div class="flex items-center gap-2 text-secondary font-bold text-xs uppercase tracking-wider">
            <span>⚡</span> Teknisk rider
          </div>
          <h3 class="font-heading text-xl text-primary font-bold">Det enkla bandet utan primadonnor</h3>
          <p class="text-xs text-base-content/80 leading-relaxed">
            Vi har med oss full backline (förstärkare, trumset, mikrofoner) och kan även ta med eget PA-ljudsystem vid mindre tillställningar. Allt vi behöver är:
          </p>
          <ul class="space-y-1.5 text-xs text-base-content/75 list-disc list-inside">
            <li>230V jordat eluttag nära scenen</li>
            <li>En scen eller yta på minst ca 4x3 meter</li>
            <li>Kaffe, vatten och en trevlig stämning!</li>
          </ul>
        </div>
      </div>

      <!-- Right: Booking Form -->
      <div class="rounded-3xl sm:rounded-[36px] p-8 sm:p-10 bg-gradient-to-b from-base-300/80 via-base-200/90 to-base-300/80 dark:from-[#140e0b] dark:to-[#0a0705] border-2 border-primary/35 shadow-2xl">
        <h2 class="font-heading text-2xl text-primary font-bold mb-6">Skicka en förfrågan</h2>

        <form v-if="!formSubmitted" class="space-y-4" @submit.prevent="submitForm">
          <input v-model="form.honeypot" type="text" class="hidden" tabindex="-1" autocomplete="off" />

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Namn / kontaktperson *</label>
            <input
              v-model="form.name"
              type="text"
              required
              placeholder="Ditt fullständiga namn"
              class="input input-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 text-sm focus:border-primary shadow-inner"
            />
          </div>

          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">E-postadress *</label>
              <input
                v-model="form.email"
                type="email"
                required
                placeholder="namn@exempel.se"
                class="input input-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 text-sm focus:border-primary shadow-inner"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Telefonnummer</label>
              <input
                v-model="form.phone"
                type="tel"
                placeholder="070-123 45 67"
                class="input input-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 text-sm focus:border-primary shadow-inner"
              />
            </div>
          </div>

          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Typ av event</label>
              <select v-model="form.eventType" class="select select-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 text-sm focus:border-primary shadow-inner">
                <option>Klubb / pub</option>
                <option>Festival</option>
                <option>Privatfest / 50-årsfest</option>
                <option>Företagsevent</option>
                <option>Annat</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Önskat datum</label>
              <input
                v-model="form.date"
                type="date"
                class="input input-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 text-sm focus:border-primary shadow-inner"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Plats / stad</label>
            <input
              v-model="form.location"
              type="text"
              placeholder="T.ex. Helsingborg, Malmö, Halmstad..."
              class="input input-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 text-sm focus:border-primary shadow-inner"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Meddelande / detaljer *</label>
            <textarea
              v-model="form.message"
              required
              rows="4"
              placeholder="Berätta lite om spelstället, publik, förväntad speltid..."
              class="textarea textarea-bordered w-full bg-base-100/95 dark:bg-black/80 border-primary/40 text-sm focus:border-primary shadow-inner"
            />
          </div>

          <div v-if="formError" class="p-3 bg-error/10 border border-error/30 rounded-xl text-error text-xs font-semibold">
            ⚠️ {{ formError }}
          </div>

          <button
            type="submit"
            class="btn btn-primary w-full font-bold shadow-lg shadow-primary/20 text-base cursor-pointer"
            :disabled="formLoading"
          >
            {{ formLoading ? 'Skickar...' : 'Skicka förfrågan →' }}
          </button>
        </form>

        <div v-else class="text-center py-12 space-y-4">
          <span class="text-5xl">🎸</span>
          <h3 class="text-2xl font-heading text-primary font-bold">Tack för er förfrågan!</h3>
          <p class="text-sm text-base-content/80 max-w-sm mx-auto">
            Vi har tagit emot era uppgifter och en bekräftelse har skickats till er e-post. Vi återkopplar inom kort!
          </p>
          <button
            type="button"
            class="btn btn-sm btn-outline btn-secondary rounded-full mt-4"
            @click="resetForm"
          >
            Skicka en ny förfrågan
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

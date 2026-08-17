<script setup lang="ts">
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

const submitForm = async () => {
  if (form.honeypot) return
  formLoading.value = true
  setTimeout(() => {
    formLoading.value = false
    formSubmitted.value = true
  }, 700)
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-12 lg:px-10 space-y-16">
    <!-- Header -->
    <div class="space-y-4 max-w-3xl">
      <h1 class="font-heading text-4xl sm:text-6xl text-primary text-gritty">
        Boka Det 7:e Gunget
      </h1>
      <p class="text-base sm:text-lg text-base-content/80 leading-relaxed font-normal">
        Vill du ha äkta blues, sväng och bra stämning till er scen, pub eller 50-årsfest? Hör av dig så hittar vi ett datum!
      </p>
    </div>

    <div class="grid lg:grid-cols-[1fr_1.1fr] gap-12 items-start">
      <!-- Left: Contact Details & Tech Rider -->
      <div class="space-y-8">
        <div class="stage-card p-8 rounded-2xl border border-primary/20 space-y-6">
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
          </div>
        </div>

        <!-- Tech Rider Card -->
        <div class="stage-card p-8 rounded-2xl border border-secondary/30 space-y-4">
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
      <div class="stage-card p-8 sm:p-10 rounded-2xl border border-primary/30 shadow-2xl">
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
              class="input input-bordered w-full bg-base-200 text-sm focus:border-primary"
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
                class="input input-bordered w-full bg-base-200 text-sm focus:border-primary"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Telefonnummer</label>
              <input
                v-model="form.phone"
                type="tel"
                placeholder="070-123 45 67"
                class="input input-bordered w-full bg-base-200 text-sm focus:border-primary"
              />
            </div>
          </div>

          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Typ av event</label>
              <select v-model="form.eventType" class="select select-bordered w-full bg-base-200 text-sm focus:border-primary">
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
                class="input input-bordered w-full bg-base-200 text-sm focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Plats / stad</label>
            <input
              v-model="form.location"
              type="text"
              placeholder="T.ex. Ängelholm, Helsingborg, Malmö..."
              class="input input-bordered w-full bg-base-200 text-sm focus:border-primary"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Meddelande / detaljer *</label>
            <textarea
              v-model="form.message"
              required
              rows="4"
              placeholder="Berätta lite om er tillställning, förväntad publik och tider!"
              class="textarea textarea-bordered w-full bg-base-200 text-sm focus:border-primary"
            />
          </div>

          <button
            type="submit"
            class="btn btn-primary w-full font-bold shadow-lg shadow-primary/20 text-base"
            :disabled="formLoading"
          >
            {{ formLoading ? 'Skickar...' : 'Skicka bokningsförfrågan →' }}
          </button>
        </form>

        <div v-else class="text-center py-12 space-y-4">
          <span class="text-5xl">🎸</span>
          <h3 class="text-2xl font-heading text-primary font-bold">Tack för er förfrågan!</h3>
          <p class="text-sm text-base-content/80 max-w-sm mx-auto">
            Vi har tagit emot era uppgifter och återkopplar inom kort.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

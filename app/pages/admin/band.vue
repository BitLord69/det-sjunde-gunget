<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useSeoMeta({
  title: 'Bandet & Medlemmar | Det 7:e Gunget Admin',
})

const toastMessage = ref('')

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

const { data: bandMembers, refresh: refreshBand } = await useFetch<any[]>('/api/band', {
  default: () => [],
})

const isUploading = ref(false)
const uploadFile = async (event: Event, targetCallback: (url: string) => void) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const file = input.files[0]
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)
  isUploading.value = true

  try {
    const res = await $fetch<{ success: boolean; url: string }>('/api/admin/upload', {
      method: 'POST',
      body: formData,
    })
    if (res.success && res.url) {
      targetCallback(res.url)
      showToast('✓ Bilden har laddats upp!')
    }
  } catch (err: any) {
    showToast(`⚠️ Uppladdning misslyckades: ${err?.data?.message || err?.message || 'Fel'}`)
  } finally {
    isUploading.value = false
    input.value = ''
  }
}

// ---------------- BAND MEMBER LORE ----------------
const editingMember = ref<any | null>(null)
const memberForm = reactive({
  id: '',
  name: '',
  role: '',
  bioSv: '',
  bioEn: '',
  photoUrl: '',
  gearSv: '',
  gearEn: '',
  favoriteChord: '',
  weaknessSv: '',
  coffeeConsumption: '',
})

const openEditMember = (m: any) => {
  if (editingMember.value !== null && editingMember.value !== m.id) {
    const ok = confirm('⚠️ Du har redan ett öppet medlemsprofilsformulär.\n\nVill du avbryta och redigera denna medlem istället?')
    if (!ok) return
  }
  memberForm.id = m.id
  memberForm.name = m.name
  memberForm.role = m.role
  memberForm.bioSv = m.bioSv || ''
  memberForm.bioEn = m.bioEn || ''
  memberForm.photoUrl = m.photoUrl || ''
  memberForm.gearSv = m.gearSv || ''
  memberForm.gearEn = m.gearEn || ''
  memberForm.favoriteChord = m.favoriteChord || ''
  memberForm.weaknessSv = m.weaknessSv || ''
  memberForm.coffeeConsumption = m.coffeeConsumption || ''
  editingMember.value = m.id
}

const saveMember = async () => {
  await $fetch('/api/admin/band', {
    method: 'POST',
    body: memberForm,
  })
  editingMember.value = null
  await refreshBand()
  showToast('✓ Medlemsprofilen har uppdaterats!')
}

onBeforeRouteLeave((to, from, next) => {
  if (editingMember.value !== null) {
    const answer = window.confirm('⚠️ Du har ett öppet medlemsprofilsformulär.\n\nVill du verkligen lämna sidan?')
    if (answer) next()
    else next(false)
  } else {
    next()
  }
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 pt-3 pb-10 lg:px-10 space-y-6 font-sans">
    <!-- Toast Notification -->
    <div
      v-if="toastMessage"
      class="fixed bottom-6 right-6 z-50 bg-secondary text-secondary-content px-6 py-3 rounded-xl font-bold shadow-2xl animate-bounce flex items-center gap-2"
    >
      <span>{{ toastMessage }}</span>
    </div>

    <!-- CMS Tab Navigation -->
    <AdminNavBar :dirty="editingMember !== null" />

    <!-- BAND MEMBERS & BIOS -->
    <div class="space-y-6">
      <div>
        <h2 class="font-heading text-2xl text-primary font-bold">Bandmedlemmar & profiler</h2>
        <p class="text-xs text-base-content/70">Uppdatera presentationstext, musikinstrument, favoritackord och kaffestats.</p>
      </div>

      <!-- Edit Member Modal -->
      <div v-if="editingMember" class="stage-card p-6 sm:p-8 rounded-2xl border border-primary/40 space-y-5 shadow-2xl">
        <div class="flex items-center justify-between border-b border-primary/20 pb-3">
          <div class="flex items-center gap-3">
            <h3 class="font-heading text-xl text-primary font-bold">
              Redigera profil för {{ memberForm.name }}
            </h3>
            <span class="badge badge-warning badge-sm font-bold animate-pulse">
              ⚠️ Osparade ändringar
            </span>
          </div>
          <span class="badge badge-primary font-mono text-xs font-bold">{{ memberForm.role }}</span>
        </div>

        <div class="grid sm:grid-cols-2 gap-4 text-sm">
          <!-- Profile Photo with Direct Uploader -->
          <div class="sm:col-span-2 flex flex-col sm:flex-row items-center gap-4 p-4 bg-base-200/60 rounded-xl border border-primary/20">
            <NuxtImg
              :src="memberForm.photoUrl || '/media/brand/Logotyp_mini.webp'"
              :alt="memberForm.name"
              class="w-20 h-24 object-cover rounded-lg border border-primary/40 shadow-md flex-shrink-0"
            />
            <div class="flex-grow space-y-2 w-full">
              <label class="block text-xs font-bold text-secondary">Profilfoto</label>
              <div class="flex items-center gap-2">
                <input v-model="memberForm.photoUrl" type="text" placeholder="/media/band/namn.jpg" class="input input-bordered flex-grow bg-base-200 input-sm font-mono text-xs" />
                <label class="btn btn-outline btn-primary btn-sm rounded-lg cursor-pointer whitespace-nowrap" :class="isUploading ? 'loading' : ''">
                  <span>📁 Ladda upp</span>
                  <input type="file" accept="image/*" class="hidden" @change="uploadFile($event, url => memberForm.photoUrl = url)" />
                </label>
              </div>
              <p class="text-[10px] text-base-content/60">Ladda upp från datorn eller ange sökväg.</p>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Namn *</label>
            <input v-model="memberForm.name" type="text" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Roll / instrument *</label>
            <input v-model="memberForm.role" type="text" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>

          <!-- Bilingual Bios -->
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Biografi (svenska)</label>
            <textarea v-model="memberForm.bioSv" rows="3" class="textarea textarea-bordered w-full bg-base-200 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Biography (English)</label>
            <textarea v-model="memberForm.bioEn" rows="3" placeholder="English presentation..." class="textarea textarea-bordered w-full bg-base-200 text-sm" />
          </div>

          <!-- Bilingual Gear -->
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Vapen / utrustning (svenska)</label>
            <input v-model="memberForm.gearSv" type="text" placeholder="T.ex. Hohner Marine Band..." class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Gear / instruments (English)</label>
            <input v-model="memberForm.gearEn" type="text" placeholder="E.g. Fender Stratocaster 1968..." class="input input-bordered w-full bg-base-200 input-sm" />
          </div>

          <!-- Fun Band Lore -->
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Favoritackord</label>
            <input v-model="memberForm.favoriteChord" type="text" placeholder="T.ex. E7#9 (Hendrix-ackordet)" class="input input-bordered w-full bg-base-200 input-sm font-mono text-xs" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Svaghet</label>
            <input v-model="memberForm.weaknessSv" type="text" placeholder="T.ex. Skånska kanelbullar..." class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-secondary mb-1">Kaffekonsumtion per rep</label>
            <input v-model="memberForm.coffeeConsumption" type="text" placeholder="T.ex. 6 koppar bryggkaffe" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
        </div>

        <div class="flex items-center gap-3 pt-3">
          <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-6 cursor-pointer" @click="saveMember">
            Spara ändringar
          </button>
          <button type="button" class="btn btn-ghost btn-sm rounded-full cursor-pointer" @click="editingMember = null">
            Avbryt
          </button>
        </div>
      </div>

      <!-- Members Grid Display -->
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          v-for="m in bandMembers || []"
          :key="m.id"
          class="stage-card p-6 rounded-2xl border border-primary/20 space-y-4 flex flex-col justify-between"
        >
          <div class="space-y-3">
            <div class="aspect-square bg-base-300 rounded-xl overflow-hidden border border-primary/30 shadow-inner">
              <NuxtImg
                :src="m.photoUrl || '/media/brand/Logotyp_mini.webp'"
                :alt="m.name"
                class="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 class="font-heading text-lg text-primary font-bold">{{ m.name }}</h3>
              <p class="text-xs text-secondary font-mono">{{ m.role }}</p>
            </div>
            <p class="text-xs text-base-content/80 line-clamp-3 leading-relaxed">
              {{ m.bioSv }}
            </p>
          </div>

          <div class="pt-2 border-t border-primary/10">
            <button
              type="button"
              class="btn btn-sm btn-outline btn-primary w-full rounded-xl font-bold cursor-pointer"
              @click="openEditMember(m)"
            >
              Redigera profil
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

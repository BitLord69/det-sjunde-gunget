<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useSeoMeta({
  title: 'Administratörer & Bandkonton | Det 7:e Gunget Admin',
})

const { adminUser } = useAdminAuth()
const toastMessage = ref('')

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

const { data: adminUsers, refresh: refreshAdmins } = await useFetch<any[]>('/api/admin/users', {
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

// ---------------- ADD NEW ADMIN (Invite/Create) ----------------
const isAddAdminOpen = ref(false)
const newAdminForm = reactive({
  name: '',
  email: '',
  username: '',
  role: 'Administratör',
  password: '',
  avatarUrl: '',
})

const openAddAdmin = () => {
  newAdminForm.name = ''
  newAdminForm.email = ''
  newAdminForm.username = ''
  newAdminForm.role = 'Administratör'
  newAdminForm.password = ''
  newAdminForm.avatarUrl = ''
  isAddAdminOpen.value = true
}

const saveNewAdmin = async () => {
  if (!newAdminForm.name || !newAdminForm.email || !newAdminForm.password) {
    showToast('⚠️ Vänligen fyll i namn, e-post och lösenord!')
    return
  }
  try {
    await $fetch('/api/admin/users', {
      method: 'POST',
      body: newAdminForm,
    })
    isAddAdminOpen.value = false
    await refreshAdmins()
    showToast('✓ Ny administratör tillagd!')
  } catch (err: any) {
    showToast(`⚠️ ${err?.data?.message || 'Kunde inte lägga till administratör'}`)
  }
}

const deleteAdminUser = async (admin: any) => {
  if (admin.id === adminUser.value?.id) {
    showToast('⚠️ Du kan inte ta bort ditt eget administratörskonto!')
    return
  }
  if (!confirm(`Är du säker på att du vill ta bort administratören ${admin.name}?`)) return

  try {
    await $fetch('/api/admin/users', {
      method: 'DELETE',
      body: { id: admin.id },
    })
    await refreshAdmins()
    showToast('✓ Administratör borttagen.')
  } catch (err: any) {
    showToast(`⚠️ ${err?.data?.message || 'Kunde inte ta bort administratör'}`)
  }
}

// Navigation Guards
onBeforeRouteLeave((to, from, next) => {
  if (isAddAdminOpen.value) {
    const answer = window.confirm('⚠️ Du har ett öppet formulär för att skapa administratör.\n\nVill du verkligen lämna sidan?')
    if (answer) next()
    else next(false)
  } else {
    next()
  }
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 sm:px-6 pt-3 pb-10 lg:px-10 space-y-6 font-sans">
    <!-- Toast Notification -->
    <div
      v-if="toastMessage"
      class="fixed bottom-6 right-6 z-50 bg-secondary text-secondary-content px-6 py-3 rounded-xl font-bold shadow-2xl animate-bounce flex items-center gap-2"
    >
      <span>{{ toastMessage }}</span>
    </div>

    <!-- CMS Tab Navigation -->
    <AdminNavBar :dirty="isAddAdminOpen" />

    <!-- ADMINS & USER MANAGEMENT -->
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Administratörer & Bandkonton</h2>
          <p class="text-xs text-base-content/70">Översikt över bandets medlemmar som har administratörsbehörighet.</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-5 cursor-pointer" @click="openAddAdmin">
          + Ny administratör
        </button>
      </div>

      <!-- Information Callout Box -->
      <div class="bg-base-200/90 border border-primary/30 p-4 rounded-2xl flex items-start gap-3.5 text-xs leading-relaxed shadow-sm">
        <span class="text-2xl flex-shrink-0">🔒</span>
        <div class="space-y-1">
          <strong class="text-primary font-bold text-sm block">Hur ändrar jag min e-postadress eller ansluter Google/Facebook?</strong>
          <p class="text-base-content/85">
            För att garantera full personlig integritet kan varje bandmedlem endast redigera sina <strong>egna uppgifter</strong>. Klicka på ditt namn uppe till höger i toppmenyn (eller på din avatar) för att öppna modalen <strong>"Min profil & Inloggningar"</strong> där du ändrar e-postadress, profilbild och kopplar dina Google-, GitHub- eller Facebook-konton.
          </p>
        </div>
      </div>

      <!-- Add Admin Form -->
      <div v-if="isAddAdminOpen" class="stage-card p-6 sm:p-8 rounded-2xl border border-primary/40 space-y-4 shadow-2xl">
        <div class="flex items-center justify-between border-b border-primary/20 pb-3">
          <h3 class="font-heading text-xl text-primary font-bold">
            Lägg till ny administratör
          </h3>
          <span class="badge badge-warning badge-sm font-bold animate-pulse">
            ⚠️ Osparade ändringar
          </span>
        </div>

        <div class="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Namn *</label>
            <input v-model="newAdminForm.name" type="text" placeholder="T.ex. Janis Svensson" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">E-postadress (Inloggningsmail) *</label>
            <input v-model="newAdminForm.email" type="email" placeholder="namn@det7egunget.se" class="input input-bordered w-full bg-base-200 input-sm font-mono" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Användarnamn (valfritt)</label>
            <input v-model="newAdminForm.username" type="text" placeholder="janis" class="input input-bordered w-full bg-base-200 input-sm font-mono text-xs" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Roll / uppgift</label>
            <input v-model="newAdminForm.role" type="text" placeholder="T.ex. Sång & munspel / Admin" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-secondary mb-1">Lösenord (minst 6 tecken) *</label>
            <input v-model="newAdminForm.password" type="password" placeholder="••••••••" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-secondary mb-1">Avatar / Profilbild (valfritt)</label>
            <div class="flex items-center gap-2">
              <input v-model="newAdminForm.avatarUrl" type="text" placeholder="/media/brand/avatar.jpg" class="input input-bordered flex-grow bg-base-200 input-sm font-mono text-xs" />
              <label class="btn btn-outline btn-primary btn-sm rounded-lg cursor-pointer whitespace-nowrap" :class="isUploading ? 'loading' : ''">
                <span>📁 Ladda upp</span>
                <input type="file" accept="image/*" class="hidden" @change="uploadFile($event, url => newAdminForm.avatarUrl = url)" />
              </label>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3 pt-3 border-t border-primary/20">
          <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-6 cursor-pointer" @click="saveNewAdmin">
            Skapa administratör
          </button>
          <button type="button" class="btn btn-ghost btn-sm rounded-full cursor-pointer" @click="isAddAdminOpen = false">
            Avbryt
          </button>
        </div>
      </div>

      <!-- Admins List Table -->
      <div class="overflow-x-auto rounded-2xl border border-primary/20 stage-card shadow-lg">
        <table class="table table-zebra w-full text-xs">
          <thead>
            <tr class="text-secondary font-bold uppercase text-[10px] tracking-wider border-b border-primary/20 bg-base-300/50">
              <th>Medlem / Admin</th>
              <th>E-postadress (Inloggning)</th>
              <th>Användarnamn</th>
              <th>Roll</th>
              <th>Primär inloggning</th>
              <th class="text-right">Administration</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="admin in adminUsers || []" :key="admin.id" :class="admin.id === adminUser?.id ? 'bg-primary/10' : ''">
              <td class="flex items-center gap-3 py-3">
                <div class="avatar placeholder">
                  <div class="w-8 h-8 rounded-full bg-primary text-primary-content text-xs font-bold overflow-hidden shadow">
                    <NuxtImg v-if="admin.avatarUrl" :src="admin.avatarUrl" :alt="admin.name" class="w-full h-full object-cover" />
                    <span v-else>{{ admin.name.charAt(0) }}</span>
                  </div>
                </div>
                <div>
                  <span class="font-bold text-primary block">{{ admin.name }}</span>
                  <span v-if="admin.id === adminUser?.id" class="badge badge-accent badge-xs font-bold text-[9px]">Du</span>
                </div>
              </td>
              <td class="font-mono text-[11px] font-bold text-base-content/90">{{ admin.email }}</td>
              <td class="font-mono text-[11px] text-base-content/70">{{ admin.username }}</td>
              <td><span class="badge badge-sm font-bold text-[10px]">{{ admin.role }}</span></td>
              <td class="font-mono capitalize text-[10px]">
                <span class="badge badge-ghost badge-xs">{{ admin.provider }}</span>
              </td>
              <td class="text-right">
                <button
                  v-if="admin.id !== adminUser?.id"
                  type="button"
                  class="btn btn-xs btn-outline btn-error rounded cursor-pointer"
                  @click="deleteAdminUser(admin)"
                >
                  Ta bort
                </button>
                <span v-else class="text-[10px] text-primary/70 font-semibold italic">Inloggad profil</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

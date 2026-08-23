<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useSeoMeta({
  title: 'Setlist & Liverepertoar | Det 7:e Gunget Admin',
})

const toastMessage = ref('')

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

const { data: setlistData, refresh: refreshSetlist } = await useFetch<any[]>('/api/setlist', {
  default: () => [],
})

// ---------------- SETLIST & REPERTOIRE CRUD ----------------
const editingSetlist = ref<string | null>(null)
const setlistForm = reactive({
  id: '',
  title: '',
  artist: '',
  isOriginal: false,
  setName: 'Set 1: Klubbstart',
  notes: '',
  sortOrder: 0,
})

const openAddSetlist = () => {
  if (editingSetlist.value !== null) {
    const ok = confirm('⚠️ Du har redan ett öppet formulär för setlistan.\n\nVill du avbryta och lägga till en ny låt istället?')
    if (!ok) return
  }
  setlistForm.id = ''
  setlistForm.title = ''
  setlistForm.artist = ''
  setlistForm.isOriginal = false
  setlistForm.setName = 'Set 1: Klubbstart'
  setlistForm.notes = ''
  setlistForm.sortOrder = (setlistData.value?.length || 0) + 1
  editingSetlist.value = 'new'
}

const openEditSetlist = (item: any) => {
  if (editingSetlist.value !== null && editingSetlist.value !== item.id) {
    const ok = confirm('⚠️ Du har redan ett öppet formulär för setlistan.\n\nVill du avbryta och redigera denna låt istället?')
    if (!ok) return
  }
  setlistForm.id = item.id
  setlistForm.title = item.title
  setlistForm.artist = item.artist || ''
  setlistForm.isOriginal = !!item.isOriginal
  setlistForm.setName = item.setName || 'Set 1: Klubbstart'
  setlistForm.notes = item.notes || ''
  setlistForm.sortOrder = item.sortOrder || 0
  editingSetlist.value = item.id
}

const saveSetlistItem = async () => {
  if (!setlistForm.title) {
    showToast('⚠️ Ange låttitel!')
    return
  }
  try {
    await $fetch('/api/admin/setlist', {
      method: 'POST',
      body: setlistForm,
    })
    editingSetlist.value = null
    await refreshSetlist()
    showToast('✓ Setlistan har uppdaterats!')
  } catch (err: any) {
    showToast(`⚠️ ${err?.data?.message || 'Kunde inte spara låten'}`)
  }
}

const deleteSetlistItem = async (id: string) => {
  if (!confirm('Vill du ta bort låten från setlistan?')) return
  try {
    await $fetch('/api/admin/setlist', {
      method: 'DELETE',
      body: { id },
    })
    await refreshSetlist()
    showToast('✓ Låten togs bort från setlistan!')
  } catch (err: any) {
    showToast(`⚠️ ${err?.data?.message || 'Kunde inte ta bort låten'}`)
  }
}

// Setlist Sorting
const setlistSortKey = ref<'sortOrder' | 'title' | 'artist' | 'setName'>('sortOrder')
const setlistSortDir = ref<'asc' | 'desc'>('asc')

const toggleSetlistSort = (key: 'sortOrder' | 'title' | 'artist' | 'setName') => {
  if (setlistSortKey.value === key) {
    setlistSortDir.value = setlistSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    setlistSortKey.value = key
    setlistSortDir.value = key === 'sortOrder' ? 'asc' : 'asc'
  }
}

const sortedSetlist = computed(() => {
  const list = [...(setlistData.value || [])]
  const dir = setlistSortDir.value === 'asc' ? 1 : -1

  return list.sort((a, b) => {
    if (setlistSortKey.value === 'sortOrder') {
      return ((a.sortOrder ?? 0) - (b.sortOrder ?? 0)) * dir
    }
    if (setlistSortKey.value === 'title') {
      return (a.title || '').localeCompare(b.title || '', 'sv') * dir
    }
    if (setlistSortKey.value === 'artist') {
      const artA = a.isOriginal ? 'Det 7:e Gunget' : (a.artist || '')
      const artB = b.isOriginal ? 'Det 7:e Gunget' : (b.artist || '')
      return artA.localeCompare(artB, 'sv') * dir
    }
    if (setlistSortKey.value === 'setName') {
      return (a.setName || '').localeCompare(b.setName || '', 'sv') * dir
    }
    return 0
  })
})

onBeforeRouteLeave((to, from, next) => {
  if (editingSetlist.value !== null) {
    const answer = window.confirm('⚠️ Du har ett öppet formulär för setlistan.\n\nVill du verkligen lämna sidan?')
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
    <AdminNavBar :dirty="editingSetlist !== null" />

    <!-- SETLIST & REPERTOIRE MANAGER -->
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Hantera live setlist & repertoar (på musiksidan)</h2>
          <p class="text-xs text-base-content/70">
            Organisera bandets aktiva liverepertoar uppdelad i set och extranummer som visas för fansen på musiksidan (<NuxtLink to="/music" target="_blank" class="text-secondary underline hover:text-primary font-mono">/music</NuxtLink>).
          </p>
        </div>
        <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-5 cursor-pointer" @click="openAddSetlist">
          + Ny låt i setlistan
        </button>
      </div>

      <!-- Add/Edit Setlist Item Modal Form -->
      <div v-if="editingSetlist" class="stage-card p-6 sm:p-8 rounded-2xl border border-primary/40 space-y-4 shadow-2xl">
        <div class="flex items-center justify-between border-b border-primary/20 pb-3">
          <h3 class="font-heading text-xl text-primary font-bold">
            {{ editingSetlist === 'new' ? 'Lägg till låt i setlistan' : 'Redigera låt i setlistan' }}
          </h3>
          <span class="badge badge-warning badge-sm font-bold animate-pulse">
            ⚠️ Osparade ändringar
          </span>
        </div>

        <div class="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Låttitel *</label>
            <input v-model="setlistForm.title" type="text" placeholder="T.ex. Hoochie Coochie Man" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Set / Avdelning *</label>
            <select v-model="setlistForm.setName" class="select select-bordered w-full bg-base-200 select-sm">
              <option value="Set 1: Klubbstart">Set 1: Klubbstart</option>
              <option value="Set 2: Svettigt ös">Set 2: Svettigt ös</option>
              <option value="Extranummer / Encores">Extranummer / Encores</option>
              <option value="Reservlåtar / Akustiskt">Reservlåtar / Akustiskt</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Låttyp</label>
            <select v-model="setlistForm.isOriginal" class="select select-bordered w-full bg-base-200 select-sm">
              <option :value="false">Cover / Tolkning</option>
              <option :value="true">Egen låt (Det 7:e Gunget)</option>
            </select>
          </div>
          <div v-if="!setlistForm.isOriginal">
            <label class="block text-xs font-bold text-secondary mb-1">Originalartist</label>
            <input v-model="setlistForm.artist" type="text" placeholder="T.ex. Muddy Waters" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-secondary mb-1">Live-notering / Cue (valfritt)</label>
            <input v-model="setlistForm.notes" type="text" placeholder="T.ex. Munspelssolo i D, publikallsång, tempoökning" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Sorteringsordning</label>
            <input v-model="setlistForm.sortOrder" type="number" class="input input-bordered w-full bg-base-200 input-sm font-mono text-xs" />
          </div>
        </div>

        <div class="flex items-center gap-3 pt-3">
          <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-6 cursor-pointer" @click="saveSetlistItem">
            Spara i setlistan
          </button>
          <button type="button" class="btn btn-ghost btn-sm rounded-full cursor-pointer" @click="editingSetlist = null">
            Avbryt
          </button>
        </div>
      </div>

      <!-- Setlist Table -->
      <div class="overflow-x-auto rounded-2xl border border-primary/20 stage-card">
        <table class="table table-zebra w-full text-xs">
          <thead>
            <tr class="text-secondary font-bold uppercase text-[10px] tracking-wider border-b border-primary/20">
              <th>
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded"
                  :class="setlistSortKey === 'sortOrder' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleSetlistSort('sortOrder')"
                >
                  <span>Ordning</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="setlistSortKey === 'sortOrder' ? (setlistSortDir === 'asc' ? 'Sorterat 1 till N (Klicka för fallande)' : 'Sorterat N till 1 (Klicka för stigande)') : 'Klicka för att sortera efter spelordning'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="transition-transform duration-300"
                      :class="[
                        setlistSortKey === 'sortOrder'
                          ? (setlistSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
                          : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content'
                      ]"
                    >
                      <path d="M12 2C6.5 2 3 5.5 3 10C3 16 10 21.5 12 22.5C14 21.5 21 16 21 10C21 5.5 17.5 2 12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              </th>

              <th>
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded"
                  :class="setlistSortKey === 'title' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleSetlistSort('title')"
                >
                  <span>Låttitel</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="setlistSortKey === 'title' ? (setlistSortDir === 'asc' ? 'Sorterat A till Ö' : 'Sorterat Ö till A') : 'Klicka för att sortera efter låttitel'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="transition-transform duration-300"
                      :class="[
                        setlistSortKey === 'title'
                          ? (setlistSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
                          : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content'
                      ]"
                    >
                      <path d="M12 2C6.5 2 3 5.5 3 10C3 16 10 21.5 12 22.5C14 21.5 21 16 21 10C21 5.5 17.5 2 12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              </th>

              <th>
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded"
                  :class="setlistSortKey === 'artist' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleSetlistSort('artist')"
                >
                  <span>Artist / Typ</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="setlistSortKey === 'artist' ? (setlistSortDir === 'asc' ? 'Sorterat A till Ö' : 'Sorterat Ö till A') : 'Klicka för att sortera efter artist'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="transition-transform duration-300"
                      :class="[
                        setlistSortKey === 'artist'
                          ? (setlistSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
                          : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content'
                      ]"
                    >
                      <path d="M12 2C6.5 2 3 5.5 3 10C3 16 10 21.5 12 22.5C14 21.5 21 16 21 10C21 5.5 17.5 2 12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              </th>

              <th>
                <button
                  type="button"
                  class="group inline-flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer py-1 px-1.5 rounded"
                  :class="setlistSortKey === 'setName' ? 'text-primary font-black bg-primary/10 border-b-2 border-primary' : 'text-secondary hover:text-primary hover:bg-base-300/60'"
                  @click="toggleSetlistSort('setName')"
                >
                  <span>Set / Avdelning</span>
                  <span
                    class="tooltip tooltip-bottom inline-flex items-center"
                    :data-tip="setlistSortKey === 'setName' ? (setlistSortDir === 'asc' ? 'Sorterat A till Ö' : 'Sorterat Ö till A') : 'Klicka för att sortera efter set'"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="transition-transform duration-300"
                      :class="[
                        setlistSortKey === 'setName'
                          ? (setlistSortDir === 'asc' ? 'rotate-0 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100' : 'rotate-180 text-primary drop-shadow-[0_0_5px_rgba(226,189,114,0.8)] opacity-100')
                          : 'opacity-30 group-hover:opacity-80 rotate-0 text-base-content'
                      ]"
                    >
                      <path d="M12 2C6.5 2 3 5.5 3 10C3 16 10 21.5 12 22.5C14 21.5 21 16 21 10C21 5.5 17.5 2 12 2Z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              </th>

              <th>Live-notering</th>
              <th class="text-right">Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in sortedSetlist" :key="item.id" :class="editingSetlist === item.id ? 'bg-primary/10 border-l-4 border-primary' : ''">
              <td class="font-mono text-secondary font-bold text-center w-12">{{ item.sortOrder || '—' }}</td>
              <td class="font-bold text-primary text-sm">{{ item.title }}</td>
              <td>
                <span class="badge badge-xs font-bold uppercase text-[9px]" :class="item.isOriginal ? 'badge-primary' : 'badge-secondary'">
                  {{ item.isOriginal ? 'Original' : item.artist || 'Cover' }}
                </span>
              </td>
              <td>
                <span class="badge badge-sm font-mono text-[10px] bg-base-300 border border-primary/20">
                  {{ item.setName || 'Set 1' }}
                </span>
              </td>
              <td class="text-xs text-base-content/75 italic max-w-xs truncate">
                {{ item.notes || '—' }}
              </td>
              <td class="text-right space-x-1">
                <button type="button" class="btn btn-xs btn-outline btn-primary rounded cursor-pointer" @click="openEditSetlist(item)">
                  Redigera
                </button>
                <button type="button" class="btn btn-xs btn-outline btn-error rounded cursor-pointer" @click="deleteSetlistItem(item.id)">
                  Ta bort
                </button>
              </td>
            </tr>
            <tr v-if="!setlistData || setlistData.length === 0">
              <td colspan="6" class="text-center py-8 text-base-content/60 italic">
                Inga låtar finns i setlistan ännu. Klicka på "+ Ny låt i setlistan" ovan för att lägga till.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

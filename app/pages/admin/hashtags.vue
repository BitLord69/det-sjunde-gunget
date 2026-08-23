<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useSeoMeta({
  title: 'Sociala Taggar & Hashtags | Det 7:e Gunget Admin',
})

const toastMessage = ref('')

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

const { data: hashtagsData, refresh: refreshHashtags } = await useFetch<any[]>('/api/admin/hashtags', {
  default: () => [],
})

const allHashtags = computed<any[]>(() => (Array.isArray(hashtagsData.value) ? hashtagsData.value : []))

// Filter categories: 'all' | 'gig' | 'song' | 'news' | 'photo'
const activeTagTabFilter = ref<string>('all')

const tagHasCategory = (tag: any, cat: string) => {
  if (!tag || !tag.category) return false
  if (tag.category === 'all') return true
  return tag.category.split(',').map((s: string) => s.trim()).includes(cat)
}

const filteredHashtags = computed(() => {
  if (activeTagTabFilter.value === 'all') return allHashtags.value
  return allHashtags.value.filter((t) => tagHasCategory(t, activeTagTabFilter.value))
})

const getCategoryBadges = (categoryStr: string) => {
  if (!categoryStr || categoryStr === 'all') {
    return [{ key: 'all', label: '🌐 Allmänt (Alla)', class: 'badge-neutral' }]
  }
  const cats = categoryStr.split(',').map((s) => s.trim())
  const list: { key: string; label: string; class: string }[] = []
  if (cats.includes('gig')) list.push({ key: 'gig', label: '📅 Spelningar', class: 'badge-primary' })
  if (cats.includes('song')) list.push({ key: 'song', label: '🎵 Låtar', class: 'badge-secondary' })
  if (cats.includes('news')) list.push({ key: 'news', label: '📢 Nyheter', class: 'badge-accent' })
  if (cats.includes('photo')) list.push({ key: 'photo', label: '📷 Foton', class: 'badge-info' })
  return list
}

const editingHashtagId = ref<string | null>(null)
const hashtagForm = reactive({
  id: '',
  tag: '',
  categories: ['gig'] as string[],
  isAll: false,
})

const isHashtagDirty = computed(() => {
  return editingHashtagId.value !== null || hashtagForm.tag.trim().length > 0
})

const resetHashtagForm = () => {
  editingHashtagId.value = null
  hashtagForm.id = ''
  hashtagForm.tag = ''
  hashtagForm.categories = ['gig']
  hashtagForm.isAll = false
}

const openEditHashtag = (tag: any) => {
  if (editingHashtagId.value !== null && editingHashtagId.value !== tag.id) {
    const ok = confirm('⚠️ Du har redan ett öppet hashtag-formulär.\n\nVill du avbryta och redigera denna tagg istället?')
    if (!ok) return
  }
  editingHashtagId.value = tag.id
  hashtagForm.id = tag.id
  hashtagForm.tag = tag.tag
  hashtagForm.isAll = tag.category === 'all'
  if (tag.category === 'all') {
    hashtagForm.categories = ['gig', 'song', 'news', 'photo']
  } else {
    hashtagForm.categories = tag.category.split(',').map((s: string) => s.trim())
  }
  const el = document.getElementById('hashtag-editor')
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

const toggleFormCategory = (cat: string) => {
  if (cat === 'all') {
    hashtagForm.isAll = !hashtagForm.isAll
    if (hashtagForm.isAll) {
      hashtagForm.categories = ['gig', 'song', 'news', 'photo']
    }
    return
  }
  hashtagForm.isAll = false
  if (hashtagForm.categories.includes(cat)) {
    hashtagForm.categories = hashtagForm.categories.filter((c) => c !== cat)
  } else {
    hashtagForm.categories.push(cat)
  }
}

const saveHashtag = async () => {
  if (!hashtagForm.tag.trim()) {
    showToast('⚠️ Ange en hashtag, t.ex. #BluesRock')
    return
  }
  if (!hashtagForm.isAll && hashtagForm.categories.length === 0) {
    showToast('⚠️ Välj minst en kategori för taggen!')
    return
  }

  const isEdit = !!hashtagForm.id
  await $fetch('/api/admin/hashtags', {
    method: 'POST',
    body: {
      id: hashtagForm.id || undefined,
      tag: hashtagForm.tag,
      categories: hashtagForm.isAll ? ['all'] : hashtagForm.categories,
    },
  })

  resetHashtagForm()
  await refreshHashtags()
  showToast(isEdit ? '✓ Taggen och dess kategorier har uppdaterats!' : '✓ Ny tagg sparades!')
}

const toggleHashtagActive = async (tag: any) => {
  await $fetch('/api/admin/hashtags', {
    method: 'POST',
    body: {
      id: tag.id,
      tag: tag.tag,
      category: tag.category,
      isActive: !tag.isActive,
      sortOrder: tag.sortOrder,
    },
  })
  await refreshHashtags()
}

const deleteHashtag = async (id: string) => {
  if (!confirm('Är du säker på att du vill ta bort denna tagg?')) return
  await $fetch(`/api/admin/hashtags?id=${id}`, {
    method: 'DELETE',
  })
  if (editingHashtagId.value === id) {
    resetHashtagForm()
  }
  await refreshHashtags()
  showToast('✓ Taggen togs bort.')
}

onBeforeRouteLeave((to, from, next) => {
  if (isHashtagDirty.value) {
    const answer = window.confirm('⚠️ Du har osparade ändringar i taggformuläret.\n\nVill du verkligen lämna sidan?')
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
    <AdminNavBar :dirty="isHashtagDirty" />

    <!-- SOCIAL HASHTAGS MANAGER -->
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Sociala taggar & hashtags</h2>
          <p class="text-xs text-base-content/70">
            Hantera standardtaggar för automatiska inlägg på Facebook och Instagram. En tagg kan tillhöra flera kategorier samtidigt!
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button type="button" class="btn btn-outline btn-primary btn-sm rounded-full cursor-pointer" @click="() => refreshHashtags()">
            🔄 Uppdatera
          </button>
        </div>
      </div>

      <!-- Add/Edit Hashtag Form Card -->
      <div id="hashtag-editor" class="stage-card p-6 rounded-2xl border border-primary/40 space-y-4 shadow-xl">
        <div class="flex items-center justify-between border-b border-primary/20 pb-3">
          <h3 class="font-heading text-lg text-primary font-bold">
            {{ editingHashtagId ? 'Redigera hashtag' : 'Lägg till ny standard-hashtag' }}
          </h3>
          <span v-if="editingHashtagId" class="badge badge-warning badge-xs font-mono font-bold">Redigerar</span>
        </div>

        <form class="space-y-4" @submit.prevent="saveHashtag">
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Hashtag (med eller utan #) *</label>
            <input
              v-model="hashtagForm.tag"
              type="text"
              placeholder="T.ex. #DetSjundeGunget eller #BluesRock"
              class="input input-bordered w-full bg-base-200 input-sm font-mono text-xs"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-secondary mb-1.5">
              Tilldela kategorier (flervalskryss):
            </label>
            <div class="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                class="btn btn-xs rounded-full cursor-pointer"
                :class="hashtagForm.isAll ? 'btn-primary font-bold' : 'btn-ghost border border-base-content/20'"
                @click="toggleFormCategory('all')"
              >
                🌐 Alla kategorier (Allmänt)
              </button>
              <button
                type="button"
                class="btn btn-xs rounded-full cursor-pointer"
                :class="hashtagForm.isAll || hashtagForm.categories.includes('gig') ? 'btn-primary font-bold' : 'btn-ghost border border-base-content/20'"
                @click="toggleFormCategory('gig')"
              >
                📅 Spelningar (Gig)
              </button>
              <button
                type="button"
                class="btn btn-xs rounded-full cursor-pointer"
                :class="hashtagForm.isAll || hashtagForm.categories.includes('song') ? 'btn-secondary font-bold' : 'btn-ghost border border-base-content/20'"
                @click="toggleFormCategory('song')"
              >
                🎵 Låtar & Jukebox
              </button>
              <button
                type="button"
                class="btn btn-xs rounded-full cursor-pointer"
                :class="hashtagForm.isAll || hashtagForm.categories.includes('news') ? 'btn-accent font-bold' : 'btn-ghost border border-base-content/20'"
                @click="toggleFormCategory('news')"
              >
                📢 Nyheter & Inlägg
              </button>
              <button
                type="button"
                class="btn btn-xs rounded-full cursor-pointer"
                :class="hashtagForm.isAll || hashtagForm.categories.includes('photo') ? 'btn-info font-bold' : 'btn-ghost border border-base-content/20'"
                @click="toggleFormCategory('photo')"
              >
                📷 Foton & Galleri
              </button>
            </div>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <button type="submit" class="btn btn-primary btn-sm rounded-xl font-bold px-6 shadow cursor-pointer">
              {{ editingHashtagId ? 'Spara ändringar' : '+ Lägg till tagg' }}
            </button>
            <button
              v-if="editingHashtagId"
              type="button"
              class="btn btn-ghost btn-sm rounded-xl cursor-pointer"
              @click="resetHashtagForm"
            >
              Avbryt
            </button>
          </div>
        </form>
      </div>

      <!-- Category Filter Pills -->
      <div class="flex flex-wrap gap-2 text-xs font-bold">
        <button
          type="button"
          class="px-4 py-1.5 rounded-full transition-all cursor-pointer"
          :class="activeTagTabFilter === 'all' ? 'bg-secondary text-secondary-content font-black shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
          @click="activeTagTabFilter = 'all'"
        >
          Alla taggar ({{ allHashtags.length }})
        </button>
        <button
          type="button"
          class="px-4 py-1.5 rounded-full transition-all cursor-pointer"
          :class="activeTagTabFilter === 'gig' ? 'bg-primary text-primary-content font-black shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
          @click="activeTagTabFilter = 'gig'"
        >
          📅 Spelningar
        </button>
        <button
          type="button"
          class="px-4 py-1.5 rounded-full transition-all cursor-pointer"
          :class="activeTagTabFilter === 'song' ? 'bg-primary text-primary-content font-black shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
          @click="activeTagTabFilter = 'song'"
        >
          🎵 Låtar
        </button>
        <button
          type="button"
          class="px-4 py-1.5 rounded-full transition-all cursor-pointer"
          :class="activeTagTabFilter === 'news' ? 'bg-primary text-primary-content font-black shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
          @click="activeTagTabFilter = 'news'"
        >
          📢 Nyheter
        </button>
        <button
          type="button"
          class="px-4 py-1.5 rounded-full transition-all cursor-pointer"
          :class="activeTagTabFilter === 'photo' ? 'bg-primary text-primary-content font-black shadow' : 'bg-base-200 text-base-content/70 hover:text-primary'"
          @click="activeTagTabFilter = 'photo'"
        >
          📷 Foton
        </button>
      </div>

      <!-- Hashtags Table -->
      <div class="overflow-x-auto rounded-2xl border border-primary/20 stage-card">
        <table class="table table-zebra w-full text-xs">
          <thead>
            <tr class="text-secondary font-bold uppercase text-[10px] tracking-wider border-b border-primary/20">
              <th>Hashtag</th>
              <th>Kategorier</th>
              <th>Status</th>
              <th class="text-right">Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="tag in filteredHashtags"
              :key="tag.id"
              class="hover:bg-base-200/50 transition-colors"
              :class="editingHashtagId === tag.id ? 'bg-primary/10 border-l-4 border-primary' : ''"
            >
              <td class="font-bold text-primary font-mono text-sm">
                {{ tag.tag }}
              </td>
              <td>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="badge in getCategoryBadges(tag.category)"
                    :key="badge.key"
                    class="badge badge-xs font-bold uppercase text-[9px]"
                    :class="badge.class"
                  >
                    {{ badge.label }}
                  </span>
                </div>
              </td>
              <td>
                <label class="cursor-pointer inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    :checked="tag.isActive"
                    class="toggle toggle-success toggle-xs"
                    @change="toggleHashtagActive(tag)"
                  />
                  <span class="text-[11px] font-bold" :class="tag.isActive ? 'text-emerald-400' : 'text-base-content/40'">
                    {{ tag.isActive ? 'Aktiv' : 'Inaktiv' }}
                  </span>
                </label>
              </td>
              <td class="text-right space-x-1">
                <button
                  type="button"
                  class="btn btn-ghost btn-xs text-secondary font-bold hover:bg-secondary/20 rounded-full cursor-pointer"
                  @click="openEditHashtag(tag)"
                >
                  ✏️ Redigera
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs text-error font-bold hover:bg-error/20 rounded-full cursor-pointer"
                  @click="deleteHashtag(tag.id)"
                >
                  🗑️ Ta bort
                </button>
              </td>
            </tr>
            <tr v-if="filteredHashtags.length === 0">
              <td colspan="4" class="text-center py-8 text-base-content/60 italic">
                Inga taggar hittades i denna kategori.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

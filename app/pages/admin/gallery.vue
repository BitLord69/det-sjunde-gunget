<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useSeoMeta({
  title: 'Galleri & Fan Central | Det 7:e Gunget Admin',
})

const toastMessage = ref('')

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    toastMessage.value = ''
  }, 4000)
}

const { data: galleryItems, refresh: refreshGallery } = await useFetch<any[]>('/api/gallery', {
  default: () => [],
})
const { data: hashtagsData } = await useFetch<any[]>('/api/admin/hashtags', { default: () => [] })

const allHashtags = computed<any[]>(() => (Array.isArray(hashtagsData.value) ? hashtagsData.value : []))

const tagHasCategory = (tag: any, cat: string) => {
  if (!tag || !tag.category) return false
  if (tag.category === 'all') return true
  return tag.category.split(',').map((s: string) => s.trim()).includes(cat)
}

const selectedGalTags = ref<string[]>([])
const availableGalTags = computed(() => {
  return allHashtags.value.filter((t) => t.isActive && (tagHasCategory(t, 'photo') || tagHasCategory(t, 'gig') || tagHasCategory(t, 'song')))
})

const toggleGalTag = (tag: string) => {
  if (selectedGalTags.value.includes(tag)) {
    selectedGalTags.value = selectedGalTags.value.filter((t) => t !== tag)
  } else {
    selectedGalTags.value.push(tag)
  }
}

const galSocialPreview = computed(() => {
  const caption = galForm.captionSv.trim() || 'Nytt foto från replokalen & scenen med Det 7:e Gunget!'
  const tags = selectedGalTags.value.join(' ')
  return `📷 NYTT I GALLERIET!\n\n"${caption}"\n\nKolla in fler bilder och ögonblick på vår webbplats! 🎸✨\n\nhttps://www.det7egunget.se/gallery\n\n${tags}`
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

// ---------------- GALLERY CRUD ----------------
const editingGal = ref<any | null>(null)
const galForm = reactive({
  id: '',
  category: 'photo',
  mediaUrl: '',
  frameStyle: 'polaroid',
  rotation: 0,
  captionSv: '',
  captionEn: '',
  altTextSv: '',
  altTextEn: '',
  postToSocials: false,
})

const openAddGal = () => {
  if (editingGal.value !== null) {
    const ok = confirm('⚠️ Du har redan ett öppet galleriformulär.\n\nVill du avbryta och ladda upp en ny bild istället?')
    if (!ok) return
  }
  galForm.id = ''
  galForm.category = 'photo'
  galForm.mediaUrl = ''
  galForm.frameStyle = 'polaroid'
  galForm.rotation = 0
  galForm.captionSv = ''
  galForm.captionEn = ''
  galForm.altTextSv = ''
  galForm.altTextEn = ''
  galForm.postToSocials = false
  selectedGalTags.value = availableGalTags.value.map((t) => t.tag)
  editingGal.value = 'new'
}

const openEditGal = (g: any) => {
  if (editingGal.value !== null && editingGal.value !== g.id) {
    const ok = confirm('⚠️ Du har redan ett öppet galleriformulär.\n\nVill du avbryta och redigera denna bild istället?')
    if (!ok) return
  }
  galForm.id = g.id
  galForm.category = g.category || 'photo'
  galForm.mediaUrl = g.mediaUrl || ''
  galForm.frameStyle = g.frameStyle || 'polaroid'
  galForm.rotation = g.rotation || 0
  galForm.captionSv = g.captionSv || ''
  galForm.captionEn = g.captionEn || ''
  galForm.altTextSv = g.altTextSv || ''
  galForm.altTextEn = g.altTextEn || ''
  galForm.postToSocials = false
  selectedGalTags.value = availableGalTags.value.map((t) => t.tag)
  editingGal.value = g.id
}

const saveGalleryItem = async () => {
  if (!galForm.mediaUrl) {
    showToast('⚠️ Ange sökväg/URL till bilden!')
    return
  }
  const res = await $fetch<{ success: boolean; social?: any }>('/api/admin/gallery', {
    method: 'POST',
    body: {
      ...galForm,
      hashtags: selectedGalTags.value,
    },
  })
  editingGal.value = null
  await refreshGallery()
  if (res?.social) {
    if (res.social.success) {
      showToast(`✓ Bilden sparades! 📱 ${res.social.message}`)
    } else {
      showToast(`⚠️ Bilden sparades lokalt, men social publicering misslyckades: ${res.social.message}`)
    }
  } else {
    showToast('✓ Bilden har sparats!')
  }
}

// ---------------- SOCIAL SHARE MODAL ----------------
const shareModalOpen = ref(false)
const selectedShareItem = ref<any | null>(null)

const openShareGal = (item: any) => {
  selectedShareItem.value = item
  shareModalOpen.value = true
}

const onSocialPublished = (social: any) => {
  showToast(`✓ ${social.message || 'Bilden har publicerats på Facebook!'}`)
}

const quickChangeFrameStyle = async (item: any, newStyle: string) => {
  try {
    await $fetch('/api/admin/gallery', {
      method: 'POST',
      body: {
        ...item,
        frameStyle: newStyle,
      },
    })
    item.frameStyle = newStyle
    await refreshGallery()
    const labelMap: Record<string, string> = {
      random: '🎲 Slumpad',
      pinned: '📌 Nålat',
      polaroid: '📷 Polaroid',
      taped: '🏷️ Tejpat',
      grunge: '🎞️ Grunge',
      wood: '🖼️ Träram',
    }
    showToast(`✓ Fastsättning ändrad till ${labelMap[newStyle] || newStyle}!`)
  } catch (err: any) {
    showToast('⚠️ Kunde inte uppdatera fastsättning: ' + (err?.data?.message || err?.message || ''))
  }
}

const deleteGalleryItem = async (id: string) => {
  if (!confirm('Vill du ta bort bilden?')) return
  await $fetch('/api/admin/gallery', {
    method: 'DELETE',
    body: { id },
  })
  await refreshGallery()
  showToast('✓ Bilden raderades.')
}

onBeforeRouteLeave((to, from, next) => {
  if (editingGal.value !== null) {
    const answer = window.confirm('⚠️ Du har ett öppet bildformulär.\n\nVill du verkligen lämna sidan?')
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
    <AdminNavBar :dirty="editingGal !== null" />

    <!-- GALLERY & FAN CENTRAL MANAGER -->
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Galleri & Fan Central</h2>
          <p class="text-xs text-base-content/70">Lägg till foton, välj ramstilar (Polaroid, tejp, träram) och kategorisera fans.</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-5 cursor-pointer" @click="openAddGal">
          + Ny bild
        </button>
      </div>

      <!-- Add/Edit Gallery Modal Form -->
      <div v-if="editingGal" class="stage-card p-6 sm:p-8 rounded-2xl border border-primary/40 space-y-5 shadow-2xl">
        <div class="flex items-center justify-between border-b border-primary/20 pb-3">
          <h3 class="font-heading text-xl text-primary font-bold">
            {{ editingGal === 'new' ? 'Lägg till ny bild' : 'Redigera bild' }}
          </h3>
          <span class="badge badge-warning badge-sm font-bold animate-pulse">
            ⚠️ Osparade ändringar
          </span>
        </div>

        <div class="grid sm:grid-cols-2 gap-4 text-sm">
          <!-- Image File Uploader & URL Input -->
          <div class="sm:col-span-2 flex flex-col sm:flex-row items-center gap-6 p-4 bg-base-200/60 rounded-xl border border-primary/20">
            <div
              v-if="galForm.mediaUrl"
              class="w-32 flex-shrink-0"
            >
              <FramedPhoto
                :media-url="galForm.mediaUrl"
                :frame-style="galForm.frameStyle || 'random'"
                :rotation="galForm.rotation || 0"
                pin-color="gold"
              />
            </div>
            <div class="flex-grow space-y-2 w-full">
              <label class="block text-xs font-bold text-secondary">Bildfil / Media URL *</label>
              <div class="flex items-center gap-2">
                <input v-model="galForm.mediaUrl" type="text" placeholder="/media/band/bild.jpg" class="input input-bordered flex-grow bg-base-200 input-sm font-mono text-xs" />
                <label class="btn btn-outline btn-primary btn-sm rounded-lg cursor-pointer whitespace-nowrap" :class="isUploading ? 'loading' : ''">
                  <span>📁 Ladda upp</span>
                  <input type="file" accept="image/*" class="hidden" @change="uploadFile($event, url => galForm.mediaUrl = url)" />
                </label>
              </div>
              <p class="text-[10px] text-base-content/60">Välj en bildfil från datorn eller klistra in en bildlänk.</p>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Kategori</label>
            <select v-model="galForm.category" class="select select-bordered w-full bg-base-200 select-sm">
              <option value="photo">Vanligt galleri (live & rep)</option>
              <option value="fan_central">Fan Central (publik & bordsfläktar)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Ramstil (visual frame)</label>
            <select v-model="galForm.frameStyle" class="select select-bordered w-full bg-base-200 select-sm">
              <option value="random">🎲 Slumpad ramstil (Auto-variation)</option>
              <option value="pinned">📌 Nålat (3D Kartnål / Pushpin)</option>
              <option value="polaroid">📷 Vintage Polaroid (med tejp)</option>
              <option value="taped">🏷️ Scenprint (mörk med tejpade hörn)</option>
              <option value="grunge">🎞️ Sliten mörkrumskant (grunge)</option>
              <option value="wood">🖼️ Klassisk trä- & mässingsram</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Lutning / rotation (-3° till 3°)</label>
            <input v-model.number="galForm.rotation" type="number" min="-5" max="5" class="input input-bordered w-full bg-base-200 input-sm font-mono" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Bildtext (svenska)</label>
            <input v-model="galForm.captionSv" type="text" placeholder="Hela gänget samlat inför sommarsäsongen..." class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Bildtext (engelska / English)</label>
            <input v-model="galForm.captionEn" type="text" placeholder="The whole band gathered before the summer season..." class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Alt-text (svenska / tillgänglighet)</label>
            <input v-model="galForm.altTextSv" type="text" placeholder="Det 7:e Gunget live på scen" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Alt-text (engelska / accessibility)</label>
            <input v-model="galForm.altTextEn" type="text" placeholder="Det 7:e Gunget performing live on stage" class="input input-bordered w-full bg-base-200 input-sm" />
          </div>

          <!-- Social Sharing & Hashtags Toggle -->
          <div class="sm:col-span-2 p-4 bg-base-200/80 rounded-xl border border-primary/20 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-bold text-xs text-primary flex items-center gap-1">
                  <span>📱</span> Publicera automatiskt på Facebook & Instagram
                </span>
                <p class="text-[11px] text-base-content/60">
                  Skapar ett färdigt foto-inlägg med bild och text när du sparar bilden.
                </p>
              </div>
              <input v-model="galForm.postToSocials" type="checkbox" class="toggle toggle-primary toggle-sm" />
            </div>

            <!-- Hashtag Selector for this Photo Post -->
            <div v-if="galForm.postToSocials" class="pt-2 border-t border-primary/10 space-y-2">
              <label class="block text-[11px] font-bold text-secondary">
                Välj hashtags för detta inlägg:
              </label>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="t in availableGalTags"
                  :key="t.id"
                  type="button"
                  class="btn btn-xs rounded-full cursor-pointer font-mono"
                  :class="selectedGalTags.includes(t.tag) ? 'btn-primary font-bold' : 'btn-ghost border border-base-content/20 text-base-content/70'"
                  @click="toggleGalTag(t.tag)"
                >
                  {{ t.tag }}
                </button>
              </div>

              <!-- Live Preview of Social Post -->
              <div class="mt-3 p-3 bg-base-300/80 rounded-lg text-xs space-y-1">
                <span class="text-[10px] font-mono uppercase text-secondary font-bold block">
                  Förhandsgranskning av inlägg:
                </span>
                <p class="text-base-content/90 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                  {{ galSocialPreview }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3 pt-3">
          <button type="button" class="btn btn-primary btn-sm rounded-full font-bold px-6 cursor-pointer" @click="saveGalleryItem">
            Spara bild
          </button>
          <button type="button" class="btn btn-ghost btn-sm rounded-full cursor-pointer" @click="editingGal = null">
            Avbryt
          </button>
        </div>
      </div>

      <!-- Gallery Grid Preview in Admin -->
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="item in galleryItems || []"
          :key="item.id"
          class="stage-card p-4 rounded-2xl border border-primary/20 flex flex-col justify-between"
        >
          <div>
            <div class="pt-2 pb-1">
              <FramedPhoto
                :media-url="item.mediaUrl"
                :caption-sv="item.captionSv"
                :caption-en="item.captionEn"
                :frame-style="item.frameStyle || 'random'"
                :rotation="item.rotation || 0"
                pin-color="random"
                class="mb-3"
              />
            </div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="badge badge-xs font-mono font-bold uppercase text-[9px]">
                {{ item.category }}
              </span>
              <span class="text-[10px] font-mono text-secondary">
                Ram: {{ item.frameStyle || 'random' }}
              </span>
            </div>
            <p class="text-xs text-base-content/80 italic line-clamp-2">
              {{ item.captionSv || 'Ingen bildtext' }}
            </p>
          </div>

          <div class="pt-3 border-t border-base-content/10 flex items-center justify-between gap-2 mt-4">
            <!-- Quick Frame Style Selector Dropdown (Left side) -->
            <div class="flex items-center gap-1.5 flex-grow max-w-[150px]">
              <select
                :value="item.frameStyle || 'random'"
                class="select select-bordered select-xs w-full bg-base-200 text-[11px] font-sans border-primary/40 focus:border-primary rounded-lg cursor-pointer font-bold"
                title="Ändra fastsättning / ramstil direkt"
                @change="quickChangeFrameStyle(item, ($event.target as HTMLSelectElement).value)"
              >
                <option value="random">🎲 Slumpad</option>
                <option value="pinned">📌 Nålat</option>
                <option value="polaroid">📷 Polaroid</option>
                <option value="taped">🏷️ Tejpat</option>
                <option value="grunge">🎞️ Grunge</option>
                <option value="wood">🖼️ Träram</option>
              </select>
            </div>

            <!-- Action buttons (Right side) -->
            <div class="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                class="btn btn-xs btn-outline btn-secondary rounded cursor-pointer inline-flex items-center justify-center gap-1.5 font-sans"
                title="Dela bilden till Facebook & Sociala medier"
                @click="openShareGal(item)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="6" r="3" />
                  <circle cx="18" cy="18" r="3" />
                  <line x1="8.7" y1="10.7" x2="15.3" y2="7.3" />
                  <line x1="8.7" y1="13.3" x2="15.3" y2="16.7" />
                </svg>
                <span>Dela</span>
              </button>
              <button
                type="button"
                class="btn btn-xs btn-outline btn-primary rounded cursor-pointer inline-flex items-center justify-center font-sans"
                @click="openEditGal(item)"
              >
                Redigera
              </button>
              <button
                type="button"
                class="btn btn-xs btn-outline btn-error rounded cursor-pointer inline-flex items-center justify-center font-sans"
                @click="deleteGalleryItem(item.id)"
              >
                Ta bort
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SOCIAL SHARE MODAL -->
    <AdminSocialShareModal
      v-model="shareModalOpen"
      type="gallery"
      :item="selectedShareItem"
      @published="onSocialPublished"
    />
  </div>
</template>

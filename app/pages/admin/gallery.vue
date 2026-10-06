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
  headers: { 'Cache-Control': 'no-cache' },
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
const isAnalyzingResolution = ref(false)

// Automagiskt läs av bildens pixeldimensioner, filstorlek och DPI
const inspectImageResolution = async (urlOrFile: string | File): Promise<string | null> => {
  try {
    let width = 0
    let height = 0
    let sizeStr = ''

    if (urlOrFile instanceof File) {
      const file = urlOrFile
      sizeStr = file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`

      const objectUrl = URL.createObjectURL(file)
      await new Promise<void>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          width = img.naturalWidth
          height = img.naturalHeight
          URL.revokeObjectURL(objectUrl)
          resolve()
        }
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl)
          reject(new Error('Kunde inte läsa bildfilen'))
        }
        img.src = objectUrl
      })
    } else if (typeof urlOrFile === 'string' && urlOrFile.trim()) {
      const url = urlOrFile.trim()
      await new Promise<void>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          width = img.naturalWidth
          height = img.naturalHeight
          resolve()
        }
        img.onerror = () => {
          reject(new Error('Kunde inte läsa bilden från URL'))
        }
        img.src = url
      })

      try {
        const res = await fetch(url, { method: 'HEAD' })
        const cl = res.headers.get('content-length')
        if (cl) {
          const bytes = parseInt(cl, 10)
          if (!isNaN(bytes) && bytes > 0) {
            sizeStr = bytes >= 1024 * 1024
              ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
              : `${Math.round(bytes / 1024)} KB`
          }
        }
      } catch {
        // Ignorera HEAD-fel om CORS eller lokal relativ sökväg
      }
    }

    if (!width || !height) return null

    const parts: string[] = [`${width} × ${height} px`]
    if (sizeStr) {
      parts.push(sizeStr)
    }
    // Högupplöst för tryck (>= 2000px är standard 300 DPI för presskit)
    if (width >= 2000 || height >= 2000) {
      parts.push('300 DPI')
    }

    return parts.join(' • ')
  } catch (err) {
    console.warn('Bildanalys misslyckades:', err)
    return null
  }
}

const autoDetectResolution = async () => {
  if (!galForm.mediaUrl) {
    showToast('⚠️ Ange eller ladda upp en bild först!')
    return
  }
  isAnalyzingResolution.value = true
  try {
    const res = await inspectImageResolution(galForm.mediaUrl)
    if (res) {
      galForm.epkResolution = res
      showToast(`✓ Analyserade bild: ${res}`)
    } else {
      showToast('⚠️ Kunde inte läsa bildens mått.')
    }
  } finally {
    isAnalyzingResolution.value = false
  }
}

const uploadFile = async (event: Event, targetCallback: (url: string) => void) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const file = input.files[0]
  if (!file) return

  // Om det är en bild: analysera upplösningen automatiskt direkt från filen!
  if (file.type.startsWith('image/')) {
    inspectImageResolution(file).then((detected) => {
      if (detected) {
        if (!galForm.epkResolution || editingGal.value === 'new') {
          galForm.epkResolution = detected
        }
      }
    })
  }

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

// ---------------- GALLERY FILTER & EPK ----------------
const activeFilter = ref<'all' | 'epk' | 'documents'>('all')

// ---------------- EPK DOCUMENTS (PDF & PROMOTER ASSETS) ----------------
const { data: epkDocs, refresh: refreshDocs } = await useFetch<any[]>('/api/admin/epk/documents')

const editingDoc = ref<string | null>(null)
const docForm = reactive({
  id: '',
  titleSv: '',
  titleEn: '',
  descriptionSv: '',
  descriptionEn: '',
  fileUrl: '',
  fileType: 'pdf',
  fileSize: '',
  category: 'poster',
  sortOrder: 0,
  isActive: true,
})

const openAddDoc = () => {
  docForm.id = ''
  docForm.titleSv = ''
  docForm.titleEn = ''
  docForm.descriptionSv = ''
  docForm.descriptionEn = ''
  docForm.fileUrl = ''
  docForm.fileType = 'pdf'
  docForm.fileSize = ''
  docForm.category = 'poster'
  docForm.sortOrder = (epkDocs.value || []).length + 1
  docForm.isActive = true
  editingDoc.value = 'new'
}

const openEditDoc = (doc: any) => {
  docForm.id = doc.id
  docForm.titleSv = doc.titleSv || ''
  docForm.titleEn = doc.titleEn || ''
  docForm.descriptionSv = doc.descriptionSv || ''
  docForm.descriptionEn = doc.descriptionEn || ''
  docForm.fileUrl = doc.fileUrl || ''
  docForm.fileType = doc.fileType || 'pdf'
  docForm.fileSize = doc.fileSize || ''
  docForm.category = doc.category || 'poster'
  docForm.sortOrder = doc.sortOrder ?? 0
  docForm.isActive = Boolean(doc.isActive)
  editingDoc.value = doc.id
}

const saveDoc = async () => {
  if (!docForm.titleSv.trim()) {
    showToast('⚠️ Ange en dokumenttitel på svenska!')
    return
  }
  if (!docForm.fileUrl.trim()) {
    showToast('⚠️ Ladda upp eller ange en fil-URL!')
    return
  }

  try {
    await $fetch('/api/admin/epk/documents', {
      method: 'POST',
      body: { ...docForm },
    })
    editingDoc.value = null
    await refreshDocs()
    showToast('✓ Arrangörsdokumentet har sparats!')
  } catch (err: any) {
    showToast(`⚠️ Kunde inte spara dokument: ${err?.data?.message || err?.message || 'Fel'}`)
  }
}

const deleteDoc = async (id: string) => {
  if (!confirm('Vill du verkligen ta bort detta dokument?')) return
  try {
    await $fetch('/api/admin/epk/documents', {
      method: 'DELETE',
      body: { id },
    })
    await refreshDocs()
    showToast('✓ Dokumentet raderades.')
  } catch (err: any) {
    showToast(`⚠️ Kunde inte radera: ${err?.data?.message || err?.message || 'Fel'}`)
  }
}

const toggleDocActive = async (doc: any) => {
  try {
    const res = await $fetch<{ success: boolean; isActive: boolean }>('/api/admin/epk/documents/toggle-active', {
      method: 'POST',
      body: { id: doc.id },
    })
    if (res.success) {
      doc.isActive = res.isActive
      showToast(res.isActive ? '✓ Dokumentet visas nu på /epk!' : '✓ Dokumentet doldes från /epk.')
    }
  } catch (err: any) {
    showToast(`⚠️ Kunde inte uppdatera status: ${err.message}`)
  }
}

const filteredGalleryItems = computed(() => {
  const items = galleryItems.value || []
  if (activeFilter.value === 'epk') {
    return items.filter((item: any) => item.isEpk)
  }
  return items
})

const epkCount = computed(() => {
  return (galleryItems.value || []).filter((item: any) => item.isEpk).length
})

const toggleEpk = async (item: any) => {
  try {
    let resolutionToSend = item.epkResolution
    if (!item.isEpk && !resolutionToSend && item.mediaUrl) {
      const detected = await inspectImageResolution(item.mediaUrl)
      if (detected) {
        resolutionToSend = detected
      }
    }

    const res = await $fetch<{ success: boolean; isEpk: boolean; epkResolution?: string }>('/api/admin/gallery/toggle-epk', {
      method: 'POST',
      body: { id: item.id, resolution: resolutionToSend },
    })
    if (res.success) {
      item.isEpk = res.isEpk
      if (res.epkResolution) {
        item.epkResolution = res.epkResolution
      }
      showToast(res.isEpk ? `✓ Bilden har lagts till i Presskit! (📐 ${item.epkResolution || 'EPK'})` : '✓ Bilden togs bort från Presskit.')
    }
  } catch (err: any) {
    showToast(`⚠️ Kunde inte uppdatera EPK-status: ${err.message}`)
  }
}

watch(() => galForm.isEpk, async (isEpk) => {
  if (isEpk && !galForm.epkResolution && galForm.mediaUrl) {
    const res = await inspectImageResolution(galForm.mediaUrl)
    if (res) galForm.epkResolution = res
  }
})

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
  isEpk: false,
  epkTitleSv: '',
  epkTitleEn: '',
  epkResolution: '',
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
  galForm.isEpk = activeFilter.value === 'epk'
  galForm.epkTitleSv = ''
  galForm.epkTitleEn = ''
  galForm.epkResolution = ''
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
  galForm.isEpk = Boolean(g.isEpk)
  galForm.epkTitleSv = g.epkTitleSv || ''
  galForm.epkTitleEn = g.epkTitleEn || ''
  galForm.epkResolution = g.epkResolution || ''
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
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="font-heading text-2xl text-primary font-bold">Galleri, Presskit & Arrangörsresurser</h2>
          <p class="text-xs text-base-content/70">Hantera foton, ramstilar, pressbilder och arrangörsdokument (PDF/affischer) för EPK.</p>
        </div>
        <button
          v-if="activeFilter === 'documents'"
          type="button"
          class="btn btn-warning btn-sm rounded-full font-bold px-5 cursor-pointer self-start sm:self-auto text-warning-content shadow"
          @click="openAddDoc"
        >
          + Nytt dokument / PDF
        </button>
        <button
          v-else
          type="button"
          class="btn btn-primary btn-sm rounded-full font-bold px-5 cursor-pointer self-start sm:self-auto"
          @click="openAddGal"
        >
          + Ny bild
        </button>
      </div>

      <!-- Filter Tabs: Alla vs Presskit / Foton vs Arrangörsdokument -->
      <div class="flex items-center gap-2 border-b border-primary/20 pb-3 overflow-x-auto">
        <button
          type="button"
          class="btn btn-sm rounded-xl cursor-pointer whitespace-nowrap"
          :class="activeFilter === 'all' ? 'btn-primary font-bold shadow-md' : 'btn-ghost text-base-content/70'"
          @click="activeFilter = 'all'"
        >
          🖼️ Alla bilder ({{ (galleryItems || []).length }})
        </button>
        <button
          type="button"
          class="btn btn-sm rounded-xl cursor-pointer whitespace-nowrap"
          :class="activeFilter === 'epk' ? 'btn-warning font-bold text-warning-content shadow-md' : 'btn-ghost text-base-content/70'"
          @click="activeFilter = 'epk'"
        >
          ⭐ Presskit / Foton ({{ epkCount }})
        </button>
        <button
          type="button"
          class="btn btn-sm rounded-xl cursor-pointer whitespace-nowrap"
          :class="activeFilter === 'documents' ? 'btn-secondary font-bold text-secondary-content shadow-md' : 'btn-ghost text-base-content/70'"
          @click="activeFilter = 'documents'"
        >
          📄 Arrangörsdokument / PDF ({{ (epkDocs || []).length }})
        </button>
      </div>

      <!-- ============================================================= -->
      <!-- PHOTO GALLERY & FAN CENTRAL VIEW -->
      <!-- ============================================================= -->
      <div v-if="activeFilter !== 'documents'" class="space-y-6">
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
                <input v-model="galForm.mediaUrl" type="text" placeholder="/media/band/bild.jpg" class="input input-bordered flex-grow bg-base-200 input-sm font-mono text-xs" >
                <label class="btn btn-outline btn-primary btn-sm rounded-lg cursor-pointer whitespace-nowrap" :class="isUploading ? 'loading' : ''">
                  <span>📁 Ladda upp</span>
                  <input type="file" accept="image/*" class="hidden" @change="uploadFile($event, url => galForm.mediaUrl = url)" >
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
            <input v-model.number="galForm.rotation" type="number" min="-5" max="5" class="input input-bordered w-full bg-base-200 input-sm font-mono" >
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Bildtext (svenska)</label>
            <input v-model="galForm.captionSv" type="text" placeholder="Hela gänget samlat inför sommarsäsongen..." class="input input-bordered w-full bg-base-200 input-sm" >
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Bildtext (engelska / English)</label>
            <input v-model="galForm.captionEn" type="text" placeholder="The whole band gathered before the summer season..." class="input input-bordered w-full bg-base-200 input-sm" >
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Alt-text (svenska / tillgänglighet)</label>
            <input v-model="galForm.altTextSv" type="text" placeholder="Det 7:e Gunget live på scen" class="input input-bordered w-full bg-base-200 input-sm" >
          </div>
          <div>
            <label class="block text-xs font-bold text-secondary mb-1">Alt-text (engelska / accessibility)</label>
            <input v-model="galForm.altTextEn" type="text" placeholder="Det 7:e Gunget performing live on stage" class="input input-bordered w-full bg-base-200 input-sm" >
          </div>

          <!-- EPK / Presskit Toggle & Metadata -->
          <div class="sm:col-span-2 p-4 bg-warning/10 rounded-xl border border-warning/30 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-bold text-xs text-warning flex items-center gap-1.5">
                  <span>⭐</span> Visa i officiellt Presskit (EPK) & arrangörsmaterial
                </span>
                <p class="text-[11px] text-base-content/70">
                  När detta är aktiverat görs bilden nedladdningsbar i full upplösning för arrangörer och press på <code>/epk</code>.
                </p>
              </div>
              <input v-model="galForm.isEpk" type="checkbox" class="toggle toggle-warning toggle-sm" >
            </div>
            <div v-if="galForm.isEpk" class="grid sm:grid-cols-3 gap-3 pt-2 border-t border-warning/20">
              <div>
                <label class="block text-[11px] font-bold text-warning mb-1">EPK-titel (svenska)</label>
                <input v-model="galForm.epkTitleSv" type="text" placeholder="T.ex. Bandfoto (Liggande)" class="input input-bordered w-full bg-base-200 input-sm" >
              </div>
              <div>
                <label class="block text-[11px] font-bold text-warning mb-1">EPK-titel (engelska)</label>
                <input v-model="galForm.epkTitleEn" type="text" placeholder="E.g. Band Portrait (Landscape)" class="input input-bordered w-full bg-base-200 input-sm" >
              </div>
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-[11px] font-bold text-warning">Upplösning / Format</label>
                  <button
                    v-if="galForm.mediaUrl"
                    type="button"
                    class="btn btn-xs btn-ghost text-warning hover:bg-warning/20 p-0 h-auto font-mono text-[10px] underline flex items-center gap-1 cursor-pointer"
                    :class="isAnalyzingResolution ? 'loading' : ''"
                    title="Analysera bildens faktiska dimensioner och filstorlek"
                    @click="autoDetectResolution"
                  >
                    <span>⚡ Hämta från bild</span>
                  </button>
                </div>
                <div class="relative">
                  <input
                    v-model="galForm.epkResolution"
                    type="text"
                    placeholder="T.ex. 6000 × 4000 px • 4.3 MB • 300 DPI"
                    class="input input-bordered w-full bg-base-200 input-sm font-mono text-xs pr-8"
                  >
                  <button
                    v-if="galForm.mediaUrl"
                    type="button"
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-warning/70 hover:text-warning text-xs cursor-pointer"
                    title="Klicka för att analysera bilden automatiskt"
                    @click="autoDetectResolution"
                  >
                    🔍
                  </button>
                </div>
              </div>
            </div>
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
              <input v-model="galForm.postToSocials" type="checkbox" class="toggle toggle-primary toggle-sm" >
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
      <div v-if="filteredGalleryItems.length === 0" class="text-center py-12 border border-dashed border-base-content/20 rounded-2xl text-base-content/60">
        <p class="text-sm">Inga bilder hittades för valt filter.</p>
      </div>
      <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="item in filteredGalleryItems"
          :key="item.id"
          class="stage-card p-4 rounded-2xl border flex flex-col justify-between"
          :class="item.isEpk ? 'border-warning/50 bg-warning/5' : 'border-primary/20'"
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
              <div class="flex items-center gap-1.5">
                <span class="badge badge-xs font-mono font-bold uppercase text-[9px]">
                  {{ item.category }}
                </span>
                <span v-if="item.isEpk" class="badge badge-warning badge-xs font-mono font-bold text-[9px]">
                  ⭐ EPK
                </span>
              </div>
              <span class="text-[10px] font-mono text-secondary">
                Ram: {{ item.frameStyle || 'random' }}
              </span>
            </div>
            <p class="text-xs text-base-content/80 italic line-clamp-2">
              {{ item.isEpk && item.epkTitleSv ? `[EPK: ${item.epkTitleSv}] ` : '' }}{{ item.captionSv || 'Ingen bildtext' }}
            </p>
            <p v-if="item.isEpk && item.epkResolution" class="text-[10px] font-mono text-warning/80 mt-1">
              📐 {{ item.epkResolution }}
            </p>
          </div>

          <div class="pt-3 border-t border-base-content/10 flex flex-wrap items-center justify-between gap-2 mt-4">
            <!-- Quick Frame Style Selector Dropdown (Left side) -->
            <div class="flex items-center gap-1.5 flex-grow max-w-[130px]">
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
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                class="btn btn-xs rounded cursor-pointer inline-flex items-center gap-1 font-sans"
                :class="item.isEpk ? 'btn-warning font-bold' : 'btn-ghost border border-base-content/20 text-base-content/70'"
                :title="item.isEpk ? 'Ta bort från presskit' : 'Lägg till i presskit'"
                @click="toggleEpk(item)"
              >
                <span>{{ item.isEpk ? '⭐ EPK' : '☆ EPK' }}</span>
              </button>
              <button
                type="button"
                class="btn btn-xs btn-outline btn-secondary rounded cursor-pointer inline-flex items-center justify-center gap-1 font-sans"
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

      <!-- ============================================================= -->
      <!-- ORGANIZER DOCUMENTS (PDF & EPK ASSETS) VIEW -->
      <!-- ============================================================= -->
      <div v-else-if="activeFilter === 'documents'" class="space-y-6">
        <!-- Add/Edit Document Form -->
        <div v-if="editingDoc" class="stage-card p-6 sm:p-8 rounded-2xl border border-secondary/40 space-y-5 shadow-2xl bg-base-200/90">
          <div class="flex items-center justify-between border-b border-secondary/20 pb-3">
            <h3 class="font-heading text-xl text-secondary font-bold">
              {{ editingDoc === 'new' ? 'Lägg till nytt arrangörsdokument' : 'Redigera arrangörsdokument' }}
            </h3>
            <span class="badge badge-warning badge-sm font-bold animate-pulse">
              ⚠️ Osparade ändringar
            </span>
          </div>

          <div class="grid sm:grid-cols-2 gap-4 text-sm">
            <!-- File Upload & URL -->
            <div class="sm:col-span-2 p-4 bg-base-300/60 rounded-xl border border-secondary/20 space-y-2">
              <label class="block text-xs font-bold text-secondary">Dokumentfil (PDF, DOC, bild etc.) *</label>
              <div class="flex items-center gap-2">
                <input v-model="docForm.fileUrl" type="text" placeholder="/media/uploads/affisch.pdf eller URL" class="input input-bordered flex-grow bg-base-200 input-sm font-mono text-xs" >
                <label class="btn btn-outline btn-secondary btn-sm rounded-lg cursor-pointer whitespace-nowrap" :class="isUploading ? 'loading' : ''">
                  <span>📁 Ladda upp fil</span>
                  <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip" class="hidden" @change="uploadFile($event, url => { docForm.fileUrl = url; if (url.endsWith('.pdf')) docForm.fileType = 'pdf'; })" >
                </label>
              </div>
              <p class="text-[10px] text-base-content/60">Ladda upp en PDF från datorn eller klistra in en direktlänk.</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-secondary mb-1">Dokumenttitel (svenska) *</label>
              <input v-model="docForm.titleSv" type="text" placeholder="T.ex. Officiell Konsertaffisch (A3-mall)" class="input input-bordered w-full bg-base-200 input-sm" >
            </div>
            <div>
              <label class="block text-xs font-bold text-secondary mb-1">Dokumenttitel (engelska)</label>
              <input v-model="docForm.titleEn" type="text" placeholder="E.g. Official Concert Poster Template" class="input input-bordered w-full bg-base-200 input-sm" >
            </div>

            <div>
              <label class="block text-xs font-bold text-secondary mb-1">Kategori</label>
              <select v-model="docForm.category" class="select select-bordered w-full bg-base-200 select-sm">
                <option value="poster">🎨 Affisch & Grafik (Poster)</option>
                <option value="rider">🎛️ Teknisk Rider & Scenplot</option>
                <option value="contract">📝 Avtalsbilaga & Villkor</option>
                <option value="press_release">📰 Pressmeddelande / Bio</option>
                <option value="other">📁 Övrigt arrangörsmaterial</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-secondary mb-1">Format / Storlek / Upplösning</label>
              <input v-model="docForm.fileSize" type="text" placeholder="T.ex. A3 Tryck-PDF • 300 DPI eller 2.4 MB" class="input input-bordered w-full bg-base-200 input-sm" >
            </div>

            <div>
              <label class="block text-xs font-bold text-secondary mb-1">Beskrivning (svenska)</label>
              <textarea v-model="docForm.descriptionSv" rows="2" placeholder="Kort instruktion till arrangören..." class="textarea textarea-bordered w-full bg-base-200 text-xs"/>
            </div>
            <div>
              <label class="block text-xs font-bold text-secondary mb-1">Beskrivning (engelska)</label>
              <textarea v-model="docForm.descriptionEn" rows="2" placeholder="Brief note for promoters in English..." class="textarea textarea-bordered w-full bg-base-200 text-xs"/>
            </div>

            <div class="sm:col-span-2 flex items-center justify-between p-3 bg-base-300/40 rounded-xl border border-secondary/20">
              <div>
                <span class="font-bold text-xs text-secondary">Aktiv och synlig på /epk</span>
                <p class="text-[10px] text-base-content/60">Gör dokumentet nedladdningsbart i arrangörsöversikten på webbplatsen.</p>
              </div>
              <input v-model="docForm.isActive" type="checkbox" class="toggle toggle-secondary toggle-sm" >
            </div>
          </div>

          <div class="flex items-center gap-3 pt-3">
            <button type="button" class="btn btn-secondary btn-sm rounded-full font-bold px-6 cursor-pointer text-secondary-content" @click="saveDoc">
              Spara dokument
            </button>
            <button type="button" class="btn btn-ghost btn-sm rounded-full cursor-pointer" @click="editingDoc = null">
              Avbryt
            </button>
          </div>
        </div>

        <!-- Documents List -->
        <div v-if="(epkDocs || []).length === 0" class="text-center py-12 border border-dashed border-base-content/20 rounded-2xl text-base-content/60">
          <p class="text-sm">Inga arrangörsdokument uppladdade ännu.</p>
          <button type="button" class="btn btn-secondary btn-sm rounded-full mt-3 font-bold text-secondary-content" @click="openAddDoc">
            + Lägg till första dokumentet
          </button>
        </div>
        <div v-else class="grid sm:grid-cols-2 gap-4">
          <div
            v-for="doc in epkDocs"
            :key="doc.id"
            class="stage-card p-5 rounded-2xl border flex flex-col justify-between space-y-4"
            :class="doc.isActive ? 'border-secondary/30 bg-base-200/80' : 'border-base-content/10 bg-base-200/40 opacity-70'"
          >
            <div class="flex items-start gap-3">
              <div class="w-12 h-12 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center flex-shrink-0 text-xl">
                📄
              </div>
              <div class="space-y-1 flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <h4 class="font-heading font-bold text-sm text-primary truncate" :title="doc.titleSv">
                    {{ doc.titleSv }}
                  </h4>
                  <span
                    class="badge badge-xs font-mono font-bold uppercase text-[9px]"
                    :class="doc.isActive ? 'badge-secondary' : 'badge-ghost'"
                  >
                    {{ doc.isActive ? 'Aktiv' : 'Dold' }}
                  </span>
                </div>
                <p v-if="doc.descriptionSv" class="text-xs text-base-content/70 line-clamp-2">
                  {{ doc.descriptionSv }}
                </p>
                <div class="flex items-center gap-3 text-[10px] font-mono text-base-content/60 pt-1">
                  <span v-if="doc.fileSize" class="text-secondary font-bold">📐 {{ doc.fileSize }}</span>
                  <span>Kategori: {{ doc.category }}</span>
                </div>
              </div>
            </div>

            <div class="pt-3 border-t border-base-content/10 flex items-center justify-between gap-2">
              <button
                type="button"
                class="btn btn-xs rounded cursor-pointer inline-flex items-center gap-1 font-sans"
                :class="doc.isActive ? 'btn-secondary text-secondary-content font-bold' : 'btn-ghost border border-base-content/20 text-base-content/70'"
                @click="toggleDocActive(doc)"
              >
                {{ doc.isActive ? '✓ Visas i EPK' : '☆ Dold i EPK' }}
              </button>

              <div class="flex items-center gap-1.5">
                <a
                  :href="doc.fileUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-xs btn-outline btn-ghost rounded text-xs"
                >
                  👁️ Öppna
                </a>
                <button
                  type="button"
                  class="btn btn-xs btn-outline btn-primary rounded cursor-pointer"
                  @click="openEditDoc(doc)"
                >
                  Redigera
                </button>
                <button
                  type="button"
                  class="btn btn-xs btn-outline btn-error rounded cursor-pointer"
                  @click="deleteDoc(doc.id)"
                >
                  Ta bort
                </button>
              </div>
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

<script setup lang="ts">
export interface EpkDocument {
  id: string
  titleSv: string
  titleEn?: string | null
  descriptionSv?: string | null
  descriptionEn?: string | null
  fileUrl: string
  fileType?: string | null
  fileSize?: string | null
  category?: string | null
  sortOrder?: number | null
  isActive?: boolean | number | null
}

defineProps<{
  documents: EpkDocument[]
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'toast', message: string): void
}>()

const { isUploading, uploadAdminFile } = useAdminUpload()
const { translate, isFieldTranslating } = useTranslation()

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

const translateField = async (sourceText: string, targetSetter: (val: string) => void, fieldId: string) => {
  if (!sourceText || !sourceText.trim()) {
    emit('toast', '⚠️ Fyll i det svenska fältet först!')
    return
  }
  try {
    emit('toast', '⏳ Översätter till engelska med AI...')
    const res = await translate(sourceText, fieldId)
    targetSetter(res)
    emit('toast', '✓ Översatt till engelska!')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Kunde inte översätta'
    emit('toast', `⚠️ ${msg}`)
  }
}

const uploadDocFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const file = input.files[0]
  if (!file) return

  try {
    emit('toast', `⏳ Laddar upp ${file.name}...`)
    const url = await uploadAdminFile(file)
    docForm.fileUrl = url
    if (url.endsWith('.pdf')) {
      docForm.fileType = 'pdf'
    }
    emit('toast', '✓ Dokumentfilen har laddats upp!')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Fel vid uppladdning'
    emit('toast', `⚠️ Uppladdning misslyckades: ${msg}`)
  } finally {
    input.value = ''
  }
}

const openAddDoc = (currentCount = 0) => {
  docForm.id = ''
  docForm.titleSv = ''
  docForm.titleEn = ''
  docForm.descriptionSv = ''
  docForm.descriptionEn = ''
  docForm.fileUrl = ''
  docForm.fileType = 'pdf'
  docForm.fileSize = ''
  docForm.category = 'poster'
  docForm.sortOrder = currentCount + 1
  docForm.isActive = true
  editingDoc.value = 'new'
  nextTick(() => {
    if (import.meta.client) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  })
}

const openEditDoc = (doc: EpkDocument) => {
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
  nextTick(() => {
    if (import.meta.client) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  })
}

const saveDoc = async () => {
  if (!docForm.titleSv.trim()) {
    emit('toast', '⚠️ Ange en dokumenttitel på svenska!')
    return
  }
  if (!docForm.fileUrl.trim()) {
    emit('toast', '⚠️ Ladda upp eller ange en fil-URL!')
    return
  }

  try {
    await $fetch('/api/admin/epk/documents', {
      method: 'POST',
      body: { ...docForm },
    })
    editingDoc.value = null
    emit('refresh')
    emit('toast', '✓ Arrangörsdokumentet har sparats!')
  } catch (err: unknown) {
    const errorObj = err as { data?: { message?: string }; message?: string }
    emit('toast', `⚠️ Kunde inte spara dokument: ${errorObj?.data?.message || errorObj?.message || 'Fel'}`)
  }
}

const deleteDoc = async (id: string) => {
  if (!confirm('Vill du verkligen ta bort detta dokument?')) return
  try {
    await $fetch('/api/admin/epk/documents', {
      method: 'DELETE',
      body: { id },
    })
    emit('refresh')
    emit('toast', '✓ Dokumentet raderades.')
  } catch (err: unknown) {
    const errorObj = err as { data?: { message?: string }; message?: string }
    emit('toast', `⚠️ Kunde inte radera: ${errorObj?.data?.message || errorObj?.message || 'Fel'}`)
  }
}

const toggleDocActive = async (doc: EpkDocument) => {
  try {
    const res = await $fetch<{ success: boolean; isActive: boolean }>('/api/admin/epk/documents/toggle-active', {
      method: 'POST',
      body: { id: doc.id },
    })
    if (res.success) {
      doc.isActive = res.isActive
      emit('toast', res.isActive ? '✓ Dokumentet visas nu på /epk!' : '✓ Dokumentet doldes från /epk.')
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Fel'
    emit('toast', `⚠️ Kunde inte uppdatera status: ${msg}`)
  }
}

defineExpose({
  openAddDoc,
})
</script>

<template>
  <div class="space-y-6">
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
            <input v-model="docForm.fileUrl" type="text" placeholder="/media/uploads/affisch.pdf eller URL" class="input input-bordered flex-grow bg-base-200 input-sm font-mono text-xs">
            <label class="btn btn-outline btn-secondary btn-sm rounded-lg cursor-pointer whitespace-nowrap" :class="isUploading ? 'loading' : ''">
              <span>📁 Ladda upp fil</span>
              <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip" class="hidden" @change="uploadDocFile">
            </label>
          </div>
          <p class="text-[10px] text-base-content/60">Ladda upp en PDF från datorn eller klistra in en direktlänk.</p>
        </div>

        <div>
          <label class="block text-xs font-bold text-secondary mb-1">Dokumenttitel (svenska) *</label>
          <input v-model="docForm.titleSv" type="text" placeholder="T.ex. Officiell Konsertaffisch (A3-mall)" class="input input-bordered w-full bg-base-200 input-sm">
        </div>
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-xs font-bold text-secondary">Dokumenttitel (engelska)</label>
            <button
              type="button"
              class="btn btn-ghost btn-xs text-secondary hover:bg-secondary/20 p-1 h-auto text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              :disabled="isFieldTranslating('docTitleEn') || !docForm.titleSv"
              title="Översätt dokumenttitel från svenska"
              @click="translateField(docForm.titleSv, (res) => docForm.titleEn = res, 'docTitleEn')"
            >
              <span v-if="isFieldTranslating('docTitleEn')" class="loading loading-spinner loading-xs" />
              <span v-else>✨</span>
              <span>Översätt från svenska</span>
            </button>
          </div>
          <input v-model="docForm.titleEn" type="text" placeholder="E.g. Official Concert Poster Template" class="input input-bordered w-full bg-base-200 input-sm">
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
          <input v-model="docForm.fileSize" type="text" placeholder="T.ex. A3 Tryck-PDF • 300 DPI eller 2.4 MB" class="input input-bordered w-full bg-base-200 input-sm">
        </div>

        <div>
          <label class="block text-xs font-bold text-secondary mb-1">Beskrivning (svenska)</label>
          <textarea v-model="docForm.descriptionSv" rows="2" placeholder="Kort instruktion till arrangören..." class="textarea textarea-bordered w-full bg-base-200 text-xs" />
        </div>
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-xs font-bold text-secondary">Beskrivning (engelska)</label>
            <button
              type="button"
              class="btn btn-ghost btn-xs text-secondary hover:bg-secondary/20 p-1 h-auto text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              :disabled="isFieldTranslating('docDescEn') || !docForm.descriptionSv"
              title="Översätt beskrivning från svenska"
              @click="translateField(docForm.descriptionSv, (res) => docForm.descriptionEn = res, 'docDescEn')"
            >
              <span v-if="isFieldTranslating('docDescEn')" class="loading loading-spinner loading-xs" />
              <span v-else>✨</span>
              <span>Översätt från svenska</span>
            </button>
          </div>
          <textarea v-model="docForm.descriptionEn" rows="2" placeholder="Brief note for promoters in English..." class="textarea textarea-bordered w-full bg-base-200 text-xs" />
        </div>

        <div class="sm:col-span-2 flex items-center justify-between p-3 bg-base-300/40 rounded-xl border border-secondary/20">
          <div>
            <span class="font-bold text-xs text-secondary">Aktiv och synlig på /epk</span>
            <p class="text-[10px] text-base-content/60">Gör dokumentet nedladdningsbart i arrangörsöversikten på webbplatsen.</p>
          </div>
          <input v-model="docForm.isActive" type="checkbox" class="toggle toggle-secondary toggle-sm">
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
    <div v-if="(documents || []).length === 0" class="text-center py-12 border border-dashed border-base-content/20 rounded-2xl text-base-content/60">
      <p class="text-sm">Inga arrangörsdokument uppladdade ännu.</p>
      <button type="button" class="btn btn-secondary btn-sm rounded-full mt-3 font-bold text-secondary-content" @click="openAddDoc(0)">
        + Lägg till första dokumentet
      </button>
    </div>
    <div v-else class="grid sm:grid-cols-2 gap-4">
      <div
        v-for="doc in documents"
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

        <div class="pt-3 border-t border-base-content/10 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            class="btn btn-xs rounded cursor-pointer inline-flex items-center gap-1 font-sans whitespace-nowrap"
            :class="doc.isActive ? 'btn-secondary text-secondary-content font-bold' : 'btn-ghost border border-base-content/20 text-base-content/70'"
            @click="toggleDocActive(doc)"
          >
            {{ doc.isActive ? '✓ Visas i EPK' : '☆ Dold i EPK' }}
          </button>

          <div class="flex items-center gap-1.5 flex-wrap">
            <a
              :href="doc.fileUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-xs btn-outline btn-ghost rounded text-xs whitespace-nowrap"
            >
              👁️ Öppna
            </a>
            <button
              type="button"
              class="btn btn-xs btn-outline btn-primary rounded cursor-pointer whitespace-nowrap"
              @click="openEditDoc(doc)"
            >
              Redigera
            </button>
            <button
              type="button"
              class="btn btn-xs btn-outline btn-error rounded cursor-pointer whitespace-nowrap"
              @click="deleteDoc(doc.id)"
            >
              Ta bort
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

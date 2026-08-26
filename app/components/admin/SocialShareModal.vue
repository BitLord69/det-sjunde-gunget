<script setup lang="ts">
interface Props {
  modelValue: boolean
  type: 'gig' | 'gallery' | 'song'
  item: any
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'published', result: any): void
}>()

const { data: hashtagsData } = await useFetch<any[]>('/api/admin/hashtags', { default: () => [] })
const allHashtags = computed<any[]>(() => (Array.isArray(hashtagsData.value) ? hashtagsData.value : []))

const selectedTags = ref<string[]>([])
const customNotes = ref('')
const isPublishing = ref(false)
const publishResult = ref<{ success: boolean; message: string } | null>(null)

const availableTags = computed(() => {
  return allHashtags.value.filter((t) => {
    if (!t.isActive) return false
    if (!t.category || t.category === 'all') return true
    const cats = t.category.split(',').map((s: string) => s.trim())
    return cats.includes(props.type)
  })
})

const toggleTag = (tag: string) => {
  if (selectedTags.value.includes(tag)) {
    selectedTags.value = selectedTags.value.filter((t) => t !== tag)
  } else {
    selectedTags.value.push(tag)
  }
}

watch(
  () => props.item,
  (newItem) => {
    publishResult.value = null
    if (!newItem) return
    selectedTags.value = availableTags.value.map((t) => t.tag)
    customNotes.value = props.type === 'gig' ? (newItem.notesSv || '') : props.type === 'gallery' ? (newItem.captionSv || '') : ''
  },
  { immediate: true },
)

const previewText = computed(() => {
  if (!props.item) return ''
  const tagsStr = selectedTags.value.join(' ')

  if (props.type === 'gig') {
    const venue = props.item.venue || 'Spelplats'
    const city = props.item.city || 'Stad'
    const dateStr = props.item.date
      ? new Date(props.item.date).toLocaleDateString('sv-SE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : ''
    return `🎸 NYTT GIG MED DET 7:E GUNGET! 🎸\n\n📍 Spelplats: ${venue}, ${city}\n📅 Datum: ${dateStr}${customNotes.value ? `\n\n"${customNotes.value}"` : ''}\n\n${props.item.ticketUrl ? `🎟️ Biljetter: ${props.item.ticketUrl}` : '👉 Mer info: https://det7egunget.se/gigs'}\n\nKom och sväng med oss! 🎶\n${tagsStr}`
  }

  if (props.type === 'gallery') {
    const caption = customNotes.value.trim() || props.item.captionSv || 'Ny bild från scenen & replokalen med Det 7:e Gunget!'
    return `📷 NYTT I GALLERIET!\n\n"${caption}"\n\nKolla in fler bilder och ögonblick på vår webbplats! 🎸✨\n\nhttps://det7egunget.se/gallery\n\n${tagsStr}`
  }

  if (props.type === 'song') {
    const title = props.item.title || 'Låt'
    const artist = props.item.isOriginal ? 'Originalkomposition av Det 7:e Gunget' : `Cover av ${props.item.originalArtist || 'Klassiker'}`
    return `🎵 NY LÅT I JUKEBOXEN!\n\n"${title}" (${artist})${customNotes.value ? `\n\n"${customNotes.value}"` : ''}\n\nLyssna direkt i retro-jukeboxen på webbplatsen! 🎸✨\n\nhttps://det7egunget.se/music\n\n${tagsStr}`
  }

  return ''
})

const doPublish = async () => {
  if (!props.item?.id) return
  isPublishing.value = true
  publishResult.value = null

  try {
    const res = await $fetch<{ success: boolean; social: any }>('/api/admin/social/broadcast', {
      method: 'POST',
      body: {
        type: props.type,
        id: props.item.id,
        customNotes: customNotes.value,
        hashtags: selectedTags.value,
      },
    })

    if (res.social?.success) {
      publishResult.value = {
        success: true,
        message: `✓ Inlägget har publicerats på Facebook! (ID: ${res.social.facebook?.id || 'OK'})`,
      }
      emit('published', res.social)
    } else {
      publishResult.value = {
        success: false,
        message: `⚠️ Publicering misslyckades: ${res.social?.message || 'Okänt fel'}`,
      }
    }
  } catch (err: any) {
    publishResult.value = {
      success: false,
      message: `⚠️ Ett serverfel uppstod: ${err?.data?.message || err?.message || 'Fel'}`,
    }
  } finally {
    isPublishing.value = false
  }
}

const close = () => {
  emit('update:modelValue', false)
}
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
    <div class="stage-card w-full max-w-2xl bg-base-100 rounded-3xl border border-primary/40 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Modal Header -->
      <div class="p-5 border-b border-primary/20 flex items-center justify-between bg-base-200/50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-xl">
            📱
          </div>
          <div>
            <h3 class="font-heading text-lg text-primary font-bold">
              Publicera till Facebook & Sociala medier
            </h3>
            <p class="text-xs text-base-content/70">
              Dela "{{ item?.title || item?.venue || 'Objekt' }}" direkt till er Facebook-sida.
            </p>
          </div>
        </div>
        <button type="button" class="btn btn-ghost btn-circle btn-sm" @click="close">
          ✕
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto space-y-5 flex-grow text-xs sm:text-sm">
        <!-- Result Alert Box -->
        <div
          v-if="publishResult"
          class="p-4 rounded-2xl border font-bold"
          :class="publishResult.success ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/10 border-rose-500/40 text-rose-400'"
        >
          {{ publishResult.message }}
        </div>

        <!-- Optional Custom Note/Text -->
        <div class="space-y-1.5">
          <label class="block font-bold text-secondary text-xs">
            Anpassad text / Bildtext (Valfritt):
          </label>
          <textarea
            v-model="customNotes"
            rows="2"
            class="textarea textarea-bordered w-full bg-base-200 text-xs"
            placeholder="Skriv ett personligt meddelande till inlägget..."
          />
        </div>

        <!-- Hashtag Selector -->
        <div class="space-y-2">
          <label class="block font-bold text-secondary text-xs">
            Välj hashtags:
          </label>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="t in availableTags"
              :key="t.id"
              type="button"
              class="btn btn-xs rounded-full font-mono cursor-pointer"
              :class="selectedTags.includes(t.tag) ? 'btn-primary font-bold' : 'btn-ghost border border-base-content/20 text-base-content/70'"
              @click="toggleTag(t.tag)"
            >
              {{ t.tag }}
            </button>
          </div>
        </div>

        <!-- Live Preview of Post -->
        <div class="space-y-1.5">
          <label class="block font-bold text-secondary text-xs flex items-center justify-between">
            <span>Förhandsgranskning av inlägg:</span>
            <span class="badge badge-outline text-[10px] font-mono">Facebook Page</span>
          </label>
          <div class="p-4 rounded-2xl bg-base-300/80 border border-primary/20 text-base-content/90 font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner">
            {{ previewText }}
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="p-4 border-t border-primary/20 bg-base-200/50 flex items-center justify-between">
        <button type="button" class="btn btn-ghost btn-sm rounded-full cursor-pointer" @click="close">
          Stäng
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm rounded-full font-bold px-6 shadow-md flex items-center gap-2 cursor-pointer"
          :class="isPublishing ? 'loading' : ''"
          :disabled="isPublishing"
          @click="doPublish"
        >
          <span>🚀</span>
          <span>{{ isPublishing ? 'Publicerar...' : 'Publicera på Facebook nu' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

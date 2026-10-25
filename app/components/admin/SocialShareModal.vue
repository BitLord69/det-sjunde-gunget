<script setup lang="ts">
interface Props {
  modelValue: boolean
  type: 'gig' | 'gallery' | 'song' | 'video'
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
const isStory = ref(false)
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
    customNotes.value =
      props.type === 'gig'
        ? newItem.notesSv || ''
        : props.type === 'gallery'
          ? newItem.captionSv || ''
          : props.type === 'video'
            ? newItem.description || ''
            : ''
  },
  { immediate: true },
)

const { formatGigSocialPost, formatGallerySocialPost, formatSongSocialPost, formatVideoSocialPost } =
  useSocialSharePost()

const previewText = computed(() => {
  if (!props.item) return ''

  if (props.type === 'gig') {
    return formatGigSocialPost({
      venue: props.item.venue,
      city: props.item.city,
      date: props.item.date,
      notes: customNotes.value,
      ticketUrl: props.item.ticketUrl,
      tags: selectedTags.value,
    })
  }

  if (props.type === 'gallery') {
    return formatGallerySocialPost({
      caption: customNotes.value.trim() || props.item.captionSv,
      tags: selectedTags.value,
    })
  }

  if (props.type === 'song') {
    return formatSongSocialPost({
      title: props.item.title,
      originalArtist: props.item.originalArtist,
      isOriginal: props.item.isOriginal,
      notes: customNotes.value,
      tags: selectedTags.value,
    })
  }

  if (props.type === 'video') {
    return formatVideoSocialPost({
      title: props.item.title,
      url: props.item.url,
      notes: customNotes.value,
      tags: selectedTags.value,
    })
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
        hashtags: isStory.value ? [] : selectedTags.value,
        isStory: isStory.value,
      },
    })

    if (res.social?.success) {
      const modeText = isStory.value ? 'som Story på Facebook & Instagram (24h)' : 'på Facebook'
      publishResult.value = {
        success: true,
        message: `✓ Publicerat ${modeText}! (ID: ${res.social.facebook?.id || res.social.instagram?.id || 'OK'})`,
      }
      emit('published', res.social)
    } else {
      publishResult.value = {
        success: false,
        message: `⚠️ Publicering misslyckades: ${res.social?.message || 'Okänt fel'}`,
      }
    }
  } catch (err: unknown) {
    const errorMsg = err && typeof err === 'object' && 'data' in err && (err as any).data?.message
      ? (err as any).data.message
      : err instanceof Error
        ? err.message
        : 'Ett serverfel uppstod'
    publishResult.value = {
      success: false,
      message: `⚠️ ${errorMsg}`,
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
              Publicera till Facebook & Instagram
            </h3>
            <p class="text-xs text-base-content/70">
              Dela "{{ item?.title || item?.venue || 'Objekt' }}" som vanligt inlägg eller 24-timmars Story.
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

        <!-- Mode Selector: Feed vs Story -->
        <div class="space-y-1.5">
          <label class="block font-bold text-secondary text-xs uppercase tracking-wider">
            Publiceringsmål:
          </label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5"
              :class="!isStory ? 'border-primary bg-primary/15 text-primary font-bold shadow' : 'border-base-content/15 bg-base-200/50 text-base-content/70'"
              @click="isStory = false"
            >
              <span class="text-xl">📢</span>
              <div class="min-w-0">
                <div class="font-bold text-xs">Vanligt flödesinlägg</div>
                <div class="text-[10px] opacity-75">Facebook-sida & flöde</div>
              </div>
            </button>

            <button
              type="button"
              class="p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5"
              :class="isStory ? 'border-secondary bg-secondary/15 text-secondary font-bold shadow' : 'border-base-content/15 bg-base-200/50 text-base-content/70'"
              @click="isStory = true"
            >
              <span class="text-xl">⚡</span>
              <div class="min-w-0">
                <div class="font-bold text-xs">Story (24 timmar)</div>
                <div class="text-[10px] opacity-75">Facebook & Instagram Story</div>
              </div>
            </button>
          </div>
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

        <!-- Hashtag Selector (endast för flödesinlägg) -->
        <div v-if="!isStory" class="space-y-2">
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
            <span>Förhandsgranskning:</span>
            <span class="badge badge-outline text-[10px] font-mono">
              {{ isStory ? 'FB & IG Stories (9:16)' : 'Facebook Page Feed' }}
            </span>
          </label>
          <div class="p-4 rounded-2xl bg-base-300/80 border border-primary/20 text-base-content/90 font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner">
            <div v-if="isStory" class="text-secondary font-bold pb-1">
              ⚡ Visas i 24 timmar som Story för sidans följare på Facebook och Instagram.
            </div>
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
          <span>{{ isPublishing ? 'Publicerar...' : isStory ? 'Publicera Story (FB & IG)' : 'Publicera på Facebook nu' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

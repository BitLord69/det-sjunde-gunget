<script setup lang="ts">
import type { FanPhoto } from './FanPhotoCard.vue'

const { t } = useI18n()

interface Props {
  isOpen: boolean
  photos: FanPhoto[]
  activeIndex: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  prev: []
  next: []
}>()

const activePhoto = computed(() => {
  if (props.activeIndex === null || !props.photos || !props.photos[props.activeIndex]) {
    return null
  }
  return props.photos[props.activeIndex]
})

const onKeyDown = (e: KeyboardEvent) => {
  if (!props.isOpen) return
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowLeft') emit('prev')
  if (e.key === 'ArrowRight') emit('next')
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <dialog
    class="modal bg-black/80 backdrop-blur-sm z-50 transition-opacity"
    :class="isOpen && activePhoto ? 'modal-open' : ''"
  >
    <div
      v-if="activePhoto"
      class="modal-box max-w-4xl p-0 bg-base-100 border border-primary/30 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
    >
      <!-- Close button top-right -->
      <button
        type="button"
        class="btn btn-sm btn-circle btn-ghost absolute top-3 right-3 z-30 bg-black/50 text-white hover:bg-black/80 cursor-pointer"
        @click="emit('close')"
      >
        ✕
      </button>

      <div class="flex flex-col md:flex-row flex-grow overflow-y-auto">
        <!-- Big photo viewer with navigation arrows -->
        <div class="relative bg-black/95 flex-grow flex items-center justify-center min-h-[300px] md:min-h-[480px] p-4">
          <img
            :src="activePhoto.mediaUrl"
            :alt="activePhoto.caption || t('fan_central.alt_photo')"
            class="max-h-[65vh] max-w-full object-contain rounded-lg shadow-2xl"
          >

          <!-- Left arrow button -->
          <button
            v-if="photos.length > 1"
            type="button"
            class="btn btn-circle btn-sm sm:btn-md btn-ghost absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white cursor-pointer"
            :title="t('fan_central.lightbox_prev_title')"
            @click.stop="emit('prev')"
          >
            ❮
          </button>

          <!-- Right arrow button -->
          <button
            v-if="photos.length > 1"
            type="button"
            class="btn btn-circle btn-sm sm:btn-md btn-ghost absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white cursor-pointer"
            :title="t('fan_central.lightbox_next_title')"
            @click.stop="emit('next')"
          >
            ❯
          </button>
        </div>

        <!-- Details & captions panel -->
        <div class="w-full md:w-80 p-6 sm:p-8 flex flex-col justify-between bg-base-100 border-t md:border-t-0 md:border-l border-primary/20 space-y-6">
          <div class="space-y-4">
            <!-- Counter -->
            <div class="flex items-center justify-between text-xs font-mono text-secondary">
              <span>{{ t('fan_central.photo_counter', { current: (activeIndex || 0) + 1, total: photos.length }) }}</span>
              <span class="badge badge-primary badge-sm font-bold">{{ t('fan_central.lightbox_badge') }}</span>
            </div>

            <!-- Caption -->
            <div>
              <span class="text-[10px] font-mono uppercase text-secondary font-bold tracking-wider block">
                {{ t('fan_central.lightbox_caption_label') }}
              </span>
              <p class="text-sm text-base-content/90 font-serif italic mt-1 leading-relaxed">
                "{{ activePhoto.caption || t('fan_central.lightbox_default_caption') }}"
              </p>
            </div>

            <!-- Metadata fields -->
            <div class="space-y-2.5 pt-3 border-t border-base-content/10 text-xs font-mono">
              <div>
                <span class="text-secondary font-bold block text-[10px] uppercase">{{ t('fan_central.lightbox_location_label') }}:</span>
                <span class="text-base-content/85 flex items-center gap-1.5"><IconMapPin class="w-3.5 h-3.5 text-primary shrink-0" /> {{ activePhoto.location || t('fan_central.unknown_location') }}</span>
              </div>
              <div>
                <span class="text-secondary font-bold block text-[10px] uppercase">{{ t('fan_central.lightbox_when_label') }}:</span>
                <span class="text-base-content/85">📅 {{ activePhoto.takenWhen || t('fan_central.unknown_when') }}</span>
              </div>
              <div v-if="(activePhoto as any).uploaderName">
                <span class="text-secondary font-bold block text-[10px] uppercase">{{ t('fan_central.lightbox_uploader_label') }}:</span>
                <span class="text-base-content/85">👤 {{ (activePhoto as any).uploaderName }}</span>
              </div>
            </div>
          </div>

          <!-- Navigation hint bottom -->
          <div class="pt-4 border-t border-base-content/10 flex items-center justify-between text-[11px] text-base-content/60 font-mono">
            <span>{{ t('fan_central.lightbox_keyboard_hint') }}</span>
            <button
              type="button"
              class="text-primary hover:underline cursor-pointer"
              @click="emit('close')"
            >
              {{ t('fan_central.lightbox_close') }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="emit('close')">
      <button type="button">{{ t('fan_central.modal_close') }}</button>
    </form>
  </dialog>
</template>

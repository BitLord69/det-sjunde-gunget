<script setup lang="ts">
useSeoMeta({
  title: 'Galleri & scenbilder | Det 7:e Gunget',
  description: 'Se bilder och ögonblick från Det 7:e Gungets spelningar, replokaler och studiosessioner.',
})

const { data: galleryItems } = await useFetch('/api/gallery')

const selectedImage = ref<any | null>(null)

const photos = computed(() => galleryItems.value?.filter((i) => i.category !== 'fan_central') || [])
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-12 lg:px-10 space-y-12">
    <!-- Header -->
    <div class="space-y-4 max-w-3xl">
      <h1 class="font-heading text-4xl sm:text-6xl text-primary text-gritty">
        Galleri
      </h1>
      <p class="text-base sm:text-lg text-base-content/80 leading-relaxed font-normal">
        Ögonblick av svett, gitarrsolon, stämda trummor och genuin spelglädje. Klicka på en bild för att förstora.
      </p>
    </div>

    <!-- Gallery Grid -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
      <div
        v-for="item in photos"
        :key="item.id"
        class="cursor-pointer"
        @click="selectedImage = item"
      >
        <div
          :class="[
            item.frameStyle === 'polaroid' ? 'frame-polaroid' :
            item.frameStyle === 'taped' ? 'frame-taped' :
            item.frameStyle === 'grunge' ? 'frame-grunge' : 'frame-wood'
          ]"
          :style="{ transform: `rotate(${item.rotation || 0}deg)` }"
        >
          <NuxtImg
            :src="item.mediaUrl"
            :alt="item.altTextSv"
            class="w-full aspect-[4/3] object-cover rounded shadow"
            loading="lazy"
          />
          <p class="text-xs text-center font-medium mt-3 italic text-base-content/90">
            {{ item.captionSv }}
          </p>
        </div>
      </div>
    </div>

    <!-- Fan Central Callout -->
    <div class="stage-card p-8 rounded-2xl border border-secondary/30 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <span class="text-3xl">💨</span>
        <div>
          <h2 class="font-heading text-xl text-primary font-bold">Letar du efter fläktarna?</h2>
          <p class="text-xs text-base-content/70">Kolla in vår officiella humorsektion med bordsfläktar och konsertfans.</p>
        </div>
      </div>
      <NuxtLink to="/fancentral" class="btn btn-secondary btn-sm rounded-full font-bold">
        Till Fan Central →
      </NuxtLink>
    </div>

    <!-- Lightbox Modal -->
    <div
      v-if="selectedImage"
      class="fixed inset-0 z-50 bg-neutral/90 backdrop-blur-md flex items-center justify-center p-4"
      @click="selectedImage = null"
    >
      <div class="max-w-4xl max-h-[90vh] flex flex-col items-center space-y-3" @click.stop>
        <NuxtImg
          :src="selectedImage.mediaUrl"
          :alt="selectedImage.altTextSv"
          class="max-h-[75vh] w-auto object-contain rounded-xl shadow-2xl border border-primary/30"
        />
        <p class="text-sm font-bold text-primary text-center">
          {{ selectedImage.captionSv }}
        </p>
        <button
          type="button"
          class="btn btn-sm btn-circle btn-primary font-bold text-xs"
          @click="selectedImage = null"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>

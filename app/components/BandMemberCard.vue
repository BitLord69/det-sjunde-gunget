<script setup lang="ts">
const { t, locale } = useI18n()

interface BandMember {
  id: string
  name: string
  role: string
  photoUrl?: string | null
  bioSv?: string | null
  bioEn?: string | null
  gearSv?: string | null
  gearEn?: string | null
  favoriteChord?: string | null
  weaknessSv?: string | null
  coffeeConsumption?: string | null
}

interface Props {
  member: BandMember
}

defineProps<Props>()
</script>

<template>
  <div class="stage-card rounded-2xl p-5 flex flex-col justify-between hover:border-primary/50 transition-all hover:-translate-y-1.5 shadow-xl bg-base-200/80">
    <div>
      <!-- Member Photo in Polaroid Frame -->
      <div class="frame-polaroid mb-6 overflow-hidden rounded">
        <NuxtImg
          :src="member.photoUrl || '/media/brand/Logotyp_mini.webp'"
          :alt="member.name"
          class="w-full aspect-[4/5] object-cover rounded filter contrast-105"
          loading="lazy"
        />
        <div class="text-center font-heading text-xs font-bold text-neutral mt-2">
          {{ member.name }} • {{ member.role }}
        </div>
      </div>

      <h3 class="font-heading text-2xl text-primary font-bold">{{ member.name }}</h3>
      <span class="text-xs font-bold uppercase tracking-wider text-secondary block mb-3 font-sans">
        {{ member.role }}
      </span>
      <p class="text-xs text-base-content/80 leading-relaxed mb-6 font-normal">
        {{ locale === 'en' && member.bioEn ? member.bioEn : member.bioSv }}
      </p>
    </div>

    <!-- Quirky Gear & Stats -->
    <div class="space-y-2 pt-4 border-t border-base-content/10 text-[11px] font-sans">
      <div v-if="member.gearSv || member.gearEn" class="flex flex-col">
        <span class="font-bold text-secondary">🎸 {{ locale === 'en' ? 'Gear:' : 'Vapen:' }}</span>
        <span class="text-base-content/75">{{ locale === 'en' && member.gearEn ? member.gearEn : member.gearSv }}</span>
      </div>
      <div v-if="member.favoriteChord" class="flex flex-col">
        <span class="font-bold text-secondary">🎵 {{ locale === 'en' ? 'Favorite chord:' : 'Favoritackord:' }}</span>
        <span class="text-base-content/75">{{ member.favoriteChord }}</span>
      </div>
      <div v-if="member.weaknessSv" class="flex flex-col">
        <span class="font-bold text-secondary">⚠️ {{ locale === 'en' ? 'Weakness:' : 'Svaghet:' }}</span>
        <span class="text-base-content/75">{{ member.weaknessSv }}</span>
      </div>
      <div v-if="member.coffeeConsumption" class="flex flex-col">
        <span class="font-bold text-secondary">☕ {{ locale === 'en' ? 'Coffee consumption:' : 'Kaffestats:' }}</span>
        <span class="text-base-content/75">{{ member.coffeeConsumption }}</span>
      </div>
    </div>
  </div>
</template>

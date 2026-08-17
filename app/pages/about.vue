<script setup lang="ts">
useSeoMeta({
  title: 'Om bandet | Det 7:e Gunget',
  description: 'Möt Janis, Bosse, Marcus och Jonas i Det 7:e Gunget. Fyra herrar över 50 som spelar äkta svensk blues och rock.',
})

const { data: bandMembers } = await useFetch('/api/band')
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-12 lg:px-10 space-y-20">
    <!-- Header -->
    <div class="space-y-4 max-w-3xl">
      <NuxtLink to="/" class="text-xs font-bold uppercase tracking-widest text-secondary hover:text-primary transition-colors inline-flex items-center gap-1">
        <span>←</span> Hem
      </NuxtLink>
      <h1 class="font-heading text-4xl sm:text-6xl text-primary text-gritty">
        Om Det 7:e Gunget
      </h1>
      <p class="text-base sm:text-lg text-base-content/80 leading-relaxed font-normal">
        Fyra herrar över 50 som hellre bär tunga rörförstärkare i trappor än går på Friskis & Svettis. Bluesen är vårt elixir och svänget är vår religion.
      </p>
    </div>

    <!-- Band Origin Story -->
    <div class="grid lg:grid-cols-2 gap-12 items-center">
      <div class="space-y-4 text-base text-base-content/85 leading-relaxed">
        <h2 class="font-heading text-2xl sm:text-3xl text-primary font-bold">
          Ett bra riff slår alltid friskvård
        </h2>
        <p>
          Det 7:e Gunget föddes ur en gemensam insikt: livet är för kort för dåligt gitarrljud och kliniska poplåtar. Vi har spelat i oräkneliga band genom åren, men när vi fyra träffades i replokalen klickade det direkt i den första 12-takters bluesen.
        </p>
        <p>
          Vår musik är rotad i Chicagos rökiga klubbar och söderns swamp-rock, men texterna och energin bärs fram med svensk självdistans och humor. Vi tar musiken på största allvar — men absolut inte oss själva.
        </p>
        <div class="pt-2 flex items-center gap-4 text-xs font-mono text-secondary font-bold">
          <span>✦ 100% äkta instrument</span>
          <span>✦ Inga förinspelade spår</span>
          <span>✦ Alltid rörglöd</span>
        </div>
      </div>

      <div class="frame-wood rounded-2xl overflow-hidden shadow-2xl">
        <NuxtImg
          src="/media/band/1..7de Gunget photoshoot1 21-6 26-21.jpg"
          alt="Det 7:e Gunget bandporträtt"
          class="w-full aspect-[4/3] object-cover filter contrast-105"
        />
        <div class="p-3 text-center text-xs font-heading font-bold text-primary bg-neutral">
          Hela gänget samlat inför sommarsäsongen
        </div>
      </div>
    </div>

    <!-- Member Profiles Grid -->
    <div class="space-y-10">
      <div class="border-b border-primary/20 pb-4">
        <span class="text-xs font-bold uppercase tracking-widest text-secondary">Medlemmar</span>
        <h2 class="font-heading text-3xl sm:text-4xl text-primary font-bold mt-1">
          Herrarna bakom musiken
        </h2>
      </div>

      <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="member in bandMembers"
          :key="member.id"
          class="stage-card rounded-2xl p-5 flex flex-col justify-between hover:border-primary/50 transition-all hover:-translate-y-1 shadow-xl"
        >
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
              {{ member.bioSv }}
            </p>
          </div>

          <!-- Gear Lore -->
          <div class="space-y-2 pt-4 border-t border-base-content/10 text-[11px] font-sans">
            <div v-if="member.gearSv" class="flex flex-col">
              <span class="font-bold text-secondary">🎸 Vapen:</span>
              <span class="text-base-content/75">{{ member.gearSv }}</span>
            </div>
            <div v-if="member.favoriteChord" class="flex flex-col">
              <span class="font-bold text-secondary">🎵 Favoritackord:</span>
              <span class="text-base-content/75">{{ member.favoriteChord }}</span>
            </div>
            <div v-if="member.weaknessSv" class="flex flex-col">
              <span class="font-bold text-secondary">⚠️ Svaghet:</span>
              <span class="text-base-content/75">{{ member.weaknessSv }}</span>
            </div>
            <div v-if="member.coffeeConsumption" class="flex flex-col">
              <span class="font-bold text-secondary">☕ Kaffekonsumtion:</span>
              <span class="text-base-content/75">{{ member.coffeeConsumption }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

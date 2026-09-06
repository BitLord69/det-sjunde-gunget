<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: () => `${t('seo.home_title')}`,
  description: () => t('seo.home_desc'),
  ogTitle: () => `${t('seo.home_og_title')}`,
  ogDescription: () => t('seo.home_og_desc'),
  ogImage: '/media/og/og-share.jpg',
})

// Fetch gig data for the spotlight section
const { data: gigsData } = await useFetch<{ upcoming: any[]; past: any[]; all: any[] }>('/api/gigs')

const upcomingGigs = computed(() => gigsData.value?.upcoming || [])
const pastGigs = computed(() => gigsData.value?.past || [])
</script>

<template>
  <div class="space-y-10 sm:space-y-14">
    <!-- 1. HERO SECTION -->
    <HeroSection />

    <!-- 2. GIG / SPELNINGAR SPOTLIGHT -->
    <GigsSection :upcoming-gigs="upcomingGigs" :past-gigs="pastGigs" />

    <!-- 2.5 OFFICIELL BAND-MERCH SHOWCASE -->
    <MerchSection />

    <!-- 3. JUKEBOX & MUSIK SEKTION -->
    <MusicSection />

    <!-- 4. BANDET (JANIS, BOSSE, MARCUS, JONAS) -->
    <BandSection />

    <!-- 5. FAN CENTRAL (THE LITERAL FAN JOKE) -->
    <FanCentralSection />

    <!-- 6. GALLERI & SCENLIV -->
    <GallerySection />

    <!-- 7. BOKA BANDET / KONTAKTFORMULÄR -->
    <BookingSection />
  </div>
</template>
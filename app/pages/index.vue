<script setup lang="ts">
import type { GigsApiResponse } from '~/types'

const { t } = useI18n()

useSeoMeta({
  title: () => `${t('seo.home_title')}`,
  description: () => t('seo.home_desc'),
  ogTitle: () => `${t('seo.home_og_title')}`,
  ogDescription: () => t('seo.home_og_desc'),
  ogImage: '/media/og/og-share.jpg',
})

// Fetch gig data for the spotlight section
const { data: gigsData } = await useFetch<GigsApiResponse>('/api/gigs')

const upcomingGigs = computed(() => gigsData.value?.upcoming || [])
const pastGigs = computed(() => gigsData.value?.past || [])

// Schema.org Structured Data (MusicGroup & MusicEvents for Google Knowledge Graph / Rich Snippets)
const structuredData = computed(() => {
  const musicGroupSchema = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: 'Det 7:e Gunget',
    url: 'https://det7egunget.se',
    logo: 'https://det7egunget.se/media/brand/Logotyp_mini.webp',
    image: 'https://det7egunget.se/media/og/og-share.jpg',
    description: t('seo.home_desc'),
    genre: ['Blues', 'Blues Rock', "Rock 'n' Roll"],
    foundingLocation: {
      '@type': 'Place',
      name: 'Ängelholm, Skåne, Sverige',
    },
    member: [
      { '@type': 'Person', name: 'Janis', jobTitle: 'Sång & Munspel' },
      { '@type': 'Person', name: 'Marcus', jobTitle: 'Gitarr & Kör' },
      { '@type': 'Person', name: 'Bosse', jobTitle: 'Bas & Kör' },
      { '@type': 'Person', name: 'Jonas', jobTitle: 'Trummor' },
    ],
    sameAs: [
      'https://facebook.com/det7egunget',
      'https://instagram.com/det7egunget',
    ],
  }

  const eventsSchema = upcomingGigs.value.map(gig => ({
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: `Det 7:e Gunget live på ${gig.venue}`,
    startDate: new Date(gig.date).toISOString().split('T')[0],
    eventStatus: gig.status === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: gig.venue,
      address: {
        '@type': 'PostalAddress',
        addressLocality: gig.city,
        addressCountry: 'SE',
      },
    },
    performer: {
      '@type': 'MusicGroup',
      name: 'Det 7:e Gunget',
      url: 'https://det7egunget.se',
    },
    offers: gig.ticketUrl ? {
      '@type': 'Offer',
      url: gig.ticketUrl,
      availability: gig.status === 'sold_out' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    } : {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'SEK',
      availability: 'https://schema.org/InStock',
    },
  }))

  return [musicGroupSchema, ...eventsSchema]
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(structuredData.value)),
    },
  ],
})
</script>

<template>
  <div class="space-y-10 sm:space-y-14">
    <!-- 1. HERO SECTION -->
    <HeroSection />

    <!-- 2. GIG / SPELNINGAR SPOTLIGHT -->
    <GigsSection :upcoming-gigs="upcomingGigs" :past-gigs="pastGigs" />

    <!-- 3. JUKEBOX & MUSIK SEKTION -->
    <MusicSection />

    <!-- 4. BANDET (JANIS, BOSSE, MARCUS, JONAS) -->
    <BandSection />

    <!-- 5. GALLERI & SCENLIV -->
    <GallerySection />

    <!-- 6. FAN CENTRAL (THE LITERAL FAN JOKE) -->
    <FanCentralSection />

    <!-- 7. OFFICIELL BAND-MERCH SHOWCASE -->
    <MerchSection />

    <!-- 8. BOKA BANDET / KONTAKTFORMULÄR -->
    <BookingSection />
  </div>
</template>
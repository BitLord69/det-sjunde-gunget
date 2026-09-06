<script setup lang="ts">
// Layout structure decomposed into focused, reusable components:
// - SiteHeader: Ticker, color/glasses mode switches, desktop/mobile navigation, volume knob
// - SiteFooter: Band details, quick links, booking info, newsletter subscription
// - MobileBottomNav: Ergonomic thumb navigation for mobile viewports
// - CookieConsentBanner: GDPR compliance modal & banner
</script>

<template>
  <div class="min-h-screen bg-base-100 text-base-content flex flex-col selection:bg-primary selection:text-neutral">
    <!-- Top Announcement Ticker & Main Navigation Header -->
    <SiteHeader />

    <!-- Page Content -->
    <main class="flex-grow pb-24 lg:pb-0">
      <slot />
    </main>

    <!-- Footer -->
    <SiteFooter />

    <!-- Mobile Bottom Navigation Bar (Thumb-friendly per spec §4) -->
    <MobileBottomNav />

    <!-- Global Cookie Consent Banner & Settings Modal -->
    <CookieConsentBanner />
  </div>
</template>

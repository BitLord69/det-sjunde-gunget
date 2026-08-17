export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      title: 'Det 7:e Gunget | Blues och rock med glimt i ögat',
      link: [
        { rel: 'icon', type: 'image/webp', href: '/media/brand/favicon.webp' },
        { rel: 'icon', type: 'image/webp', href: '/media/brand/Logotyp_mini.webp' },
        { rel: 'apple-touch-icon', href: '/media/brand/Logotyp_mini.webp' },
      ],
    },
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/image',
    '@nuxt/fonts',
    '@nuxtjs/i18n',
    '@nuxtjs/color-mode',
    '@nuxtjs/sitemap',
    '@nuxtjs/robots',
    '@nuxt/eslint',
  ],
  css: ['~/assets/css/main.css'],
  fonts: {
    families: [
      { name: 'Inter', provider: 'google' },
      { name: 'Arvo', provider: 'google', weights: [400, 700], styles: ['normal', 'italic'] },
    ],
  },
  i18n: {
    defaultLocale: 'sv',
    strategy: 'prefix_except_default',
    locales: [
      { code: 'sv', name: 'Svenska', file: 'sv.json' },
      { code: 'en', name: 'English', file: 'en.json' },
    ],
    langDir: '../i18n/locales',
  },
  colorMode: {
    preference: 'system',
    fallback: 'dark',
    dataValue: 'theme',
    classSuffix: '',
  },
  routeRules: {
    '/admin': { ssr: false },
    '/admin/**': { ssr: false },
  },
  site: {
    name: 'Det 7:e Gunget',
    description: 'Blues, rock och lagom mycket oväsen.',
  },
})
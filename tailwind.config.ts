import type { Config } from 'tailwindcss'
import daisyui from 'daisyui'

export default {
  content: [
    './app/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['var(--font-heading)', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'sans-serif'],
        castoro: ['Castoro', 'Georgia', 'serif'],
        rubikdirt: ['Rubik Dirt', 'cursive', 'sans-serif'],
        smokum: ['Smokum', 'cursive', 'serif'],
        fredericka: ['Fredericka the Great', 'serif'],
        sancreek: ['Sancreek', 'cursive', 'serif'],
        faustina: ['Faustina', 'serif'],
        vollkorn: ['Vollkorn', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        dark: {
          'color-scheme': 'dark',
          primary: '#ebd29c',
          'primary-content': '#24190c',
          secondary: '#c8793f',
          'secondary-content': '#1f1008',
          accent: '#8fbd9a',
          'accent-content': '#0d1b12',
          neutral: '#0d0c0b',
          'neutral-content': '#f4ead8',
          'base-100': '#161311',
          'base-200': '#211c18',
          'base-300': '#302720',
          'base-content': '#f4ead8',
        },
        light: {
          'color-scheme': 'light',
          primary: '#9e631b',
          'primary-content': '#fdfbf7',
          secondary: '#b8541c',
          'secondary-content': '#ffffff',
          accent: '#2b6d45',
          'accent-content': '#ffffff',
          neutral: '#241e1a',
          'neutral-content': '#f9f6f0',
          'base-100': '#f8f3ea',
          'base-200': '#ede2d0',
          'base-300': '#ded0bb',
          'base-content': '#281f18',
        },
      },
    ],
    darkTheme: 'dark',
  },
} satisfies Config
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
        heading: ['Arvo', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'sans-serif'],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        dark: {
          'color-scheme': 'dark',
          primary: '#e2bd72',
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
          primary: '#a86f20',
          'primary-content': '#ffffff',
          secondary: '#ba5a1f',
          'secondary-content': '#ffffff',
          accent: '#397852',
          'accent-content': '#ffffff',
          neutral: '#241e1a',
          'neutral-content': '#f9f6f0',
          'base-100': '#faf6ee',
          'base-200': '#efe7da',
          'base-300': '#dfd5c4',
          'base-content': '#231c17',
        },
      },
    ],
    darkTheme: 'dark',
  },
} satisfies Config
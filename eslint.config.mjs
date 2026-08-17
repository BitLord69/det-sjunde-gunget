// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    files: ['layouts/default.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
)

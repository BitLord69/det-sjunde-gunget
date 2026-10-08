/**
 * Composable för att översätta texter från svenska till engelska i adminpanelen.
 * 
 * Använder Google Gemini AI om nyckel finns, annars sömlös fallback till översättnings-API.
 */
export const useTranslation = () => {
  const isTranslating = ref(false)
  const activeField = ref<string | null>(null)

  const translate = async (
    text: string,
    fieldId?: string
  ): Promise<string> => {
    if (!text || !text.trim()) {
      throw new Error('Fyll i den svenska texten först!')
    }

    isTranslating.value = true
    if (fieldId) activeField.value = fieldId

    try {
      const res = await $fetch<{ success: boolean; text: string; engine?: string }>('/api/admin/translate', {
        method: 'POST',
        body: { text: text.trim() },
      })

      if (res && res.text) {
        return res.text
      }
      throw new Error('Inget översättningssvar erhölls.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kunde inte översätta texten'
      throw new Error(msg)
    } finally {
      isTranslating.value = false
      if (fieldId) activeField.value = null
    }
  }

  const isFieldTranslating = (fieldId: string) => {
    return isTranslating.value && activeField.value === fieldId
  }

  return {
    isTranslating,
    activeField,
    translate,
    isFieldTranslating,
  }
}

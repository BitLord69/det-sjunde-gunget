<script setup lang="ts">
const { t } = useI18n()

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  uploaded: []
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const isSubmitting = ref(false)
const uploadSuccess = ref(false)
const uploadErrorMessage = ref('')

const uploadForm = reactive({
  name: '',
  email: '',
  caption: '',
  location: '',
  takenWhen: '',
  rulesAccepted: false,
})

const resetForm = () => {
  uploadForm.name = ''
  uploadForm.email = ''
  uploadForm.caption = ''
  uploadForm.location = ''
  uploadForm.takenWhen = ''
  uploadForm.rulesAccepted = false
  selectedFile.value = null
  previewUrl.value = null
  uploadSuccess.value = false
  uploadErrorMessage.value = ''
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    resetForm()
  }
})

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const validateAndSetFile = (file: File) => {
  if (!file.type.startsWith('image/')) {
    uploadErrorMessage.value = t('fan_central.modal_error_invalid_type')
    return false
  }
  if (file.size > 12 * 1024 * 1024) {
    uploadErrorMessage.value = t('fan_central.modal_error_too_large')
    return false
  }
  selectedFile.value = file
  uploadErrorMessage.value = ''
  previewUrl.value = URL.createObjectURL(file)
  return true
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const file = input.files[0]
  if (file) validateAndSetFile(file)
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  if (!event.dataTransfer?.files || event.dataTransfer.files.length === 0) return
  const file = event.dataTransfer.files[0]
  if (file) validateAndSetFile(file)
}

const submitUpload = async () => {
  uploadErrorMessage.value = ''

  if (!selectedFile.value) {
    uploadErrorMessage.value = t('fan_central.modal_error_no_file')
    return
  }

  if (!uploadForm.email || !uploadForm.email.includes('@') || !uploadForm.email.includes('.')) {
    uploadErrorMessage.value = t('fan_central.modal_error_invalid_email')
    return
  }

  if (!uploadForm.rulesAccepted) {
    uploadErrorMessage.value = t('fan_central.modal_error_accept_rules')
    return
  }

  isSubmitting.value = true

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('email', uploadForm.email.trim())
    if (uploadForm.name.trim()) formData.append('uploaderName', uploadForm.name.trim())
    if (uploadForm.caption.trim()) formData.append('caption', uploadForm.caption.trim())
    if (uploadForm.location.trim()) formData.append('location', uploadForm.location.trim())
    if (uploadForm.takenWhen.trim()) formData.append('takenWhen', uploadForm.takenWhen.trim())
    formData.append('rulesAccepted', 'true')

    await $fetch('/api/fan-central/upload', {
      method: 'POST',
      body: formData,
    })

    uploadSuccess.value = true
    emit('uploaded')
  } catch (err: any) {
    console.error('Upload error:', err)
    const errCode = err.data?.data?.code
    if (errCode === 'RATE_LIMIT_EXCEEDED') {
      uploadErrorMessage.value = t('fan_central.modal_error_rate_limit')
    } else if (errCode === 'FILE_TOO_LARGE') {
      uploadErrorMessage.value = t('fan_central.modal_error_too_large')
    } else if (errCode === 'INVALID_FILE_TYPE') {
      uploadErrorMessage.value = t('fan_central.modal_error_invalid_type')
    } else if (errCode === 'BANNED_EMAIL') {
      uploadErrorMessage.value = t('fan_central.modal_error_banned')
    } else if (errCode === 'NO_FILE') {
      uploadErrorMessage.value = t('fan_central.modal_error_no_file')
    } else if (errCode === 'INVALID_EMAIL') {
      uploadErrorMessage.value = t('fan_central.modal_error_invalid_email')
    } else if (errCode === 'RULES_REQUIRED') {
      uploadErrorMessage.value = t('fan_central.modal_error_rules_required')
    } else if (errCode === 'UPLOAD_SAVE_FAILED') {
      uploadErrorMessage.value = t('fan_central.modal_error_save_failed')
    } else {
      uploadErrorMessage.value = err.data?.message || t('fan_central.modal_error_generic')
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <dialog class="modal" :class="isOpen ? 'modal-open' : ''">
    <div class="modal-box max-w-xl bg-base-100 border border-primary/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
      <!-- Close button -->
      <button
        type="button"
        class="btn btn-sm btn-circle btn-ghost absolute top-4 right-4 z-20 cursor-pointer text-base-content hover:bg-base-200"
        @click.stop="emit('close')"
      >
        ✕
      </button>

      <div class="border-b border-primary/20 pb-3">
        <h3 class="font-heading text-xl sm:text-2xl text-primary font-bold flex items-center gap-2">
          <span>📌</span> {{ t('fan_central.modal_title') }}
        </h3>
        <p class="text-xs text-base-content/70 mt-1">
          {{ t('fan_central.modal_subtitle') }}
        </p>
      </div>

      <!-- Success Message Screen -->
      <div v-if="uploadSuccess" class="py-8 text-center space-y-4">
        <div class="text-5xl animate-bounce">🎉</div>
        <h4 class="font-heading text-xl text-primary font-bold">
          {{ t('fan_central.modal_success_title') }}
        </h4>
        <p class="text-xs sm:text-sm text-base-content/85 max-w-md mx-auto leading-relaxed">
          {{ t('fan_central.modal_success_desc') }}
        </p>
        <div class="pt-4">
          <button
            type="button"
            class="btn btn-primary btn-sm rounded-full font-bold px-8 cursor-pointer"
            @click.stop="emit('close')"
          >
            {{ t('fan_central.modal_close_btn') }}
          </button>
        </div>
      </div>

      <!-- Upload Form Screen -->
      <form v-else class="space-y-4 text-xs" @submit.prevent="submitUpload">
        <!-- Error Alert -->
        <div v-if="uploadErrorMessage" class="p-3 rounded-xl bg-error/15 border border-error/40 text-error font-medium">
          ⚠️ {{ uploadErrorMessage }}
        </div>

        <!-- Drag & drop / File Selector Area -->
        <div
          class="border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors select-none"
          :class="previewUrl ? 'border-primary/60 bg-base-200/40' : 'border-primary/30 hover:border-primary bg-base-200/60'"
          @click="triggerFileInput"
          @dragover.prevent
          @drop="handleDrop"
        >
          <div v-if="previewUrl" class="space-y-2">
            <img
              :src="previewUrl"
              :alt="t('fan_central.alt_preview')"
              class="max-h-44 max-w-full mx-auto rounded-lg shadow-md object-contain"
            >
            <p class="text-[11px] text-base-content/60">
              {{ t('fan_central.modal_dropzone_change') }}
            </p>
          </div>

          <div v-else class="py-6 space-y-2">
            <div class="text-3xl">📷</div>
            <div class="font-bold text-sm text-primary">
              {{ t('fan_central.modal_dropzone_cta') }}
            </div>
            <p class="text-[11px] text-base-content/60">
              {{ t('fan_central.modal_dropzone_hint') }}
            </p>
          </div>

          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileSelect"
          >
        </div>

        <!-- Text Fields Grid -->
        <div class="grid sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-secondary mb-1">
              {{ t('fan_central.modal_name_label') }}
            </label>
            <input
              v-model="uploadForm.name"
              type="text"
              :placeholder="t('fan_central.modal_name_placeholder')"
              class="input input-bordered input-sm w-full bg-base-200 text-xs"
            >
          </div>

          <div>
            <label class="block font-bold text-secondary mb-1">
              {{ t('fan_central.modal_email_label') }}
            </label>
            <input
              v-model="uploadForm.email"
              type="email"
              required
              placeholder="namn@example.com"
              class="input input-bordered input-sm w-full bg-base-200 font-mono text-xs"
            >
            <span class="text-[10px] text-base-content/55">
              {{ t('fan_central.modal_email_hint') }}
            </span>
          </div>

          <div>
            <label class="block font-bold text-secondary mb-1">
              {{ t('fan_central.modal_location_label') }}
            </label>
            <input
              v-model="uploadForm.location"
              type="text"
              :placeholder="t('fan_central.modal_location_placeholder')"
              class="input input-bordered input-sm w-full bg-base-200 text-xs"
            >
          </div>

          <div>
            <label class="block font-bold text-secondary mb-1">
              {{ t('fan_central.modal_when_label') }}
            </label>
            <input
              v-model="uploadForm.takenWhen"
              type="text"
              :placeholder="t('fan_central.modal_when_placeholder')"
              class="input input-bordered input-sm w-full bg-base-200 text-xs"
            >
          </div>
        </div>

        <div>
          <label class="block font-bold text-secondary mb-1">
            {{ t('fan_central.modal_caption_label') }}
          </label>
          <textarea
            v-model="uploadForm.caption"
            rows="2"
            :placeholder="t('fan_central.modal_caption_placeholder')"
            class="textarea textarea-bordered w-full bg-base-200 text-xs resize-none"
          />
        </div>

        <!-- Rules Acceptance Checkbox -->
        <div class="p-3 rounded-xl bg-base-200/80 border border-primary/20 space-y-2">
          <label class="flex items-start gap-2.5 cursor-pointer">
            <input
              v-model="uploadForm.rulesAccepted"
              type="checkbox"
              required
              class="checkbox checkbox-primary checkbox-sm mt-0.5"
            >
            <span class="text-[11px] text-base-content/85 leading-relaxed">
              {{ t('fan_central.modal_rules_text') }}
            </span>
          </label>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            class="btn btn-ghost btn-sm rounded-full cursor-pointer"
            @click.stop="emit('close')"
          >
            {{ t('fan_central.modal_cancel_btn') }}
          </button>
          <button
            type="submit"
            class="btn btn-primary btn-sm rounded-full font-bold px-7 shadow-lg cursor-pointer"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting" class="loading loading-spinner loading-xs"/>
            <span>{{ isSubmitting ? '...' : t('fan_central.modal_submit_btn') }}</span>
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop" @click="emit('close')">
      <button type="button">{{ t('fan_central.modal_close') }}</button>
    </form>
  </dialog>
</template>

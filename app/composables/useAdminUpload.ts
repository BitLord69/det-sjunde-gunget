import { upload } from '@vercel/blob/client'

export interface UploadOptions {
  onProgress?: (percentage: number) => void
}

/**
 * Universell uppladdningsfunktion för administrationspanelen.
 * 
 * I produktionsmiljö (Vercel) används direktuppladdning via @vercel/blob/client
 * till Vercel Blob Storage. Detta kringgår Vercels hårda gräns på 4.5 MB för
 * serverless-funktioner och tillåter filer upp till 50 MB.
 * 
 * I lokal utvecklingsmiljö där BLOB_READ_WRITE_TOKEN saknas sker en automatisk
 * sömlös fallback till /api/admin/upload på lokal disk.
 */
export const useAdminUpload = () => {
  const isUploading = ref(false)
  const uploadProgress = ref(0)
  const uploadError = ref<string | null>(null)

  const uploadAdminFile = async (file: File, options?: UploadOptions): Promise<string> => {
    isUploading.value = true
    uploadProgress.value = 0
    uploadError.value = null

    // 1. Klientvalidering av maxstorlek: 50 MB
    const MAX_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
      const errorMsg = `Filen är för stor (${sizeMb} MB). Maximal tillåten storlek är 50 MB.`
      uploadError.value = errorMsg
      isUploading.value = false
      throw new Error(errorMsg)
    }

    // Skapa säkert filnamn
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const pathname = `media/${cleanName}`

    // 2. Försök med direkt Vercel Blob Client Upload (bypassar Vercels 4.5 MB gräns)
    try {
      const blob = await upload(pathname, file, {
        access: 'public',
        handleUploadUrl: '/api/admin/blob-upload',
        multipart: true,
        onUploadProgress: (progress) => {
          uploadProgress.value = Math.round(progress.percentage)
          if (options?.onProgress) {
            options.onProgress(Math.round(progress.percentage))
          }
        },
      })

      if (blob && blob.url) {
        return blob.url
      }
    } catch (blobErr: any) {
      console.warn('[AdminUpload] Vercel Blob client upload misslyckades eller stöds inte i denna miljö:', blobErr)

      // Om felet beror på att filen är för stor för Vercel Blob eller nätverksfel
      const msg = String(blobErr?.message || blobErr || '')
      if (msg.includes('413') || msg.includes('Payload Too Large')) {
        const errorMsg = 'Filen överskrider maximal tillåten uppladdningsstorlek (50 MB).'
        uploadError.value = errorMsg
        throw new Error(errorMsg)
      }

      // Om felet är "Blob Storage Not Configured" (501 / saknar token i lokal dev), gör fallback till multipart /api/admin/upload
      const isConfigError = msg.includes('Blob Storage Not Configured') || msg.includes('501') || msg.includes('BLOB_READ_WRITE_TOKEN saknas')

      if (!isConfigError && !msg.includes('Failed to fetch') && !msg.includes('NetworkError')) {
        // Om Vercel Blob var konfigurerat men kastade ett specifikt fel
        const errorMsg = `Kunde inte ladda upp till Vercel Blob: ${blobErr?.message || 'Okänt fel'}`
        uploadError.value = errorMsg
        throw new Error(errorMsg)
      }

      // 3. Fallback: Traditionell uppladdning via /api/admin/upload (lokal miljö)
      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await $fetch<{ success: boolean; url: string }>('/api/admin/upload', {
          method: 'POST',
          body: formData,
        })

        if (res && res.success && res.url) {
          return res.url
        }
      } catch (fallbackErr: any) {
        console.error('[AdminUpload] Fallback-uppladdning misslyckades också:', fallbackErr)

        let friendlyError = 'Serverfel vid uppladdning.'
        if (fallbackErr?.status === 413 || fallbackErr?.statusCode === 413) {
          friendlyError = 'Filen är för stor för att överföras via servern (max 4.5 MB utan Vercel Blob).'
        } else if (fallbackErr?.data?.message) {
          friendlyError = fallbackErr.data.message
        } else if (fallbackErr?.message) {
          if (fallbackErr.message.includes('Failed to fetch') || fallbackErr.message.includes('NetworkError')) {
            friendlyError = 'Nätverksanslutningen avbröts under uppladdningen. Kontrollera din uppkoppling.'
          } else {
            friendlyError = fallbackErr.message
          }
        }

        uploadError.value = friendlyError
        throw new Error(friendlyError)
      }
    } finally {
      isUploading.value = false
    }

    throw new Error('Ett oväntat fel uppstod vid uppladdningen.')
  }

  return {
    isUploading,
    uploadProgress,
    uploadError,
    uploadAdminFile,
  }
}

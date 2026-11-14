/**
 * Automagiskt läs av en bilds pixeldimensioner, filstorlek och DPI.
 */
export const inspectImageResolution = async (urlOrFile: string | File): Promise<string | null> => {
  try {
    let width = 0
    let height = 0
    let sizeStr = ''

    if (urlOrFile instanceof File) {
      const file = urlOrFile
      sizeStr = file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`

      const objectUrl = URL.createObjectURL(file)
      await new Promise<void>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          width = img.naturalWidth
          height = img.naturalHeight
          URL.revokeObjectURL(objectUrl)
          resolve()
        }
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl)
          reject(new Error('Kunde inte läsa bildfilen'))
        }
        img.src = objectUrl
      })
    } else if (typeof urlOrFile === 'string' && urlOrFile.trim()) {
      const url = urlOrFile.trim()
      await new Promise<void>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          width = img.naturalWidth
          height = img.naturalHeight
          resolve()
        }
        img.onerror = () => {
          reject(new Error('Kunde inte läsa bilden från URL'))
        }
        img.src = url
      })

      try {
        const res = await fetch(url, { method: 'HEAD' })
        const cl = res.headers.get('content-length')
        if (cl) {
          const bytes = parseInt(cl, 10)
          if (!isNaN(bytes) && bytes > 0) {
            sizeStr = bytes >= 1024 * 1024
              ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
              : `${Math.round(bytes / 1024)} KB`
          }
        }
      } catch {
        // Ignorera HEAD-fel om CORS eller lokal relativ sökväg
      }
    }

    if (!width || !height) return null

    const parts: string[] = [`${width} × ${height} px`]
    if (sizeStr) {
      parts.push(sizeStr)
    }
    // Högupplöst för tryck (>= 2000px är standard 300 DPI för presskit)
    if (width >= 2000 || height >= 2000) {
      parts.push('300 DPI')
    }

    return parts.join(' • ')
  } catch (err) {
    console.warn('Bildanalys misslyckades:', err)
    return null
  }
}

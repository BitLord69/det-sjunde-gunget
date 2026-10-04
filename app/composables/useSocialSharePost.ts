/**
 * Shared composable for formatting social media posts (Facebook, Instagram, etc.)
 * across Admin Gigs and Social Share Modal.
 */

export interface GigSocialParams {
  venue?: string | null
  city?: string | null
  date?: string | Date | null
  notes?: string | null
  ticketUrl?: string | null
  tags?: string[]
}

export interface GallerySocialParams {
  caption?: string | null
  tags?: string[]
}

export interface SongSocialParams {
  title?: string | null
  originalArtist?: string | null
  isOriginal?: boolean | null
  notes?: string | null
  tags?: string[]
}

export function useSocialSharePost() {
  const formatGigSocialPost = (params: GigSocialParams): string => {
    const venue = params.venue || 'Spelplats'
    const city = params.city || 'Stad'
    const dateStr = params.date
      ? new Date(params.date).toLocaleDateString('sv-SE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '[Datum]'

    const cityTag = params.city ? `#${params.city.replace(/\s+/g, '')}Blues` : ''
    const tagsStr = params.tags && params.tags.length > 0
      ? params.tags.join(' ')
      : '#DetSjundeGunget #BluesRock'

    const lines = [
      '🎸 NYTT GIG MED DET 7:e GUNGET! 🎸',
      '',
      `📍 Spelplats: ${venue}, ${city}`,
      `📅 Datum: ${dateStr}`,
    ]

    if (params.notes && params.notes.trim()) {
      lines.push('', `"${params.notes.trim()}"`)
    }

    lines.push(
      '',
      params.ticketUrl
        ? `🎟️ Biljetter: ${params.ticketUrl}`
        : '👉 Mer info: https://det7egunget.se/gigs',
      '',
      'Kom och sväng med oss! 🎶',
      `${tagsStr} ${cityTag}`.trim(),
    )

    return lines.join('\n')
  }

  const formatGallerySocialPost = (params: GallerySocialParams): string => {
    const caption = params.caption?.trim() || 'Ny bild från scenen & replokalen med Det 7:e Gunget!'
    const tagsStr = params.tags && params.tags.length > 0 ? params.tags.join(' ') : ''

    return `📷 NYTT I GALLERIET!\n\n"${caption}"\n\nKolla in fler bilder och ögonblick på vår webbplats! 🎸✨\n\nhttps://det7egunget.se/gallery\n\n${tagsStr}`.trim()
  }

  const formatSongSocialPost = (params: SongSocialParams): string => {
    const title = params.title || 'Låt'
    const artist = params.isOriginal
      ? 'Originalkomposition av Det 7:e Gunget'
      : `Cover av ${params.originalArtist || 'Klassiker'}`
    const tagsStr = params.tags && params.tags.length > 0 ? params.tags.join(' ') : ''

    const lines = [
      '🎵 NY LÅT I JUKEBOXEN!',
      '',
      `"${title}" (${artist})`,
    ]

    if (params.notes && params.notes.trim()) {
      lines.push('', `"${params.notes.trim()}"`)
    }

    lines.push(
      '',
      'Lyssna direkt i retro-jukeboxen på webbplatsen! 🎸✨',
      '',
      'https://det7egunget.se/music',
      '',
      tagsStr,
    )

    return lines.join('\n').trim()
  }

  return {
    formatGigSocialPost,
    formatGallerySocialPost,
    formatSongSocialPost,
  }
}

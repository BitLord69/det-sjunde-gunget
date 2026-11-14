/**
 * Gemensamma resurser och Canvas-hjälpfunktioner för Det 7:e Gungets grafiska AI-verktyg
 * (Affischstudion / GigPosterModal & Singelomslagsstudion / CoverStudioModal).
 */

export interface BandPhotoshootItem {
  id: string
  label: string
  path: string
}

export const DEFAULT_BAND_PHOTO_PATH = '/media/band/21..7de Gunget photoshoot1 21-6 26-3.jpg'

export const BAND_PHOTOSHOOT_LIST: BandPhotoshootItem[] = [
  { id: 'bp1', label: 'Bandfoto 1: Scenpose med instrument', path: '/media/band/21..7de Gunget photoshoot1 21-6 26-3.jpg' },
  { id: 'bp2', label: 'Bandfoto 2: Hela bandet leende', path: '/media/band/19..7de Gunget photoshoot1 21-6 26-5.jpg' },
  { id: 'bp3', label: 'Bandfoto 3: Rå live-attityd & mikrofon', path: '/media/band/17..7de Gunget photoshoot1 21-6 26-4.jpg' },
  { id: 'bp4', label: 'Bandfoto 4: Närbild instrument & groove', path: '/media/band/10..7de Gunget photoshoot1 21-6 26-16.jpg' },
  { id: 'bp5', label: 'Bandfoto 5: Klassisk 70-tals posering', path: '/media/band/6..7de Gunget photoshoot1 21-6 26-12.jpg' },
  { id: 'bp6', label: 'Bandfoto 6: Spelglädje i studion', path: '/media/band/2..7de Gunget photoshoot1 21-6 26-20.jpg' },
  { id: 'bp7', label: 'Bandfoto 7: Live-ögonblick & dynamik', path: '/media/band/1..7de Gunget photoshoot1 21-6 26-21.jpg' },
]

/**
 * Laddar en bild asynkront med crossOrigin-stöd och valfri bildcache.
 */
export function loadCrossOriginImage(
  src: string,
  cache?: Map<string, HTMLImageElement>,
): Promise<HTMLImageElement> {
  if (cache?.has(src)) {
    return Promise.resolve(cache.get(src)!)
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => {
      cache?.set(src, img)
      resolve(img)
    }
    img.onerror = (e) => reject(new Error(`Kunde inte ladda bild från ${src}: ${e}`))
    img.src = src
  })
}

/**
 * Ritar en rundad rektangel-bana i ett CanvasRenderingContext2D.
 */
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  let radius = r
  if (w < 2 * radius) radius = w / 2
  if (h < 2 * radius) radius = h / 2
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

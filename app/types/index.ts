import type { gigs, songs, galleryItems, bandMembers, newsPosts, setlistItems, videos } from '~~/server/db/schema'

export type Gig = typeof gigs.$inferSelect & {
  setlistItems?: (typeof setlistItems.$inferSelect)[]
}

export type Song = typeof songs.$inferSelect

export type GalleryItem = typeof galleryItems.$inferSelect

export type VideoItem = typeof videos.$inferSelect

export type BandMember = typeof bandMembers.$inferSelect

export type NewsPost = typeof newsPosts.$inferSelect

export type SetlistItem = typeof setlistItems.$inferSelect

export interface GigsApiResponse {
  upcoming: Gig[]
  past: Gig[]
  all: Gig[]
}

export interface MerchProduct {
  id: string
  name: string
  typeSv: string
  typeEn: string
  categorySv: string
  categoryEn: string
  price: string
  image: string
  url: string
}

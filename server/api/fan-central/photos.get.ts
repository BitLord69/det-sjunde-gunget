import { desc, eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { fanSubmissions } from '../../db/schema'

export default defineEventHandler(async () => {
  // Only return approved photos to the public
  const photos = await db
    .select({
      id: fanSubmissions.id,
      mediaUrl: fanSubmissions.mediaUrl,
      caption: fanSubmissions.caption,
      location: fanSubmissions.location,
      takenWhen: fanSubmissions.takenWhen,
      uploaderName: fanSubmissions.uploaderName,
      rotation: fanSubmissions.rotation,
      fastenerType: fanSubmissions.fastenerType,
      pinColor: fanSubmissions.pinColor,
      isMachineFan: fanSubmissions.isMachineFan,
      createdAt: fanSubmissions.createdAt,
    })
    .from(fanSubmissions)
    .where(eq(fanSubmissions.status, 'approved'))
    .orderBy(desc(fanSubmissions.createdAt))

  return photos
})

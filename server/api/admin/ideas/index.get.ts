import { desc, eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { voiceMemos, songs } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  try {
    const memos = await db
      .select({
        id: voiceMemos.id,
        title: voiceMemos.title,
        audioUrl: voiceMemos.audioUrl,
        duration: voiceMemos.duration,
        key: voiceMemos.key,
        bpm: voiceMemos.bpm,
        tags: voiceMemos.tags,
        notes: voiceMemos.notes,
        recordedBy: voiceMemos.recordedBy,
        linkedSongId: voiceMemos.linkedSongId,
        createdAt: voiceMemos.createdAt,
        updatedAt: voiceMemos.updatedAt,
        linkedSongTitle: songs.title,
      })
      .from(voiceMemos)
      .leftJoin(songs, eq(voiceMemos.linkedSongId, songs.id))
      .orderBy(desc(voiceMemos.createdAt))

    return memos
  } catch (error: any) {
    console.error('[Ideas API] Error fetching voice memos:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Kunde inte hämta idébankens röstmemos.',
    })
  }
})

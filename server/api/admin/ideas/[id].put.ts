import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { voiceMemos } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID saknas.' })
  }

  const body = await readBody(event)
  if (!body.title) {
    throw createError({ statusCode: 400, statusMessage: 'Titel kan inte vara tom.' })
  }

  try {
    await db
      .update(voiceMemos)
      .set({
        title: body.title.trim(),
        key: body.key?.trim() || null,
        bpm: body.bpm ? parseInt(body.bpm, 10) : null,
        tags: body.tags?.trim() || null,
        notes: body.notes?.trim() || null,
        recordedBy: body.recordedBy?.trim() || null,
        linkedSongId: body.linkedSongId || null,
        updatedAt: new Date(),
      })
      .where(eq(voiceMemos.id, id))

    return {
      success: true,
      id,
    }
  } catch (error: any) {
    console.error('[Ideas API] Error updating voice memo:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Kunde inte uppdatera röstmemot.',
    })
  }
})

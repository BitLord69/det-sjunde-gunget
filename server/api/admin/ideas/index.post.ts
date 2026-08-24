import { nanoid } from 'nanoid'
import { db } from '../../../db/client'
import { voiceMemos } from '../../../db/schema'
import { requireAdminAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminAuth(event)
  const body = await readBody(event)

  if (!body.title || !body.audioUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Titel och ljudfil/URL krävs för att spara en idé.',
    })
  }

  const id = body.id || `memo-${nanoid(8)}`
  const now = new Date()

  try {
    await db.insert(voiceMemos).values({
      id,
      title: body.title.trim(),
      audioUrl: body.audioUrl,
      duration: body.duration ? parseInt(body.duration, 10) : 0,
      key: body.key?.trim() || null,
      bpm: body.bpm ? parseInt(body.bpm, 10) : null,
      tags: body.tags?.trim() || null,
      notes: body.notes?.trim() || null,
      recordedBy: body.recordedBy?.trim() || admin.name || null,
      linkedSongId: body.linkedSongId || null,
      createdAt: now,
      updatedAt: now,
    })

    return {
      success: true,
      id,
    }
  } catch (error: any) {
    console.error('[Ideas API] Error saving voice memo:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Kunde inte spara röstmemot i databasen.',
    })
  }
})

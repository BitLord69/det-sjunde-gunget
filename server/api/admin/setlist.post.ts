import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../db/client'
import { setlistItems } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  if (!body.title?.trim()) {
    throw createError({ statusCode: 400, message: 'Låttitel krävs' })
  }

  const id = body.id || `set-${nanoid(8)}`
  const now = new Date()

  if (body.id) {
    await db
      .update(setlistItems)
      .set({
        title: body.title.trim(),
        artist: body.artist?.trim() || null,
        isOriginal: !!body.isOriginal,
        setName: body.setName?.trim() || 'Set 1',
        notes: body.notes?.trim() || null,
        sortOrder: parseInt(body.sortOrder ?? 0),
        updatedAt: now,
      })
      .where(eq(setlistItems.id, body.id))

    return { success: true, id: body.id, updated: true }
  } else {
    await db.insert(setlistItems).values({
      id,
      title: body.title.trim(),
      artist: body.artist?.trim() || null,
      isOriginal: !!body.isOriginal,
      setName: body.setName?.trim() || 'Set 1',
      notes: body.notes?.trim() || null,
      sortOrder: parseInt(body.sortOrder ?? 0),
      createdAt: now,
      updatedAt: now,
    })

    return { success: true, id, created: true }
  }
})

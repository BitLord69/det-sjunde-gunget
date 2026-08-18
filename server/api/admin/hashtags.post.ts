import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../db/client'
import { socialHashtags } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody(event)

  if (!body.tag) {
    throw createError({ statusCode: 400, message: 'Taggtitel saknas.' })
  }

  // Ensure tag starts with # and has no spaces
  let cleanTag = body.tag.trim()
  if (!cleanTag.startsWith('#')) {
    cleanTag = `#${cleanTag}`
  }
  cleanTag = cleanTag.replace(/\s+/g, '')

  const category = body.category || 'all'
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true
  const sortOrder = body.sortOrder ? parseInt(body.sortOrder, 10) : 0
  const now = new Date()

  if (body.id) {
    // Update
    await db
      .update(socialHashtags)
      .set({
        tag: cleanTag,
        category,
        isActive,
        sortOrder,
        updatedAt: now,
      })
      .where(eq(socialHashtags.id, body.id))

    return { success: true, id: body.id, updated: true }
  } else {
    // Insert
    const id = `tag-${nanoid(8)}`
    await db.insert(socialHashtags).values({
      id,
      tag: cleanTag,
      category,
      isActive,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    })

    return { success: true, id, created: true }
  }
})

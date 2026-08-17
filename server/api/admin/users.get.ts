import { db } from '../../db/client'
import { admins } from '../../db/schema'
import { requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  const adminList = await db.select().from(admins)

  // Map to safe objects without password hashes or salts
  return adminList.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    username: a.username,
    role: a.role,
    provider: a.provider,
    avatarUrl: a.avatarUrl,
    createdAt: a.createdAt,
  }))
})

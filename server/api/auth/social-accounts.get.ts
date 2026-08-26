import { and, eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { adminAccounts, admins } from '../../db/schema'
import { ensureAdminAccountsTable, requireAdminAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const currentAdmin = await requireAdminAuth(event)
  await ensureAdminAccountsTable()

  // Fetch all connected social accounts for this admin
  const connectedRows = await db
    .select()
    .from(adminAccounts)
    .where(eq(adminAccounts.adminId, currentAdmin.id))

  const googleRow = connectedRows.find((r) => r.provider === 'google')
  const githubRow = connectedRows.find((r) => r.provider === 'github')
  const facebookRow = connectedRows.find((r) => r.provider === 'facebook')

  const googleConnected = !!googleRow || currentAdmin.provider === 'google'
  const githubConnected = !!githubRow || currentAdmin.provider === 'github'
  const facebookConnected = !!facebookRow || currentAdmin.provider === 'facebook'

  return {
    google: {
      connected: googleConnected,
      email: googleRow?.email || (currentAdmin.provider === 'google' ? currentAdmin.email : null),
      name: googleRow?.name || (currentAdmin.provider === 'google' ? currentAdmin.name : null),
      avatarUrl: googleRow?.avatarUrl || (currentAdmin.provider === 'google' ? currentAdmin.avatarUrl : null),
      connectedAt: googleRow?.createdAt || null,
    },
    github: {
      connected: githubConnected,
      username: githubRow?.username || (currentAdmin.provider === 'github' ? currentAdmin.username : null),
      email: githubRow?.email || (currentAdmin.provider === 'github' ? currentAdmin.email : null),
      avatarUrl: githubRow?.avatarUrl || (currentAdmin.provider === 'github' ? currentAdmin.avatarUrl : null),
      connectedAt: githubRow?.createdAt || null,
    },
    facebook: {
      connected: facebookConnected,
      name: facebookRow?.name || (currentAdmin.provider === 'facebook' ? currentAdmin.name : null),
      email: facebookRow?.email || (currentAdmin.provider === 'facebook' ? currentAdmin.email : null),
      avatarUrl: facebookRow?.avatarUrl || (currentAdmin.provider === 'facebook' ? currentAdmin.avatarUrl : null),
      connectedAt: facebookRow?.createdAt || null,
    },
  }
})

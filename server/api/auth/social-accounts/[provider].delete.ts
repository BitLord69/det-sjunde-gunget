import { and, eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { adminAccounts, admins } from '../../../db/schema'
import { ensureAdminAccountsTable, requireAdminAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const currentAdmin = await requireAdminAuth(event)
  const provider = getRouterParam(event, 'provider')

  if (!provider || !['google', 'github', 'facebook'].includes(provider)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Ogiltig inloggningstjänst',
    })
  }

  await ensureAdminAccountsTable()

  // Delete from admin_accounts
  await db
    .delete(adminAccounts)
    .where(
      and(
        eq(adminAccounts.adminId, currentAdmin.id),
        eq(adminAccounts.provider, provider)
      )
    )

  // If primary provider matches, revert to credentials
  if (currentAdmin.provider === provider) {
    await db
      .update(admins)
      .set({
        provider: 'credentials',
        updatedAt: new Date(),
      })
      .where(eq(admins.id, currentAdmin.id))
  }

  const providerLabels: Record<string, string> = {
    google: 'Google',
    github: 'GitHub',
    facebook: 'Facebook',
  }

  return {
    success: true,
    message: `Kopplingen till ${providerLabels[provider] || provider} har tagits bort.`,
  }
})

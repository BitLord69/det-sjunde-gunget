import { tursoClient } from '../db/client'
import { DEFAULT_ADMIN_HOME, isAdminHome, normalizeAdminHome } from '../../shared/utils/admin-home'

function isMissingPreferencesTable(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 5 && current instanceof Error; depth++) {
    if (/no such table: (?:main\.)?admin_home_preferences\b/i.test(current.message)) return true
    current = current.cause
  }
  return false
}

export async function getAdminHome(adminId: string) {
  try {
    const result = await tursoClient.execute({
      sql: 'SELECT home_path FROM admin_home_preferences WHERE admin_id = ?',
      args: [adminId],
    })
    return { homePath: normalizeAdminHome(result.rows[0]?.home_path), available: true }
  } catch (error) {
    if (isMissingPreferencesTable(error)) return { homePath: DEFAULT_ADMIN_HOME, available: false }
    throw error
  }
}

export async function saveAdminHome(adminId: string, value: unknown) {
  if (!isAdminHome(value)) {
    throw createError({ statusCode: 400, message: 'Välj en giltig startsida.' })
  }
  try {
    await tursoClient.execute({
      sql: 'INSERT INTO admin_home_preferences (admin_id, home_path) VALUES (?, ?) ON CONFLICT(admin_id) DO UPDATE SET home_path = excluded.home_path',
      args: [adminId, value],
    })
  } catch (error) {
    if (isMissingPreferencesTable(error)) {
      throw createError({ statusCode: 503, message: 'Startsidan kan inte sparas förrän databasuppdateringen har genomförts.' })
    }
    throw error
  }
  return { homePath: value, available: true }
}
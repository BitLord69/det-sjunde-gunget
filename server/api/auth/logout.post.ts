import { destroyAdminSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const revoked = await destroyAdminSession(event)
  return { success: true, revoked, message: revoked ? 'Utloggad' : 'Ingen sessionscookie att återkalla' }
})

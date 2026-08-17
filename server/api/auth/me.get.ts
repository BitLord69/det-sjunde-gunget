import { getAdminFromSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const admin = await getAdminFromSession(event)
  return {
    authenticated: !!admin,
    user: admin,
  }
})

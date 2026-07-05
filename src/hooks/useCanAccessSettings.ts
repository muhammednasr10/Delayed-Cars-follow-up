import { useMemo } from 'react'
import { profileIsAdmin, useAuth } from '../Context/AuthContext'

/** الإعدادات للأدمن فقط (admin / super_admin). */
export function useCanAccessSettings() {
  const { profile } = useAuth()

  const canAccess = useMemo(() => profileIsAdmin(profile), [profile])

  return { canAccess, loading: false }
}

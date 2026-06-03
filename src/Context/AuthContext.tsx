import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../Types/enums'

export type Profile = {
  id: string
  full_name: string | null
  email: string | null
  role: UserRole
  is_active: boolean
  is_blocked?: boolean
  blocked_reason?: string | null
  employee_id?: string | null
  system_role_id?: string | null
  system_role_code?: string | null
  employment_status?: string | null
}

export function profileIsAdmin(profile: Profile | null | undefined): boolean {
  if (!profile) return false
  if (profile.role === 'admin') return true
  const code = profile.system_role_code
  return code === 'admin' || code === 'super_admin'
}

type AuthContextValue = {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  role: UserRole
  accessDeniedMessage: string | null
  signIn: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>
  signOut: () => Promise<void>
  hasRole: (...roles: UserRole[]) => boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const BLOCKED_MSG_AR = 'تم إيقاف حسابك. يرجى التواصل مع الإدارة.'
const EMPLOYEE_STOPPED_MSG_AR = 'الموظف المرتبط بحسابك موقوف عن العمل. يرجى التواصل مع الإدارة.'

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = Boolean(supabase)
  const [loading, setLoading] = useState(configured)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null)

  async function loadProfile(userId: string) {
    if (!supabase) return
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, full_name, email, role, is_active, is_blocked, blocked_reason, employee_id, system_role_id, system_roles(role_code), employees(employment_status)'
      )
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Failed to load profile:', error)
      setProfile(null)
      return
    }

    const row = data as Profile & {
      employees?: { employment_status: string } | null
      system_roles?: { role_code: string } | { role_code: string }[] | null
    } | null
    if (!row) {
      setProfile(null)
      return
    }

    const employment_status = row.employees?.employment_status ?? null
    const sr = row.system_roles
    const system_role_code = Array.isArray(sr) ? sr[0]?.role_code : sr?.role_code
    const mapped: Profile = { ...row, employment_status, system_role_code: system_role_code ?? null }

    if (!row.is_active || row.is_blocked) {
      setAccessDeniedMessage(row.is_blocked ? BLOCKED_MSG_AR : BLOCKED_MSG_AR)
      setProfile(null)
      await supabase.auth.signOut()
      return
    }

    if (employment_status && employment_status !== 'active') {
      setAccessDeniedMessage(EMPLOYEE_STOPPED_MSG_AR)
      setProfile(null)
      await supabase.auth.signOut()
      return
    }

    setAccessDeniedMessage(null)
    setProfile(mapped)
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let mounted = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return
        setSession(data.session)
        setLoading(false)
      })
      .catch(err => {
        console.error('getSession failed:', err)
        if (mounted) setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) {
      setProfile(null)
      return
    }
    void loadProfile(uid)
  }, [session?.user?.id])

  async function signIn(email: string, password: string) {
    if (!supabase) return { ok: false, message: 'Supabase غير مهيأ.' }
    setAccessDeniedMessage(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) return { ok: false, message: error.message }
    return { ok: true }
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setProfile(null)
  }

  const role: UserRole = profile?.role ?? 'viewer'

  function hasRole(...roles: UserRole[]) {
    return roles.includes(role)
  }

  const isAdmin = profileIsAdmin(profile)

  const value = useMemo(
    () => ({
      configured,
      loading,
      session,
      user: session?.user ?? null,
      profile,
      role,
      accessDeniedMessage,
      signIn,
      signOut,
      hasRole,
      isAdmin
    }),
    [configured, loading, session, profile, role, accessDeniedMessage, isAdmin]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}


import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../Types/enums'
import {
  clearSession,
  loginWithEmailPassword,
  registerAuthFailureHandler,
  restoreSessionFromStorage,
  ensureFreshSession,
  isAccessTokenExpired,
  type AppAuthSession
} from '../services/authService'

export type Profile = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url?: string | null
  role: UserRole
  is_active: boolean
  is_blocked?: boolean
  blocked_reason?: string | null
  employee_id?: string | null
  employee_code?: string | null
  employee_full_name?: string | null
  system_role_id?: string | null
  system_role_code?: string | null
  system_role_name_ar?: string | null
  employment_status?: string | null
}

export function profileIsAdmin(profile: Profile | null | undefined): boolean {
  if (!profile) return false
  if (profile.role === 'admin') return true
  const code = profile.system_role_code
  return code === 'admin' || code === 'super_admin'
}

/** Badge label: prefer admin/super_admin when either legacy role or system role grants it. */
export function resolveDisplayRole(profile: Profile | null | undefined, legacyRole: UserRole = 'viewer'): string {
  if (!profile) return legacyRole
  if (profile.system_role_code === 'super_admin') return 'super_admin'
  if (profile.role === 'admin' || profile.system_role_code === 'admin') return 'admin'
  if (profile.system_role_code) return profile.system_role_code
  return profile.role
}

type AuthContextValue = {
  configured: boolean
  loading: boolean
  session: AppAuthSession | null
  user: { id: string; email: string | null } | null
  profile: Profile | null
  role: UserRole
  displayRole: string
  systemRoleCode: string | null
  accessDeniedMessage: string | null
  signIn: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>
  signOut: () => Promise<void>
  reloadProfile: () => Promise<void>
  hasRole: (...roles: UserRole[]) => boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const BLOCKED_MSG_AR = 'تم إيقاف حسابك. يرجى التواصل مع الإدارة.'
const EMPLOYEE_STOPPED_MSG_AR = 'الموظف المرتبط بحسابك موقوف عن العمل. يرجى التواصل مع الإدارة.'
const SESSION_EXPIRED_MSG_AR = 'انتهت الجلسة. سجّل الدخول مرة أخرى.'

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = Boolean(supabase)
  const [loading, setLoading] = useState(configured)
  const [session, setSession] = useState<AppAuthSession | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null)

  function mapProfileRow(row: Record<string, unknown>): Profile {
    return {
      id: row.id as string,
      full_name: (row.full_name as string | null) ?? null,
      email: (row.email as string | null) ?? null,
      avatar_url: (row.avatar_url as string | null) ?? null,
      role: (row.role as UserRole) ?? 'viewer',
      is_active: Boolean(row.is_active),
      is_blocked: Boolean(row.is_blocked),
      blocked_reason: (row.blocked_reason as string | null) ?? null,
      employee_id: (row.employee_id as string | null) ?? null,
      employee_code: (row.employee_code as string | null) ?? null,
      employee_full_name: (row.employee_full_name as string | null) ?? null,
      system_role_id: (row.system_role_id as string | null) ?? null,
      system_role_code: (row.system_role_code as string | null) ?? null,
      system_role_name_ar: (row.system_role_name_ar as string | null) ?? null,
      employment_status: (row.employment_status as string | null) ?? null
    }
  }

  async function loadProfile(userId: string) {
    if (!supabase) return

    let mapped: Profile | null = null

    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_my_profile')
    if (!rpcErr && rpcData && typeof rpcData === 'object') {
      mapped = mapProfileRow(rpcData as Record<string, unknown>)
    } else {
      if (rpcErr && rpcErr.code !== '42883') {
        console.warn('get_my_profile RPC failed, falling back:', rpcErr.message)
      }
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, full_name, email, avatar_url, role, is_active, is_blocked, blocked_reason, employee_id, system_role_id, employees(employee_code, full_name, employment_status)'
        )
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Failed to load profile:', error)
        setProfile(null)
        return
      }
      if (!data) {
        setProfile(null)
        return
      }

      const row = data as Profile & {
        employees?:
          | { employment_status: string; employee_code: string; full_name: string }
          | { employment_status: string; employee_code: string; full_name: string }[]
          | null
      }
      const empRow = Array.isArray(row.employees) ? row.employees[0] : row.employees
      let system_role_code: string | null = null
      let system_role_name_ar: string | null = null
      if (row.system_role_id) {
        const { data: srRow } = await supabase
          .from('system_roles')
          .select('role_code, role_name_ar')
          .eq('id', row.system_role_id)
          .maybeSingle()
        system_role_code = srRow?.role_code ?? null
        system_role_name_ar = srRow?.role_name_ar ?? null
      }
      mapped = {
        ...row,
        employment_status: empRow?.employment_status ?? null,
        employee_code: empRow?.employee_code ?? null,
        employee_full_name: empRow?.full_name ?? null,
        system_role_code,
        system_role_name_ar
      }
    }

    if (!mapped) {
      setProfile(null)
      return
    }

    if (!mapped.is_active || mapped.is_blocked) {
      setAccessDeniedMessage(BLOCKED_MSG_AR)
      setProfile(null)
      clearSession()
      setSession(null)
      return
    }

    if (mapped.employment_status && mapped.employment_status !== 'active') {
      setAccessDeniedMessage(EMPLOYEE_STOPPED_MSG_AR)
      setProfile(null)
      clearSession()
      setSession(null)
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

    let cancelled = false
    void (async () => {
      const stored = await restoreSessionFromStorage()
      if (!cancelled) {
        setSession(stored)
        setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    registerAuthFailureHandler(() => {
      setSession(null)
      setProfile(null)
      setAccessDeniedMessage(SESSION_EXPIRED_MSG_AR)
    })
    return () => registerAuthFailureHandler(null)
  }, [])

  useEffect(() => {
    if (!session) return

    const tick = () => {
      if (isAccessTokenExpired(session)) {
        void ensureFreshSession().then(next => {
          if (next) setSession(next)
        })
      }
    }

    tick()
    const id = window.setInterval(tick, 5 * 60_000)
    return () => window.clearInterval(id)
  }, [session])

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
    const result = await loginWithEmailPassword(email, password)
    if (!result.ok) return { ok: false, message: result.message }
    setSession(result.session)
    await loadProfile(result.session.user.id)
    return { ok: true }
  }

  async function signOut() {
    clearSession()
    setSession(null)
    setProfile(null)
    setAccessDeniedMessage(null)
  }

  const reloadProfile = useCallback(async () => {
    const uid = session?.user?.id
    if (uid) await loadProfile(uid)
  }, [session?.user?.id])

  const role: UserRole = profile?.role ?? 'viewer'
  const displayRole = resolveDisplayRole(profile, role)
  const systemRoleCode = profile?.system_role_code ?? null

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
      displayRole,
      systemRoleCode,
      accessDeniedMessage,
      signIn,
      signOut,
      reloadProfile,
      hasRole,
      isAdmin
    }),
    [configured, loading, session, profile, role, displayRole, systemRoleCode, accessDeniedMessage, isAdmin, reloadProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../Types/enums'
import {
  clearSession,
  loginWithEmailPassword,
  registerAuthFailureHandler,
  restoreSessionFromStorage,
  withTimeout,
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
  employee_is_active?: boolean | null
}

export function profileIsAdmin(profile: Profile | null | undefined): boolean {
  if (!profile) return false
  if (profile.role === 'admin') return true
  const code = profile.system_role_code
  return code === 'admin' || code === 'super_admin'
}

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
const PROFILE_MISSING_MSG_AR = 'تعذّر تحميل بيانات الحساب. يرجى التواصل مع الإدارة.'

type LoadProfileResult = 'ok' | 'blocked' | 'employee_inactive' | 'missing' | 'error'

function loadProfileFailureMessage(result: LoadProfileResult): string {
  if (result === 'blocked') return BLOCKED_MSG_AR
  if (result === 'employee_inactive') return EMPLOYEE_STOPPED_MSG_AR
  if (result === 'missing') return PROFILE_MISSING_MSG_AR
  return 'تعذّر إكمال تسجيل الدخول. تحقق من الاتصال وحاول مرة أخرى.'
}

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
    employment_status: (row.employment_status as string | null) ?? null,
    employee_is_active:
      row.employee_is_active === undefined || row.employee_is_active === null
        ? null
        : Boolean(row.employee_is_active)
  }
}

function profileAccessOk(mapped: Profile): boolean {
  if (!mapped.is_active || mapped.is_blocked) return false
  if (mapped.employment_status && mapped.employment_status !== 'active') return false
  if (mapped.employee_is_active === false) return false
  return true
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = Boolean(supabase)
  const [loading, setLoading] = useState(configured)
  const [session, setSession] = useState<AppAuthSession | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null)
  const profileInflightRef = useRef<Promise<LoadProfileResult> | null>(null)
  const profileLoadedUidRef = useRef<string | null>(null)
  const bootGenRef = useRef(0)

  const kickSession = useCallback((message: string, result: Exclude<LoadProfileResult, 'ok' | 'missing' | 'error'>): LoadProfileResult => {
    profileLoadedUidRef.current = null
    setAccessDeniedMessage(message)
    setProfile(null)
    clearSession()
    setSession(null)
    return result
  }, [])

  const loadProfileInner = useCallback(async (userId: string): Promise<LoadProfileResult> => {
    if (!supabase) return 'error'

    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_my_profile')
    if (!rpcErr && rpcData && typeof rpcData === 'object') {
      const mapped = mapProfileRow(rpcData as Record<string, unknown>)
      if (!profileAccessOk(mapped)) {
        if (!mapped.is_active || mapped.is_blocked) return kickSession(BLOCKED_MSG_AR, 'blocked')
        return kickSession(EMPLOYEE_STOPPED_MSG_AR, 'employee_inactive')
      }
      setAccessDeniedMessage(null)
      setProfile(mapped)
      profileLoadedUidRef.current = userId
      return 'ok'
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, full_name, email, avatar_url, role, is_active, is_blocked, blocked_reason, employee_id, system_role_id, system_roles(role_code, role_name_ar), employees(employee_code, full_name, employment_status, is_active)'
      )
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Failed to load profile:', error)
      setProfile(null)
      return 'error'
    }
    if (!data) {
      setProfile(null)
      return 'missing'
    }

    const row = data as Profile & {
      system_roles?: { role_code: string; role_name_ar: string } | { role_code: string; role_name_ar: string }[] | null
      employees?:
        | { employment_status: string; employee_code: string; full_name: string; is_active: boolean }
        | { employment_status: string; employee_code: string; full_name: string; is_active: boolean }[]
        | null
    }
    const srRow = Array.isArray(row.system_roles) ? row.system_roles[0] : row.system_roles
    const empRow = Array.isArray(row.employees) ? row.employees[0] : row.employees
    const mapped: Profile = {
      ...row,
      employment_status: empRow?.employment_status ?? null,
      employee_code: empRow?.employee_code ?? null,
      employee_full_name: empRow?.full_name ?? null,
      employee_is_active: empRow ? Boolean(empRow.is_active) : null,
      system_role_code: srRow?.role_code ?? null,
      system_role_name_ar: srRow?.role_name_ar ?? null
    }

    if (!profileAccessOk(mapped)) {
      if (!mapped.is_active || mapped.is_blocked) return kickSession(BLOCKED_MSG_AR, 'blocked')
      return kickSession(EMPLOYEE_STOPPED_MSG_AR, 'employee_inactive')
    }

    setAccessDeniedMessage(null)
    setProfile(mapped)
    profileLoadedUidRef.current = userId
    return 'ok'
  }, [kickSession])

  const loadProfile = useCallback(
    async (userId: string, force = false): Promise<LoadProfileResult> => {
      if (!force && profileLoadedUidRef.current === userId) return 'ok'
      if (profileInflightRef.current) return profileInflightRef.current

      const task = loadProfileInner(userId).finally(() => {
        profileInflightRef.current = null
      })
      profileInflightRef.current = task
      return task
    },
    [loadProfileInner]
  )

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    const gen = ++bootGenRef.current
    setLoading(true)
    const BOOT_TIMEOUT_MS = 6_000

    void (async () => {
      try {
        const stored = await withTimeout(restoreSessionFromStorage(), BOOT_TIMEOUT_MS, null)
        if (bootGenRef.current !== gen) return
        setSession(stored)
        if (stored?.user?.id) {
          void loadProfile(stored.user.id)
        }
      } catch (err) {
        console.error('Auth boot failed:', err)
        if (bootGenRef.current === gen) {
          setSession(null)
          setProfile(null)
        }
      } finally {
        if (bootGenRef.current === gen) setLoading(false)
      }
    })()
  }, [loadProfile])

  useEffect(() => {
    registerAuthFailureHandler(() => {
      profileLoadedUidRef.current = null
      setSession(null)
      setProfile(null)
      setAccessDeniedMessage(SESSION_EXPIRED_MSG_AR)
    })
    return () => registerAuthFailureHandler(null)
  }, [])

  useEffect(() => {
    if (!session?.user?.id) return

    const tick = () => {
      void import('../services/authService').then(({ readRawSession, isAccessTokenExpired, ensureFreshSession }) => {
        const current = readRawSession()
        if (!current || !isAccessTokenExpired(current)) return
        void ensureFreshSession().then(next => {
          if (next) setSession(next)
        })
      })
    }

    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [session?.user?.id])

  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) {
      profileLoadedUidRef.current = null
      setProfile(null)
      return
    }
    if (profileLoadedUidRef.current === uid) return
    void loadProfile(uid)
  }, [session?.user?.id, loadProfile])

  async function signIn(email: string, password: string) {
    if (!supabase) return { ok: false, message: 'Supabase غير مهيأ.' }
    setAccessDeniedMessage(null)
    profileLoadedUidRef.current = null
    const result = await loginWithEmailPassword(email, password)
    if (!result.ok) return { ok: false, message: result.message }
    setSession(result.session)
    const profileResult = await loadProfile(result.session.user.id, true)
    if (profileResult !== 'ok') {
      return { ok: false, message: loadProfileFailureMessage(profileResult) }
    }
    return { ok: true }
  }

  async function signOut() {
    profileLoadedUidRef.current = null
    clearSession()
    setSession(null)
    setProfile(null)
    setAccessDeniedMessage(null)
  }

  const reloadProfile = useCallback(async () => {
    const uid = session?.user?.id
    if (uid) await loadProfile(uid, true)
  }, [session?.user?.id, loadProfile])

  const role: UserRole = profile?.role ?? 'viewer'
  const displayRole = resolveDisplayRole(profile, role)
  const systemRoleCode = profile?.system_role_code ?? null
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
      hasRole: (...roles: UserRole[]) => roles.includes(role),
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

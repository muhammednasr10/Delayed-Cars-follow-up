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
}

type AuthContextValue = {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  role: UserRole
  signIn: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>
  signOut: () => Promise<void>
  hasRole: (...roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = Boolean(supabase)
  const [loading, setLoading] = useState(configured)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  async function loadProfile(userId: string) {
    if (!supabase) return
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Failed to load profile:', error)
      setProfile(null)
      return
    }
    setProfile((data as Profile) ?? null)
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

    // IMPORTANT: only touch synchronous state here. Calling Supabase data/auth
    // methods inside this callback can deadlock the auth lock and hang the app.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Load the profile whenever the signed-in user changes (outside the auth lock).
  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) {
      setProfile(null)
      return
    }
    loadProfile(uid)
  }, [session?.user?.id])

  async function signIn(email: string, password: string) {
    if (!supabase) return { ok: false, message: 'Supabase غير مهيأ.' }
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

  const value = useMemo(
    () => ({
      configured,
      loading,
      session,
      user: session?.user ?? null,
      profile,
      role,
      signIn,
      signOut,
      hasRole
    }),
    [configured, loading, session, profile, role]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

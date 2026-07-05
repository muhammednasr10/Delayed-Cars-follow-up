import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing. Falling back to local mock data.')
}

let accessToken: string | null = null
let client: SupabaseClient | null = null

async function authAwareFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const run = async (): Promise<Response> => {
    const headers = new Headers(init.headers)
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
    return fetch(input, { ...init, headers })
  }

  try {
    const { readRawSession, isAccessTokenExpired, ensureFreshSession } = await import('../services/authService')
    const stored = readRawSession()
    if (stored && isAccessTokenExpired(stored)) {
      await ensureFreshSession()
    }
  } catch {
    // auth helpers unavailable during early boot
  }

  let response = await run()
  if (response.status !== 401 && response.status !== 403) return response

  try {
    const clone = response.clone()
    const body = (await clone.json().catch(() => null)) as {
      message?: string
      error?: string
      msg?: string
    } | null
    const message = `${body?.message ?? ''} ${body?.error ?? ''} ${body?.msg ?? ''}`
    const { isJwtExpiredMessage, ensureFreshSession } = await import('../services/authService')
    if (!isJwtExpiredMessage(message)) return response

    const refreshed = await ensureFreshSession()
    if (!refreshed) return response
    response = await run()
  } catch {
    // keep original failed response
  }

  return response
}

function buildClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      fetch: authAwareFetch
    }
  })
}

export function setSupabaseAccessToken(token: string | null) {
  accessToken = token
}

export function getSupabase(): SupabaseClient | null {
  if (!client && supabaseUrl && supabaseAnonKey) {
    client = buildClient()
  }
  return client
}

export const supabase: SupabaseClient | null = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const sb = getSupabase()
    if (!sb) return undefined
    const value = Reflect.get(sb, prop, receiver)
    return typeof value === 'function' ? value.bind(sb) : value
  }
})

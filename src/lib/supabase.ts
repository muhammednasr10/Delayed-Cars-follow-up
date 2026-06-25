import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing. Falling back to local mock data.')
}

let accessToken: string | null = null
let client: SupabaseClient | null = null

function buildClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    }
  })
}

export function setSupabaseAccessToken(token: string | null) {
  accessToken = token
  client = buildClient()
}

export function getSupabase(): SupabaseClient | null {
  if (!client && supabaseUrl && supabaseAnonKey) {
    client = buildClient()
  }
  return client
}

// Initialize on load
setSupabaseAccessToken(null)

export const supabase: SupabaseClient | null = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const sb = getSupabase()
    if (!sb) return undefined
    const value = Reflect.get(sb, prop, receiver)
    return typeof value === 'function' ? value.bind(sb) : value
  }
})

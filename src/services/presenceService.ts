import { supabase } from '../lib/supabase'
import type { UserAccountDetail } from '../Types/permissions'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

/** يُعتبر المستخدم «متصل» إذا كان آخر نشاط خلال هذه الدقائق */
export const PRESENCE_ONLINE_MINUTES = 5

export type ActiveUserSession = UserAccountDetail & {
  last_seen_at: string | null
  last_seen_path: string | null
}

export async function touchMyPresence(path?: string): Promise<void> {
  const { error } = await client().rpc('touch_my_presence', { p_path: path ?? window.location.pathname })
  if (error) throw new Error(error.message)
}

export async function getActiveUserSessions(): Promise<ActiveUserSession[]> {
  const cutoff = new Date(Date.now() - PRESENCE_ONLINE_MINUTES * 60_000).toISOString()
  const { data, error } = await client()
    .from('v_user_accounts_detail')
    .select('*')
    .not('last_seen_at', 'is', null)
    .gte('last_seen_at', cutoff)
    .order('last_seen_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as ActiveUserSession[]
}

export function formatLastSeen(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return locale === 'ar' ? 'الآن' : 'Just now'
  if (diffMin < 60) return locale === 'ar' ? `منذ ${diffMin} د` : `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  return locale === 'ar' ? `منذ ${diffH} س` : `${diffH}h ago`
}

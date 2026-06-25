import { supabase } from '../lib/supabase'
import type { SubmitUserSupportRequestInput, UserRequestStatus, UserSupportRequest } from '../Types/userRequest'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export async function submitUserSupportRequest(input: SubmitUserSupportRequestInput): Promise<string> {
  const { data, error } = await client().rpc('submit_user_support_request', {
    p_type: input.type,
    p_email: input.email.trim(),
    p_message: input.message.trim(),
    p_name: input.name?.trim() ?? null
  })
  if (error) throw new Error(error.message)
  return data as string
}

export async function getUserSupportRequests(status?: UserRequestStatus | 'open'): Promise<UserSupportRequest[]> {
  let q = client().from('v_user_support_requests_detail').select('*').order('created_at', { ascending: false })
  if (status === 'open') {
    q = q.in('status', ['pending', 'in_progress'])
  } else if (status) {
    q = q.eq('status', status)
  }
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as UserSupportRequest[]
}

export async function updateUserSupportRequest(
  requestId: string,
  patch: { status?: UserRequestStatus; adminNotes?: string }
): Promise<void> {
  const { error } = await client().rpc('update_user_support_request', {
    p_request_id: requestId,
    p_status: patch.status ?? null,
    p_admin_notes: patch.adminNotes ?? null
  })
  if (error) throw new Error(error.message)
}

export async function countOpenUserSupportRequests(): Promise<number> {
  const { count, error } = await client()
    .from('user_support_requests')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pending', 'in_progress'])
  if (error) throw new Error(error.message)
  return count ?? 0
}

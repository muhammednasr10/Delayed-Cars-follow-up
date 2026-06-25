export type UserRequestType = 'password_reset' | 'complaint' | 'account_issue' | 'other'
export type UserRequestStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected'

export type UserSupportRequest = {
  id: string
  request_type: UserRequestType
  email: string
  requester_user_id: string | null
  requester_name: string | null
  message: string
  status: UserRequestStatus
  admin_notes: string | null
  handled_by: string | null
  handled_at: string | null
  created_at: string
  updated_at: string
  requester_profile_name?: string | null
  employee_id?: string | null
  employee_code?: string | null
  employee_full_name?: string | null
  handled_by_name?: string | null
}

export type SubmitUserSupportRequestInput = {
  type: UserRequestType
  email: string
  message: string
  name?: string
}

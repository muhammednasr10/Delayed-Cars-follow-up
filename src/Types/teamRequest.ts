export type TeamRequestStatus = 'pending' | 'accepted' | 'rejected' | 'converted'

export const TEAM_REQUEST_STATUSES: TeamRequestStatus[] = ['pending', 'accepted', 'rejected', 'converted']

export type RequestPerson = {
  id: string
  name: string
  code: string
}

export type TeamRequest = {
  id: string
  requesterId: string
  requesterName: string
  requesterCode: string
  managerId: string
  managerName: string
  managerCode: string
  managerIds: string[]
  managers: RequestPerson[]
  title: string
  description: string | null
  status: TeamRequestStatus
  managerResponse: string | null
  convertedMissionId: string | null
  createdAt: string
  updatedAt: string
}

export type TeamRequestInput = {
  managerIds: string[]
  title: string
  description?: string
}

import type { ResponsibleDepartment, TrainingLevel, TrainingStatus } from './enums'

export type TrainingSkill = {
  id: string
  skillCode: string
  skillNameAr: string | null
  skillNameEn: string | null
  description: string | null
  department: ResponsibleDepartment | null
  stationId: string | null
  validityDays: number | null
  isMandatory: boolean
  isActive: boolean
  standardTimeMinutes: number | null
  requiredManpowerCount: number
  isCritical: boolean
}

export type TrainingSkillInput = {
  skillCode: string
  skillNameAr: string | null
  skillNameEn: string | null
  description: string | null
  department: ResponsibleDepartment | null
  stationId: string | null
  validityDays: number | null
  isMandatory: boolean
  isActive: boolean
  standardTimeMinutes: number | null
  requiredManpowerCount: number
  isCritical: boolean
}

export type StationRequiredSkill = {
  id: string
  stationId: string
  skillId: string
  skillCode: string | null
  skillName: string | null
  requiredLevel: TrainingLevel
  isMandatory: boolean
  notes: string | null
  isActive: boolean
}

export type StationRequiredSkillInput = {
  stationId: string
  skillId: string
  requiredLevel: TrainingLevel
  isMandatory: boolean
  notes: string | null
  isActive: boolean
}

// Row from v_employee_training (effective status accounts for expiry).
export type EmployeeTraining = {
  id: string
  employeeId: string
  employeeCode: string
  employeeName: string
  jobRole: string
  employeeDepartment: ResponsibleDepartment | null
  workAreaId: string | null
  skillId: string
  skillCode: string
  skillName: string
  operationStationId: string | null
  operationStationNumber: string | null
  operationStationName: string | null
  isCritical: boolean
  requiredManpowerCount: number
  level: TrainingLevel
  levelRank: number
  rating: number | null
  status: TrainingStatus
  effectiveStatus: TrainingStatus
  trainingDate: string | null
  expiryDate: string | null
  lastEvaluationDate: string | null
  isExpired: boolean
  isNearExpiry: boolean
  trainerId: string | null
  trainerName: string | null
  notes: string | null
  attachmentUrl: string | null
}

export type EmployeeTrainingInput = {
  employeeId: string
  skillId: string
  level: TrainingLevel
  rating: number | null
  status: TrainingStatus
  trainingDate: string | null
  expiryDate: string | null
  lastEvaluationDate: string | null
  trainerId: string | null
  notes: string | null
  attachmentUrl: string | null
  isActive: boolean
}

// Reasons an employee fails to qualify for a required skill.
export type QualReason = 'not_trained' | 'level_too_low' | 'expired' | 'suspended' | 'in_training'

export type SkillGap = {
  skillId: string
  skillName: string
  requiredLevel: TrainingLevel
  currentLevel: TrainingLevel | null
  reason: QualReason
}

export type EmployeeQualification = {
  employeeId: string
  employeeCode: string
  employeeName: string
  jobRole: string
  qualified: boolean
  gaps: SkillGap[]
}

// Domain enums mirroring the Postgres enum types defined in the migrations.
// Keep these in sync with supabase/migrations/0001_factory_core_schema.sql.

export type UserRole = 'admin' | 'production' | 'warehouse' | 'purchasing' | 'quality' | 'viewer'

export type ProductionOrderStatus = 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'

export type VehicleProductionStatus =
  | 'planned'
  | 'on_line'
  | 'off_line_incomplete'
  | 'rework'
  | 'completed'

export type VehicleCompletionStatus = 'incomplete' | 'complete'

export type VehicleQcStatus = 'pending' | 'passed' | 'failed' | 'not_required'

export type VehicleDeliveryStatus = 'blocked' | 'ready' | 'delivered'

/** Configurable via Settings → missing-part lookups (stored as code in DB). */
export type MissingPartReason = string

/** Configurable via Settings → missing-part lookups (stored as code in DB). */
export type ResponsibleDepartment = string

export type PriorityLevel = 'low' | 'normal' | 'high' | 'critical'

export type MissingPartStatus =
  | 'open'
  | 'waiting_purchase'
  | 'available_in_stock'
  | 'issued_to_production'
  | 'installed'
  | 'qc_pending'
  | 'closed'
  | 'cancelled'

export type QcResult = 'pass' | 'fail'

// Replaces the legacy "DR item" flag. line_stopper = can halt the whole line;
// car_stopper = blocks only this vehicle's completion/delivery.
export type StopperType = 'line_stopper' | 'car_stopper'

// Factory hierarchy level (org structure). Distinct from UserRole, which is the
// system/auth permission level.
export type JobRole =
  | 'general_manager'
  | 'manager'
  | 'engineer'
  | 'supervisor'
  | 'assistant_supervisor'
  | 'technician'

export const JOB_ROLES: JobRole[] = [
  'general_manager',
  'manager',
  'engineer',
  'supervisor',
  'assistant_supervisor',
  'technician'
]

// Which job roles a given role may report to (hierarchy rules). Empty = top.
export const ALLOWED_MANAGER_ROLES: Record<JobRole, JobRole[]> = {
  general_manager: [],
  manager: ['general_manager'],
  engineer: ['manager', 'general_manager'],
  supervisor: ['engineer', 'manager'],
  assistant_supervisor: ['supervisor'],
  technician: ['supervisor', 'assistant_supervisor']
}

// Training matrix
export type TrainingLevel = 'level_0' | 'level_1' | 'level_2' | 'level_3' | 'level_4'
export type TrainingStatus = 'not_trained' | 'in_training' | 'qualified' | 'expired' | 'suspended'

export const TRAINING_LEVELS: TrainingLevel[] = ['level_0', 'level_1', 'level_2', 'level_3', 'level_4']
export const TRAINING_STATUSES: TrainingStatus[] = ['not_trained', 'in_training', 'qualified', 'expired', 'suspended']

export function trainingLevelRank(level: TrainingLevel): number {
  return TRAINING_LEVELS.indexOf(level)
}

// Manpower / station operations
export type StationType = 'main_line' | 'side_assembly' | 'offline_prep'
export const STATION_TYPES: StationType[] = ['main_line', 'side_assembly', 'offline_prep']

// ---- Display labels (Arabic UI, matching the existing app language) --------

export const productionStatusLabel: Record<VehicleProductionStatus, string> = {
  planned: 'مخطط',
  on_line: 'على الخط',
  off_line_incomplete: 'خرجت ناقصة',
  rework: 'إعادة عمل',
  completed: 'مكتملة'
}

export const completionStatusLabel: Record<VehicleCompletionStatus, string> = {
  incomplete: 'غير مكتملة',
  complete: 'مكتملة'
}

export const qcStatusLabel: Record<VehicleQcStatus, string> = {
  pending: 'بانتظار الفحص',
  passed: 'ناجح',
  failed: 'مرفوض',
  not_required: 'غير مطلوب'
}

export const deliveryStatusLabel: Record<VehicleDeliveryStatus, string> = {
  blocked: 'محظورة',
  ready: 'جاهزة للتسليم',
  delivered: 'تم التسليم'
}

export const missingPartStatusLabel: Record<MissingPartStatus, string> = {
  open: 'مفتوح',
  waiting_purchase: 'بانتظار الشراء',
  available_in_stock: 'متاح بالمخزن',
  issued_to_production: 'صُرف للإنتاج',
  installed: 'تم التركيب',
  qc_pending: 'بانتظار الجودة',
  closed: 'مغلق',
  cancelled: 'ملغي'
}

export const priorityLabel: Record<PriorityLevel, string> = {
  low: 'منخفض',
  normal: 'عادي',
  high: 'مرتفع',
  critical: 'حرج'
}

export const departmentLabel: Record<ResponsibleDepartment, string> = {
  warehouse: 'المخازن',
  purchasing: 'المشتريات',
  production: 'الإنتاج',
  quality: 'الجودة',
  supplier: 'المورد',
  management: 'الإدارة'
}

export const reasonLabel: Record<MissingPartReason, string> = {
  stock_shortage: 'نقص مخزون',
  supplier_delay: 'تأخر مورد',
  damaged_part: 'قطعة تالفة',
  qc_rejection: 'رفض جودة',
  wrong_part: 'قطعة خاطئة',
  production_mistake: 'خطأ إنتاج',
  other: 'أخرى'
}

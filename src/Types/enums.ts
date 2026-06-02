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

export type MissingPartReason =
  | 'stock_shortage'
  | 'supplier_delay'
  | 'damaged_part'
  | 'qc_rejection'
  | 'wrong_part'
  | 'production_mistake'
  | 'other'

export type ResponsibleDepartment =
  | 'warehouse'
  | 'purchasing'
  | 'production'
  | 'quality'
  | 'supplier'
  | 'management'

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

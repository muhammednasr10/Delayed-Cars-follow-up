import { addVehicleNote } from '../services/vehicleNotesService'

/** Local date and time written into the notes thread for a later change. */
export function formatActivityStamp(when = new Date()): string {
  const date = `${String(when.getDate()).padStart(2, '0')}/${String(when.getMonth() + 1).padStart(2, '0')}/${when.getFullYear()}`
  const time = `${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`
  return `${date} ${time}`
}

export function withActivityWhen(body: string, when = new Date()): string {
  return `${body.trim()}\n${formatActivityStamp(when)}`
}

/** Best-effort system note on the vehicle thread; never blocks the main action. */
export async function logVehicleActivityNote(
  vehicleId: string | null | undefined,
  body: string,
  opts?: { includeWhen?: boolean }
): Promise<void> {
  if (!vehicleId) return
  const trimmed = body.trim()
  if (!trimmed) return
  const text = opts?.includeWhen === false ? trimmed : withActivityWhen(trimmed)
  try {
    await addVehicleNote(vehicleId, text)
  } catch {
    /* activity log must not fail the primary mutation */
  }
}

export async function logVehicleActivityNotes(
  entries: Array<{ vehicleId: string; body: string }>,
  opts?: { includeWhen?: boolean }
): Promise<void> {
  const seen = new Set<string>()
  for (const entry of entries) {
    const key = `${entry.vehicleId}::${entry.body}`
    if (seen.has(key)) continue
    seen.add(key)
    await logVehicleActivityNote(entry.vehicleId, entry.body, opts)
  }
}

const ACTIVITY_CODE_LABELS: Record<string, string> = {
  stock_shortage: 'نقص مخزون',
  supplier_delay: 'تأخر مورد',
  damaged_part: 'قطعة تالفة',
  qc_rejection: 'رفض جودة',
  wrong_part: 'قطعة خاطئة',
  production_mistake: 'خطأ إنتاج',
  other: 'أخرى',
  low: 'منخفض',
  normal: 'عادي',
  high: 'مرتفع',
  critical: 'حرج',
  line_stopper: 'موقف خط',
  car_stopper: 'موقف سيارة'
}

function quoted(label: string): string {
  const name = label.trim() || 'بدون وصف'
  return `«${name}»`
}

function shortageSubject(partLabels: string[]): string {
  const names = partLabels.map(p => p.trim()).filter(Boolean)
  if (names.length === 0) return 'النواقص المفتوحة'
  if (names.length === 1) return `النقص ${quoted(names[0]!)}`
  return `النواقص ${names.map(quoted).join('، ')}`
}

function withUserNotes(head: string, userNotes?: string | null): string {
  const extra = userNotes?.trim()
  if (!extra) return head
  return `${head}\nملاحظة مع التبليغ: ${extra}`
}

export function formatShortageReportNote(partLabels: string[], userNotes?: string | null): string {
  const labels = partLabels.map(p => p.trim()).filter(Boolean)
  const head =
    labels.length === 0
      ? 'تم تبليغ نقص جديد على السيارة.'
      : labels.length === 1
        ? `تم تبليغ نقص جديد على السيارة.\nالسبب: ${quoted(labels[0]!)}`
        : `تم تبليغ ${labels.length} نواقص جديدة على السيارة.\nالأسباب: ${labels.map(quoted).join('، ')}`
  return withUserNotes(head, userNotes)
}

export function formatShortageFollowUpNote(opts: {
  partLabels: string[]
  completingDepartmentLabel?: string | null
  followUpEmployeeLabel?: string | null
}): string {
  const subject = shortageSubject(opts.partLabels)
  const dept = opts.completingDepartmentLabel?.trim()
  const employee = opts.followUpEmployeeLabel?.trim()
  if (!dept && !employee) return `تم إلغاء متابعة ${subject}.`
  const lines = [`تم تسجيل متابعة على ${subject}.`]
  if (dept) lines.push(`القسم اللي هيكمل النقص: ${dept}.`)
  if (employee) lines.push(`الموظف المسؤول عن المتابعة: ${employee}.`)
  return lines.join('\n')
}

export function formatChassisNote(vin: string, text: string | null | undefined): string {
  const label = vin.trim() || '—'
  const body = text?.trim()
  if (!body) return `اتمسحت ملاحظة الشاسيه ${label}.`
  return `ملاحظة على الشاسيه ${label}:\n${body}`
}

export function formatShortageEditNote(partLabel: string, changes: string[]): string {
  const head = `تم تعديل ${shortageSubject([partLabel])}.`
  if (changes.length === 0) return head
  return [head, ...changes].join('\n')
}

export function formatShortageInstallNote(partLabel: string, quantity: number): string {
  return `تم تركيب ${quantity} من ${shortageSubject([partLabel])}.`
}

export function formatShortageDeleteNote(partLabel: string): string {
  return `تم حذف ${shortageSubject([partLabel])} من السيارة.`
}

export function formatShortageTransferNote(partLabel: string, archived: boolean): string {
  const moved = `تم ترحيل ${shortageSubject([partLabel])} لمحطة الجودة.`
  return archived ? `${moved}\nالسيارة اتقفلت وانتقلت للأرشيف لأن مفيش نواقص تانية مفتوحة.` : `${moved}\nالسيارة لسه عليها نواقص تانية مفتوحة.`
}

export function formatShortageCompleteNote(): string {
  return 'تم إغلاق نواقص السيارة ونقلها للأرشيف.'
}

export function formatShortageRestoreNote(): string {
  return 'تم إرجاع السيارة من الأرشيف إلى النواقص الحالية.'
}

export function formatVehicleUpdateNote(changes: string[]): string {
  if (changes.length === 0) return 'تم تعديل بيانات السيارة.'
  return ['تم تعديل بيانات السيارة.', ...changes].join('\n')
}

export function formatWorkflowRequestNote(kind: 'transfer' | 'restore', detail?: string): string {
  if (kind === 'restore') return 'تم إرسال طلب إرجاع السيارة من الأرشيف إلى النواقص الحالية.'
  const name = detail?.replace(/[«»]/g, '').trim()
  return name
    ? `تم إرسال طلب ترحيل النقص ${quoted(name)} لمحطة الجودة.`
    : 'تم إرسال طلب ترحيل النقص لمحطة الجودة.'
}

export function formatWorkflowReviewNote(kind: 'transfer' | 'restore', approved: boolean, note?: string | null): string {
  const action = approved ? 'تم اعتماد' : 'تم رفض'
  const what = kind === 'restore' ? 'طلب إرجاع السيارة من الأرشيف' : 'طلب ترحيل النقص لمحطة الجودة'
  const extra = note?.trim() ? `\nملاحظة: ${note.trim()}` : ''
  return `${action} ${what}.${extra}`
}

/** Drop the extra stamp line and hide empty follow-up phrases so the action reads as sentences. */
export function presentActivityNote(body: string): string {
  let text = body.trim().replace(/\n\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}\s*$/, '')
  text = text.replace(/\s*[—-]\s*بدون قسم متمم/g, '')
  text = text.replace(/\s*[—-]\s*بدون موظف متابعة/g, '')
  text = text.replace(/ ← /g, ' إلى ')
  text = text.replace(/[A-Za-z_]+/g, token => ACTIVITY_CODE_LABELS[token] ?? token)
  return text.trim()
}

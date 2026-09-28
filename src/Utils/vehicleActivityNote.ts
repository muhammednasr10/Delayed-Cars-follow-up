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

function withUserNotes(head: string, userNotes?: string | null): string {
  const extra = userNotes?.trim()
  if (!extra) return head
  return `${head}\nملاحظات: ${extra}`
}

export function formatShortageReportNote(partLabels: string[], userNotes?: string | null): string {
  const labels = partLabels.map(p => p.trim()).filter(Boolean)
  const head =
    labels.length === 0
      ? 'تبليغ نقص جديد.'
      : labels.length === 1
        ? `تبليغ نقص جديد: «${labels[0]}».`
        : `تبليغ نقص جديد (${labels.length}): ${labels.map(l => `«${l}»`).join('، ')}.`
  return withUserNotes(head, userNotes)
}

export function formatShortageFollowUpNote(opts: {
  partLabels: string[]
  completingDepartmentLabel?: string | null
  followUpEmployeeLabel?: string | null
}): string {
  const parts =
    opts.partLabels.length === 0
      ? 'نواقص مفتوحة'
      : opts.partLabels.length === 1
        ? `«${opts.partLabels[0]}»`
        : `${opts.partLabels.length} نواقص`
  const bits: string[] = [`متابعة النقص لـ ${parts}`]
  if (opts.completingDepartmentLabel) bits.push(`القسم المتمم: ${opts.completingDepartmentLabel}`)
  else bits.push('بدون قسم متمم')
  if (opts.followUpEmployeeLabel) bits.push(`موظف المتابعة: ${opts.followUpEmployeeLabel}`)
  else bits.push('بدون موظف متابعة')
  return `${bits.join(' — ')}.`
}

export function formatShortageEditNote(
  partLabel: string,
  changes: string[]
): string {
  const head = `تعديل نقص «${partLabel.trim() || 'بدون وصف'}»`
  if (changes.length === 0) return `${head}.`
  return `${head}: ${changes.join('، ')}.`
}

export function formatShortageInstallNote(partLabel: string, quantity: number): string {
  return `تركيب على النقص «${partLabel.trim() || 'بدون وصف'}»: +${quantity}.`
}

export function formatShortageDeleteNote(partLabel: string): string {
  return `حذف سطر نقص «${partLabel.trim() || 'بدون وصف'}».`
}

export function formatShortageTransferNote(partLabel: string, archived: boolean): string {
  return archived
    ? `ترحيل نقص «${partLabel.trim() || 'بدون وصف'}» وأرشفة السيارة.`
    : `ترحيل نقص «${partLabel.trim() || 'بدون وصف'}».`
}

export function formatShortageCompleteNote(): string {
  return 'أرشفة السيارة — إغلاق/اكتمال النواقص.'
}

export function formatShortageRestoreNote(): string {
  return 'طلب/تنفيذ إرجاع السيارة من الأرشيف إلى النواقص المفتوحة.'
}

export function formatVehicleUpdateNote(changes: string[]): string {
  if (changes.length === 0) return 'تعديل بيانات السيارة.'
  return `تعديل بيانات السيارة: ${changes.join('، ')}.`
}

export function formatWorkflowRequestNote(kind: 'transfer' | 'restore', detail?: string): string {
  if (kind === 'restore') return 'طلب إرجاع السيارة من الأرشيف.'
  return detail ? `طلب ترحيل نقص إلى الجودة${detail}.` : 'طلب ترحيل نقص إلى الجودة.'
}

export function formatWorkflowReviewNote(kind: 'transfer' | 'restore', approved: boolean, note?: string | null): string {
  const action = approved ? 'اعتماد' : 'رفض'
  const base =
    kind === 'restore' ? `${action} طلب إرجاع السيارة من الأرشيف` : `${action} طلب ترحيل النقص`
  const extra = note?.trim() ? ` — ${note.trim()}` : ''
  return `${base}${extra}.`
}

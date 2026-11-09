import { useEffect, useMemo, useState } from 'react'
import { Wrench } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { OrgUnitCascadeField } from '../OrgUnitCascadeField'
import { EmployeeAutocomplete } from '../EmployeeAutocomplete'
import { EquipmentKindSearch } from './EquipmentKindSearch'
import { WorkerLineCommonNameSelect } from './WorkerLineCommonNameSelect'
import type { EquipmentStatus, EquipmentType, LineEquipment, LineEquipmentInput } from '../../Types/equipment'
import { EQUIPMENT_STATUSES } from '../../Types/equipment'
import type { EquipmentKind } from '../../Types/equipmentKind'
import type { FactoryOrgUnit } from '../../Types/factoryOrg'
import type { Employee } from '../../Types/employee'
import { employeeMatchesOrgFilter, orgPathLabel, orgPathFromLeaf } from '../../Utils/employeeOrgPicker'
import { employeeLookupLabel } from '../../Utils/employeeLookup'
import { computeActualOperatingRange, formatRangeBounds } from '../../Utils/equipmentRange'

function emptyForm(): LineEquipmentInput {
  return {
    equipmentCode: '',
    equipmentType: '',
    orgUnitId: null,
    assignedEmployeeId: null,
    workerCommonName: '',
    status: 'active',
    operatingRange: '',
    efficiencyPercent: null,
    notes: ''
  }
}

type Props = {
  open: boolean
  equipmentType?: EquipmentType
  kindLabel?: string
  kinds: EquipmentKind[]
  orgUnits: FactoryOrgUnit[]
  employees: Employee[]
  editing: LineEquipment | null
  onClose: () => void
  onSave: (input: LineEquipmentInput) => void
  saving?: boolean
}

function parseEfficiency(raw: string): number | null | 'invalid' {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed.replace(',', '.'))
  if (!Number.isFinite(n)) return 'invalid'
  if (n < 0 || n > 100) return 'invalid'
  return Math.round(n * 100) / 100
}

export function EquipmentItemFormModal({
  open,
  kindLabel,
  kinds,
  orgUnits,
  employees,
  editing,
  onClose,
  onSave,
  saving
}: Props) {
  const { t } = useLang()
  const [form, setForm] = useState<LineEquipmentInput>(emptyForm())
  const [efficiencyText, setEfficiencyText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        equipmentCode: editing.equipmentCode,
        equipmentType: editing.equipmentType,
        orgUnitId: editing.orgUnitId,
        assignedEmployeeId: editing.assignedEmployeeId,
        workerCommonName: editing.workerCommonName,
        status: editing.status,
        operatingRange: editing.operatingRange,
        efficiencyPercent: editing.efficiencyPercent,
        lastCalibrationAt: editing.lastCalibrationAt,
        lastCalibrationResult: editing.lastCalibrationResult,
        nextCalibrationDue: editing.nextCalibrationDue,
        notes: editing.notes ?? ''
      })
      setEfficiencyText(
        editing.efficiencyPercent == null ? '' : String(editing.efficiencyPercent)
      )
    } else {
      setForm(emptyForm())
      setEfficiencyText('')
    }
    setError('')
  }, [open, editing])

  const selectedKind = useMemo(
    () => kinds.find(k => k.code === form.equipmentType) ?? null,
    [kinds, form.equipmentType]
  )

  const theoreticalRange = useMemo(
    () =>
      selectedKind
        ? formatRangeBounds(selectedKind.rangeMin, selectedKind.rangeMax) || selectedKind.operatingRange
        : '',
    [selectedKind]
  )

  const efficiencyValue = useMemo(() => parseEfficiency(efficiencyText), [efficiencyText])

  const actualRange = useMemo(() => {
    if (!selectedKind || efficiencyValue == null || efficiencyValue === 'invalid') return ''
    return computeActualOperatingRange(selectedKind.rangeMin, selectedKind.rangeMax, efficiencyValue)
  }, [selectedKind, efficiencyValue])

  const workers = useMemo(() => {
    const orgId = form.orgUnitId
    if (!orgId) return employees
    return employees.filter(emp => employeeMatchesOrgFilter(emp.factoryOrgUnitId, orgId, orgUnits))
  }, [employees, form.orgUnitId, orgUnits])

  function setOrgUnit(unitId: string) {
    const next = unitId || null
    const worker = form.assignedEmployeeId
      ? employees.find(emp => emp.id === form.assignedEmployeeId)
      : null
    const workerStillValid =
      !worker || !next || employeeMatchesOrgFilter(worker.factoryOrgUnitId, next, orgUnits)
    setForm(f => ({
      ...f,
      orgUnitId: next,
      assignedEmployeeId: workerStillValid ? f.assignedEmployeeId : null
    }))
  }

  function setWorker(employeeId: string) {
    const employee = employees.find(emp => emp.id === employeeId)
    setForm(f => ({
      ...f,
      assignedEmployeeId: employeeId || null,
      orgUnitId: f.orgUnitId || employee?.factoryOrgUnitId || null
    }))
  }

  function assignmentLocation(): string | undefined {
    const path = form.orgUnitId ? orgPathLabel(orgPathFromLeaf(form.orgUnitId, orgUnits), orgUnits) : null
    const worker = form.assignedEmployeeId
      ? employees.find(emp => emp.id === form.assignedEmployeeId)
      : null
    const workerLabel = worker ? employeeLookupLabel(worker) : null
    const text = [path, workerLabel].filter(Boolean).join(' — ')
    return text || undefined
  }

  function validate(): string | null {
    if (!form.equipmentType.trim()) return t('equipment.errKind')
    if (!form.equipmentCode.trim()) return t('equipment.errCode')
    const eff = parseEfficiency(efficiencyText)
    if (eff === 'invalid') return t('equipment.errEfficiency')
    return null
  }

  function submit() {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    const efficiencyPercent = parseEfficiency(efficiencyText)
    const kind = kinds.find(k => k.code === form.equipmentType)
    const computed =
      efficiencyPercent != null && efficiencyPercent !== 'invalid' && kind
        ? computeActualOperatingRange(kind.rangeMin, kind.rangeMax, efficiencyPercent)
        : ''
    onSave({
      equipmentCode: form.equipmentCode.trim(),
      equipmentType: form.equipmentType,
      orgUnitId: form.orgUnitId || null,
      assignedEmployeeId: form.assignedEmployeeId || null,
      workerCommonName: form.workerCommonName?.trim() || '',
      location: assignmentLocation(),
      status: form.status ?? 'active',
      operatingRange: computed,
      efficiencyPercent: efficiencyPercent === 'invalid' ? null : efficiencyPercent,
      lastCalibrationAt: form.lastCalibrationAt ?? null,
      lastCalibrationResult: form.lastCalibrationResult ?? null,
      nextCalibrationDue: form.nextCalibrationDue ?? null,
      notes: form.notes?.trim() || undefined
    })
  }

  const subtitle =
    kindLabel ||
    (selectedKind
      ? selectedKind.labelAr || selectedKind.labelEn
      : form.equipmentType
        ? t(`equipment.types.${form.equipmentType}`)
        : undefined)

  return (
    <Modal
      open={open}
      title={editing ? t('equipment.editItem') : t('equipment.addItem')}
      subtitle={subtitle}
      icon={<Wrench className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-sky-400 disabled:opacity-60"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}

        <Field label={t('equipment.cols.equipmentType')} required>
          <EquipmentKindSearch
            kinds={kinds}
            value={form.equipmentType}
            onChange={code => setForm(f => ({ ...f, equipmentType: code, operatingRange: '' }))}
          />
        </Field>

        <Field label={t('equipment.cols.id')} required>
          <input
            className={inputCls()}
            value={form.equipmentCode}
            onChange={e => setForm(f => ({ ...f, equipmentCode: e.target.value.toUpperCase() }))}
            placeholder={t('equipment.codePlaceholder')}
            disabled={!!editing}
          />
        </Field>

        <Field label={t('equipment.cols.orgUnit')}>
          <OrgUnitCascadeField
            units={orgUnits}
            value={form.orgUnitId ?? ''}
            onChange={setOrgUnit}
            emptyLabel={t('equipment.selectOrg')}
          />
        </Field>

        <Field label={t('equipment.cols.worker')}>
          <EmployeeAutocomplete
            employees={workers}
            value={form.assignedEmployeeId ?? ''}
            onChange={setWorker}
            placeholder={t('equipment.selectWorker')}
          />
        </Field>

        <Field label={t('equipment.cols.workerCommonName')}>
          <WorkerLineCommonNameSelect
            value={form.workerCommonName ?? ''}
            onChange={commonName => setForm(f => ({ ...f, workerCommonName: commonName }))}
          />
        </Field>

        <Field label={t('equipment.cols.status')} required>
          <select
            className={inputCls()}
            value={form.status ?? 'active'}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as EquipmentStatus }))}
          >
            {EQUIPMENT_STATUSES.map(key => (
              <option key={key} value={key}>
                {t(`equipment.status.${key}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('equipment.cols.theoreticalRange')}>
          <input
            className={`${inputCls()} bg-slate-950/50 text-slate-300`}
            dir="ltr"
            value={theoreticalRange || '—'}
            readOnly
            tabIndex={-1}
          />
        </Field>

        <Field label={t('equipment.cols.efficiency')}>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              className={`${inputCls()} pe-10`}
              value={efficiencyText}
              onChange={e => setEfficiencyText(e.target.value)}
              placeholder={t('equipment.efficiencyPlaceholder')}
            />
            <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm font-bold text-slate-400">
              %
            </span>
          </div>
        </Field>

        <Field label={t('equipment.cols.operatingRange')}>
          <input
            className={`${inputCls()} bg-slate-950/50 font-mono text-slate-200`}
            dir="ltr"
            value={actualRange || '—'}
            readOnly
            tabIndex={-1}
          />
          <p className="mt-1 text-xs text-slate-500">{t('equipment.actualRangeHint')}</p>
        </Field>

        <Field label={t('common.notes')}>
          <textarea
            className={`${inputCls()} min-h-[3rem] resize-y`}
            value={form.notes ?? ''}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </Field>
      </div>
    </Modal>
  )
}

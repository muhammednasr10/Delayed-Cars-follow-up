import { useEffect, useMemo, useState } from 'react'
import { Wrench } from 'lucide-react'
import { CrudSection } from '../CrudSection'
import { Modal } from '../Modal'
import type { EquipmentKind } from '../../Types/equipmentKind'
import type { FactoryOrgUnit } from '../../Types/factoryOrg'
import type { LineEquipment } from '../../Types/equipment'
import type { Employee } from '../../Types/employee'
import {
  createEquipmentKind,
  deleteEquipmentKind,
  isMissingEquipmentKindsTable,
  updateEquipmentKind
} from '../../services/equipmentKindsService'
import { getLineEquipment } from '../../services/equipmentService'
import { getEmployees } from '../../services/employeesService'
import { useLang } from '../../i18n/LanguageContext'
import {
  buildEquipmentKindAreaCounts,
  emptyKindAreaCounts,
  EQUIPMENT_COUNT_AREAS,
  type EquipmentKindAreaCounts
} from '../../Utils/equipmentKindAreaCounts'
import { parseOptionalNumber } from '../../Utils/equipmentRange'

type RunAction = (action: () => Promise<void>, successMessage: string) => Promise<boolean>

type Props = {
  kinds: EquipmentKind[]
  orgUnits: FactoryOrgUnit[]
  setupRequired: boolean
  busy: boolean
  runAction: RunAction
}

export function SettingsEquipmentTab({ kinds, orgUnits, setupRequired, busy, runAction }: Props) {
  const { t } = useLang()
  const [items, setItems] = useState<LineEquipment[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [detailsKind, setDetailsKind] = useState<EquipmentKind | null>(null)

  useEffect(() => {
    if (setupRequired) {
      setItems([])
      setEmployees([])
      return
    }
    let cancelled = false
    void Promise.all([getLineEquipment().catch(() => [] as LineEquipment[]), getEmployees().catch(() => [] as Employee[])])
      .then(([equipment, people]) => {
        if (!cancelled) {
          setItems(equipment)
          setEmployees(people)
        }
      })
    return () => {
      cancelled = true
    }
  }, [setupRequired, kinds])

  const countsByKind = useMemo(
    () =>
      buildEquipmentKindAreaCounts(
        items,
        orgUnits,
        employees.map(e => ({ id: e.id, factoryOrgUnitId: e.factoryOrgUnitId }))
      ),
    [items, orgUnits, employees]
  )

  function countsFor(code: string): EquipmentKindAreaCounts {
    return countsByKind.get(code) ?? emptyKindAreaCounts()
  }

  const detailsCounts = detailsKind ? countsFor(detailsKind.code) : null

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">{t('settings.equipment.hint')}</p>
      <p className="text-xs text-slate-500">{t('settings.equipment.countsHint')}</p>
      {setupRequired && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          {t('settings.equipment.needsTable')}
        </div>
      )}
      <CrudSection
        title={t('settings.tabs.equipment')}
        icon={<Wrench className="h-5 w-5" />}
        items={kinds}
        busy={busy}
        canManage={!setupRequired}
        getId={k => k.code}
        getLabel={k => k.labelAr || k.labelEn || k.code}
        fields={[
          { key: 'labelAr', label: t('settings.fields.labelAr'), required: true },
          { key: 'labelEn', label: t('settings.fields.labelEn'), dir: 'ltr' },
          {
            key: 'manufacturer',
            label: t('settings.fields.manufacturer'),
            placeholder: t('settings.equipment.manufacturerPh'),
            dir: 'ltr'
          },
          {
            key: 'rangeMin',
            label: t('settings.fields.rangeMin'),
            placeholder: t('settings.equipment.rangeMinPh'),
            dir: 'ltr'
          },
          {
            key: 'rangeMax',
            label: t('settings.fields.rangeMax'),
            placeholder: t('settings.equipment.rangeMaxPh'),
            dir: 'ltr'
          }
        ]}
        columns={[
          {
            header: t('settings.equipment.serial'),
            className: 'w-14 text-center',
            render: (_k, index) => (
              <span className="font-mono font-black text-slate-400" dir="ltr">
                {index + 1}
              </span>
            ),
            exportValue: (_k, index) => String(index + 1)
          },
          { header: t('settings.fields.labelAr'), render: k => k.labelAr },
          {
            header: t('settings.fields.labelEn'),
            render: k => (
              <span className="font-mono text-sm text-slate-200" dir="ltr">
                {k.labelEn || '—'}
              </span>
            )
          },
          {
            header: t('settings.fields.manufacturer'),
            render: k => (
              <span dir="ltr">{k.manufacturer || '—'}</span>
            )
          },
          {
            header: t('settings.fields.theoreticalRange'),
            render: k => (
              <span className="font-mono text-sm text-slate-200" dir="ltr">
                {k.operatingRange || '—'}
              </span>
            ),
            exportValue: k => k.operatingRange || ''
          },
          {
            header: t('settings.equipment.countTotal'),
            className: 'text-center',
            render: k => {
              const total = countsFor(k.code).total
              return (
                <button
                  type="button"
                  onClick={() => setDetailsKind(k)}
                  className="rounded-lg px-2 py-1 font-black text-sky-200 hover:bg-sky-500/15 hover:underline"
                  title={t('settings.equipment.openAreaCounts')}
                >
                  {total}
                </button>
              )
            },
            exportValue: k => String(countsFor(k.code).total)
          }
        ]}
        toValues={k => ({
          labelAr: k.labelAr,
          labelEn: k.labelEn,
          manufacturer: k.manufacturer,
          rangeMin: k.rangeMin == null ? '' : String(k.rangeMin),
          rangeMax: k.rangeMax == null ? '' : String(k.rangeMax)
        })}
        onCreate={v =>
          runAction(async () => {
            try {
              await createEquipmentKind({
                labelAr: v.labelAr,
                labelEn: v.labelEn,
                manufacturer: v.manufacturer,
                rangeMin: parseOptionalNumber(v.rangeMin),
                rangeMax: parseOptionalNumber(v.rangeMax)
              })
            } catch (err) {
              if (isMissingEquipmentKindsTable(err)) throw new Error(t('settings.equipment.needsTable'))
              throw err
            }
          }, t('settings.added'))
        }
        onUpdate={(id, v) =>
          runAction(async () => {
            try {
              await updateEquipmentKind(id, {
                labelAr: v.labelAr,
                labelEn: v.labelEn,
                manufacturer: v.manufacturer,
                rangeMin: parseOptionalNumber(v.rangeMin),
                rangeMax: parseOptionalNumber(v.rangeMax)
              })
            } catch (err) {
              if (isMissingEquipmentKindsTable(err)) throw new Error(t('settings.equipment.needsTable'))
              throw err
            }
          }, t('settings.updated'))
        }
        onDelete={id =>
          runAction(async () => {
            try {
              await deleteEquipmentKind(id)
            } catch (err) {
              if (err instanceof Error && err.name === 'EQUIPMENT_KIND_IN_USE') {
                throw new Error(t('settings.equipment.inUse'))
              }
              if (isMissingEquipmentKindsTable(err)) throw new Error(t('settings.equipment.needsTable'))
              throw err
            }
          }, t('settings.deleted'))
        }
      />

      <Modal
        open={!!detailsKind}
        title={t('settings.equipment.areaCountsTitle')}
        subtitle={detailsKind?.labelAr}
        icon={<Wrench className="h-5 w-5" />}
        onClose={() => setDetailsKind(null)}
        maxWidthClass="max-w-md"
        footer={
          <button
            type="button"
            onClick={() => setDetailsKind(null)}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
          >
            {t('common.close')}
          </button>
        }
      >
        {detailsCounts && (
          <div className="space-y-3 p-1">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {EQUIPMENT_COUNT_AREAS.map(area => (
                <div
                  key={area}
                  className="rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-center"
                >
                  <p className="text-xs font-bold text-slate-400">
                    {t(`departments.productionArea.${area}`)}
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">{detailsCounts[area]}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-center">
              <p className="text-xs font-bold text-sky-300/80">{t('settings.equipment.countTotal')}</p>
              <p className="mt-1 text-2xl font-black text-sky-100">{detailsCounts.total}</p>
            </div>
            {detailsCounts.unassigned > 0 && (
              <p className="text-center text-xs text-amber-200">
                {t('settings.equipment.unassignedCount', { n: detailsCounts.unassigned })}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

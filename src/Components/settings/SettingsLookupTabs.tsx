import { Boxes, Building2, ListChecks, Palette } from 'lucide-react'
import { CrudSection } from '../CrudSection'
import {
  createVehicleColor,
  createWorkArea,
  deleteVehicleColor,
  deleteWorkArea,
  updateVehicleColor,
  updateWorkArea
} from '../../services/settingsService'
import {
  createMpDepartmentOption,
  createMpReasonOption,
  deleteMpDepartmentOption,
  deleteMpReasonOption,
  updateMpDepartmentOption,
  updateMpReasonOption
} from '../../services/mpLookupService'
import type { VehicleColor, WorkArea } from '../../Types/settings'
import type { MpLookupOption } from '../../Types/mpLookup'
import { useLang } from '../../i18n/LanguageContext'

type RunAction = (action: () => Promise<void>, successMessage: string) => Promise<boolean>

type TabProps = {
  busy: boolean
  runAction: RunAction
}

export function SettingsAreasTab({ areas, busy, runAction }: TabProps & { areas: WorkArea[] }) {
  const { t } = useLang()
  return (
    <CrudSection
      title={t('settings.tabs.areas')}
      icon={<Boxes className="h-5 w-5" />}
      items={areas}
      busy={busy}
      getId={a => a.id}
      getLabel={a => a.name}
      fields={[
        { key: 'name', label: t('settings.fields.areaName'), required: true },
        { key: 'description', label: t('settings.fields.description') }
      ]}
      columns={[
        { header: t('settings.cols.name'), render: a => a.name },
        { header: t('settings.cols.description'), render: a => a.description || '-' }
      ]}
      toValues={a => ({ name: a.name, description: a.description || '' })}
      onCreate={v => runAction(async () => { await createWorkArea({ name: v.name, description: v.description }) }, t('settings.added'))}
      onUpdate={(id, v) => runAction(async () => { await updateWorkArea(id, { name: v.name, description: v.description }) }, t('settings.updated'))}
      onDelete={id => runAction(() => deleteWorkArea(id), t('settings.deleted'))}
    />
  )
}

export function SettingsColorsTab({ colors, busy, runAction }: TabProps & { colors: VehicleColor[] }) {
  const { t } = useLang()
  return (
    <CrudSection
      title={t('settings.tabs.colors')}
      icon={<Palette className="h-5 w-5" />}
      items={colors}
      busy={busy}
      getId={c => c.id}
      getLabel={c => c.name}
      fields={[
        { key: 'name', label: t('settings.fields.colorName'), required: true },
        { key: 'code', label: t('settings.fields.code'), placeholder: 'blue' },
        { key: 'hex_code', label: t('settings.fields.color'), type: 'color', defaultValue: '#ffffff' }
      ]}
      columns={[
        { header: t('settings.cols.color'), render: c => <span className="inline-block h-5 w-5 rounded-full ring-1 ring-slate-500" style={{ backgroundColor: c.hex_code }} /> },
        { header: t('settings.cols.name'), render: c => c.name },
        { header: t('settings.fields.code'), render: c => <span className="font-mono text-xs text-slate-300">{c.code ?? '—'}</span> },
        { header: t('settings.cols.hex'), render: c => c.hex_code },
        { header: t('settings.cols.active'), render: c => (c.is_active ? t('common.yes') : t('common.no')) }
      ]}
      toValues={c => ({ name: c.name, code: c.code ?? '', hex_code: c.hex_code })}
      onCreate={v => runAction(async () => { await createVehicleColor({ name: v.name, code: v.code, hex_code: v.hex_code }) }, t('settings.added'))}
      onUpdate={(id, v) => runAction(async () => { await updateVehicleColor(id, { name: v.name, code: v.code, hex_code: v.hex_code }) }, t('settings.updated'))}
      onDelete={id => runAction(() => deleteVehicleColor(id), t('settings.deleted'))}
    />
  )
}

const lookupFields = (t: (k: string) => string) => [
  { key: 'code', label: t('settings.fields.code'), required: true },
  { key: 'label_ar', label: t('settings.fields.labelAr'), required: true },
  { key: 'label_en', label: t('settings.fields.labelEn'), required: true },
  { key: 'sort_order', label: t('settings.fields.sortOrder'), defaultValue: '0' },
  {
    key: 'is_active',
    label: t('settings.cols.active'),
    type: 'select' as const,
    options: [
      { value: 'true', label: t('common.yes') },
      { value: 'false', label: t('common.no') }
    ],
    defaultValue: 'true'
  }
]

export function SettingsReasonsTab({ reasonOptions, busy, runAction }: TabProps & { reasonOptions: MpLookupOption[] }) {
  const { t } = useLang()
  return (
    <CrudSection
      title={t('settings.tabs.reasons')}
      icon={<ListChecks className="h-5 w-5" />}
      items={reasonOptions}
      busy={busy}
      getId={r => r.id}
      getLabel={r => r.labelAr}
      fields={[{ ...lookupFields(t)[0], placeholder: 'stock_shortage' }, ...lookupFields(t).slice(1)]}
      columns={[
        { header: t('settings.fields.code'), render: r => <span className="font-mono text-xs">{r.code}</span> },
        { header: t('settings.fields.labelAr'), render: r => r.labelAr },
        { header: t('settings.fields.labelEn'), render: r => r.labelEn },
        { header: t('settings.cols.active'), render: r => (r.isActive ? t('common.yes') : t('common.no')) }
      ]}
      toValues={r => ({
        code: r.code,
        label_ar: r.labelAr,
        label_en: r.labelEn,
        sort_order: String(r.sortOrder),
        is_active: r.isActive ? 'true' : 'false'
      })}
      onCreate={v =>
        runAction(async () => {
          await createMpReasonOption({
            code: v.code,
            label_ar: v.label_ar,
            label_en: v.label_en,
            sort_order: Number(v.sort_order) || 0
          })
        }, t('settings.added'))
      }
      onUpdate={(id, v) =>
        runAction(async () => {
          await updateMpReasonOption(id, {
            label_ar: v.label_ar,
            label_en: v.label_en,
            sort_order: Number(v.sort_order) || 0,
            is_active: v.is_active === 'true'
          })
        }, t('settings.updated'))
      }
      onDelete={id => runAction(() => deleteMpReasonOption(id), t('settings.deleted'))}
    />
  )
}

export function SettingsDepartmentsTab({ departmentOptions, busy, runAction }: TabProps & { departmentOptions: MpLookupOption[] }) {
  const { t } = useLang()
  return (
    <CrudSection
      title={t('settings.tabs.departments')}
      icon={<Building2 className="h-5 w-5" />}
      items={departmentOptions}
      busy={busy}
      getId={d => d.id}
      getLabel={d => d.labelAr}
      fields={[{ ...lookupFields(t)[0], placeholder: 'warehouse' }, ...lookupFields(t).slice(1)]}
      columns={[
        { header: t('settings.fields.code'), render: d => <span className="font-mono text-xs">{d.code}</span> },
        { header: t('settings.fields.labelAr'), render: d => d.labelAr },
        { header: t('settings.fields.labelEn'), render: d => d.labelEn },
        { header: t('settings.cols.active'), render: d => (d.isActive ? t('common.yes') : t('common.no')) }
      ]}
      toValues={d => ({
        code: d.code,
        label_ar: d.labelAr,
        label_en: d.labelEn,
        sort_order: String(d.sortOrder),
        is_active: d.isActive ? 'true' : 'false'
      })}
      onCreate={v =>
        runAction(async () => {
          await createMpDepartmentOption({
            code: v.code,
            label_ar: v.label_ar,
            label_en: v.label_en,
            sort_order: Number(v.sort_order) || 0
          })
        }, t('settings.added'))
      }
      onUpdate={(id, v) =>
        runAction(async () => {
          await updateMpDepartmentOption(id, {
            label_ar: v.label_ar,
            label_en: v.label_en,
            sort_order: Number(v.sort_order) || 0,
            is_active: v.is_active === 'true'
          })
        }, t('settings.updated'))
      }
      onDelete={id => runAction(() => deleteMpDepartmentOption(id), t('settings.deleted'))}
    />
  )
}

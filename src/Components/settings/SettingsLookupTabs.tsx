import { useState } from 'react'
import { Boxes, Building2, ListChecks, Palette, Pencil, Plus, Trash2 } from 'lucide-react'
import { CrudSection } from '../CrudSection'
import { ConfirmDialog } from '../ConfirmDialog'
import { Modal } from '../Modal'
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
  linkMpDepartmentReason,
  unlinkMpDepartmentReason,
  updateMpDepartmentOption,
  updateMpReasonOption
} from '../../services/mpLookupService'
import type { VehicleColor, WorkArea } from '../../Types/settings'
import type { MpDepartmentReasonLink, MpLookupOption } from '../../Types/mpLookup'
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
      onCreate={v =>
        runAction(async () => {
          await createWorkArea({ name: v.name, description: v.description })
        }, t('settings.added'))
      }
      onUpdate={(id, v) =>
        runAction(async () => {
          await updateWorkArea(id, { name: v.name, description: v.description })
        }, t('settings.updated'))
      }
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
        {
          header: t('settings.cols.color'),
          render: c => (
            <span
              className="inline-block h-5 w-5 rounded-full ring-1 ring-slate-500"
              style={{ backgroundColor: c.hex_code }}
            />
          )
        },
        { header: t('settings.cols.name'), render: c => c.name },
        {
          header: t('settings.fields.code'),
          render: c => <span className="font-mono text-xs text-slate-300">{c.code ?? '—'}</span>
        },
        { header: t('settings.cols.hex'), render: c => c.hex_code },
        { header: t('settings.cols.active'), render: c => (c.is_active ? t('common.yes') : t('common.no')) }
      ]}
      toValues={c => ({ name: c.name, code: c.code ?? '', hex_code: c.hex_code })}
      onCreate={v =>
        runAction(async () => {
          await createVehicleColor({ name: v.name, code: v.code, hex_code: v.hex_code })
        }, t('settings.added'))
      }
      onUpdate={(id, v) =>
        runAction(async () => {
          await updateVehicleColor(id, { name: v.name, code: v.code, hex_code: v.hex_code })
        }, t('settings.updated'))
      }
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
      fields={[
        { key: 'label_ar', label: t('settings.fields.labelAr'), required: true },
        { key: 'label_en', label: t('settings.fields.labelEn') },
        { key: 'sort_order', label: t('settings.fields.sortOrder') },
        {
          key: 'is_active',
          label: t('settings.cols.active'),
          type: 'select',
          options: [
            { value: 'true', label: t('common.yes') },
            { value: 'false', label: t('common.no') }
          ],
          defaultValue: 'true'
        }
      ]}
      columns={[
        { header: t('settings.fields.labelAr'), render: r => r.labelAr },
        { header: t('settings.fields.labelEn'), render: r => r.labelEn },
        { header: t('settings.cols.active'), render: r => (r.isActive ? t('common.yes') : t('common.no')) }
      ]}
      toValues={r => ({
        label_ar: r.labelAr,
        label_en: r.labelEn,
        sort_order: String(r.sortOrder),
        is_active: r.isActive ? 'true' : 'false'
      })}
      onCreate={v =>
        runAction(async () => {
          await createMpReasonOption({
            label_ar: v.label_ar,
            label_en: v.label_en || v.label_ar,
            sort_order: Number(v.sort_order) || 0
          })
        }, t('settings.added'))
      }
      onUpdate={(id, v) =>
        runAction(async () => {
          await updateMpReasonOption(id, {
            label_ar: v.label_ar,
            label_en: v.label_en || v.label_ar,
            sort_order: Number(v.sort_order) || 0,
            is_active: v.is_active === 'true'
          })
        }, t('settings.updated'))
      }
      onDelete={id => runAction(() => deleteMpReasonOption(id), t('settings.deleted'))}
    />
  )
}

export function SettingsDepartmentsTab({
  departmentOptions,
  busy,
  runAction
}: TabProps & { departmentOptions: MpLookupOption[] }) {
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

export function SettingsDepartmentReasonNest({
  departmentOptions,
  reasonOptions,
  links,
  busy,
  runAction
}: TabProps & {
  departmentOptions: MpLookupOption[]
  reasonOptions: MpLookupOption[]
  links: MpDepartmentReasonLink[]
}) {
  const { t, lang } = useLang()
  const [reasonForm, setReasonForm] = useState<{
    departmentCode: string
    id: string | null
    label_ar: string
    label_en: string
  } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{
    id: string
    code: string
    name: string
    departmentCode: string
  } | null>(null)

  const departments = [...departmentOptions].sort((a, b) => a.sortOrder - b.sortOrder || a.labelAr.localeCompare(b.labelAr))

  async function saveReason() {
    if (!reasonForm) return
    const labelAr = reasonForm.label_ar.trim()
    const labelEn = reasonForm.label_en.trim() || labelAr
    if (!labelAr) return
    const ok = reasonForm.id
      ? await runAction(async () => {
          await updateMpReasonOption(reasonForm.id!, {
            label_ar: labelAr,
            label_en: labelEn
          })
        }, t('settings.updated'))
      : await runAction(async () => {
          const created = await createMpReasonOption({ label_ar: labelAr, label_en: labelEn })
          await linkMpDepartmentReason(reasonForm.departmentCode, created.code)
        }, t('settings.added'))
    if (ok) setReasonForm(null)
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const ok = await runAction(async () => {
      await unlinkMpDepartmentReason(pendingDelete.departmentCode, pendingDelete.code)
      const remaining = links.filter(
        l => l.reasonCode === pendingDelete.code && l.departmentCode !== pendingDelete.departmentCode
      )
      if (remaining.length === 0) await deleteMpReasonOption(pendingDelete.id)
    }, t('settings.deleted'))
    if (ok) setPendingDelete(null)
  }

  return (
    <section className="card-industrial space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-500/15 p-2.5 text-cyan-300">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">{t('settings.helperLists.nestTitle')}</h3>
            <p className="text-xs text-slate-500">{t('settings.helperLists.nestHint')}</p>
            <p className="mt-1 text-xs text-slate-500">{t('common.items', { n: departments.length })}</p>
          </div>
        </div>
      </div>

      {departments.length === 0 && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          {t('settings.helperLists.noOrgUnits')}
        </p>
      )}

      <div className="space-y-3">
        {departments.map(dept => {
          const linkedCodes = links.filter(l => l.departmentCode === dept.code).map(l => l.reasonCode)
          const linkedReasons = reasonOptions.filter(r => linkedCodes.includes(r.code))
          return (
            <details
              key={dept.id}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
              open
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <p className="font-bold text-slate-100">{lang === 'ar' ? dept.labelAr : dept.labelEn}</p>
                  <p className="text-[11px] text-slate-500">
                    {t('settings.helperLists.reasonCount', { n: linkedReasons.length })}
                  </p>
                </div>
              </summary>

              <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black text-cyan-300">{t('settings.tabs.reasons')}</p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setReasonForm({
                        departmentCode: dept.code,
                        id: null,
                        label_ar: '',
                        label_en: ''
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-cyan-200 hover:bg-slate-700 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" /> {t('settings.helperLists.addReasonUnder')}
                  </button>
                </div>
                {linkedReasons.length === 0 && (
                  <p className="text-xs text-slate-500">{t('settings.helperLists.emptyReasons')}</p>
                )}
                {linkedReasons.map(reason => (
                  <div
                    key={reason.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-slate-100">{lang === 'ar' ? reason.labelAr : reason.labelEn}</p>
                      <p className="font-mono text-[11px] text-slate-500" dir="ltr">
                        {reason.code}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        title={t('common.edit')}
                        onClick={() =>
                          setReasonForm({
                            departmentCode: dept.code,
                            id: reason.id,
                            label_ar: reason.labelAr,
                            label_en: reason.labelEn
                          })
                        }
                        className="rounded-lg p-1.5 text-amber-200 hover:bg-amber-500/15 disabled:opacity-40"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        title={t('common.delete')}
                        onClick={() =>
                          setPendingDelete({
                            id: reason.id,
                            code: reason.code,
                            name: lang === 'ar' ? reason.labelAr : reason.labelEn,
                            departmentCode: dept.code
                          })
                        }
                        className="rounded-lg p-1.5 text-red-300 hover:bg-red-500/15 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )
        })}
      </div>

      <Modal
        open={Boolean(reasonForm)}
        title={
          reasonForm?.id
            ? t('settings.editTitle', { title: t('settings.tabs.reasons') })
            : t('settings.addTitle', { title: t('settings.tabs.reasons') })
        }
        onClose={() => setReasonForm(null)}
        footer={
          <>
            <button type="button" onClick={() => setReasonForm(null)} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200">
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={busy || !reasonForm?.label_ar.trim()}
              onClick={() => void saveReason()}
              className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 disabled:opacity-40"
            >
              {t('common.save')}
            </button>
          </>
        }
      >
        {reasonForm && (
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-400">{t('settings.fields.labelAr')}</span>
              <input
                className="input-dark w-full"
                value={reasonForm.label_ar}
                onChange={e => setReasonForm({ ...reasonForm, label_ar: e.target.value })}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-400">{t('settings.fields.labelEn')}</span>
              <input
                className="input-dark w-full"
                value={reasonForm.label_en}
                onChange={e => setReasonForm({ ...reasonForm, label_en: e.target.value })}
              />
            </label>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t('settings.deleteTitle')}
        message={t('settings.deleteMsg', { name: pendingDelete?.name ?? '' })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  )
}

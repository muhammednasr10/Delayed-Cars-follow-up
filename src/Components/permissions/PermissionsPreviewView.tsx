import { useMemo } from 'react'
import { Check, Eye, EyeOff, Wrench, X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { permissionKey } from '../../services/permissionsService'
import type { SystemPermission } from '../../Types/permissions'
import {
  PRIMARY_CONTROL_ACTIONS,
  type PermissionControlItem,
  type PrimaryControlAction
} from '../../Utils/permissionsControlItems'
import { permissionActionLabel } from '../../Utils/permissionLabels'

type Props = {
  items: PermissionControlItem[]
  effectivePerms: Map<string, boolean>
  subjectLabel: string
}

const PRIMARY_LABEL_KEY: Record<PrimaryControlAction, string> = {
  create: 'permissions.control.btnCreate',
  update: 'permissions.control.btnUpdate',
  delete: 'permissions.control.btnDelete'
}

function isAllowed(perm: SystemPermission | null | undefined, effectivePerms: Map<string, boolean>) {
  if (!perm) return false
  return effectivePerms.get(permissionKey(perm.module_key, perm.permission_key)) ?? false
}

export function PermissionsPreviewView({ items, effectivePerms, subjectLabel }: Props) {
  const { t } = useLang()

  const preview = useMemo(() => {
    const pagesVisible: PermissionControlItem[] = []
    const pagesHidden: PermissionControlItem[] = []
    const actionRows: { item: PermissionControlItem; labels: string[] }[] = []

    for (const item of items) {
      if (item.pagePerm) {
        if (isAllowed(item.pagePerm, effectivePerms)) pagesVisible.push(item)
        else pagesHidden.push(item)
      }

      const labels: string[] = []
      for (const action of PRIMARY_CONTROL_ACTIONS) {
        const perm = item.primaryActions[action]
        if (perm && isAllowed(perm, effectivePerms)) {
          labels.push(t(PRIMARY_LABEL_KEY[action]))
        }
      }
      for (const perm of item.otherActions) {
        if (isAllowed(perm, effectivePerms)) {
          labels.push(permissionActionLabel(perm.permission_key, t))
        }
      }
      if (labels.length > 0) actionRows.push({ item, labels })
    }

    return { pagesVisible, pagesHidden, actionRows }
  }, [items, effectivePerms, t])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3">
        <p className="text-sm font-black text-emerald-100">{t('permissions.preview.heading', { name: subjectLabel })}</p>
        <p className="mt-1 text-xs text-slate-400">{t('permissions.preview.hint')}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-center">
            <p className="text-xl font-black text-emerald-200">{preview.pagesVisible.length}</p>
            <p className="text-[10px] font-bold text-emerald-300/80">{t('permissions.preview.statVisible')}</p>
          </div>
          <div className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-center">
            <p className="text-xl font-black text-slate-200">{preview.pagesHidden.length}</p>
            <p className="text-[10px] font-bold text-slate-400">{t('permissions.preview.statHidden')}</p>
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-center sm:col-span-2">
            <p className="text-xl font-black text-cyan-200">{preview.actionRows.length}</p>
            <p className="text-[10px] font-bold text-cyan-300/80">{t('permissions.preview.statActionPages')}</p>
          </div>
        </div>
      </div>

      <section className="card-industrial space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-emerald-300" />
          <h4 className="text-sm font-black text-emerald-200">{t('permissions.preview.visiblePages')}</h4>
        </div>
        {preview.pagesVisible.length === 0 ? (
          <p className="text-sm text-slate-500">{t('permissions.preview.noneVisible')}</p>
        ) : (
          <ul className="space-y-1.5">
            {preview.pagesVisible.map(item => (
              <li
                key={item.id}
                className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div>
                  {item.parentLabelKey && (
                    <p className="text-[10px] font-bold text-slate-500">{t(item.parentLabelKey)}</p>
                  )}
                  <p className="text-sm font-bold text-white">{t(item.labelKey)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-industrial space-y-3 p-4">
        <div className="flex items-center gap-2">
          <EyeOff className="h-4 w-4 text-slate-400" />
          <h4 className="text-sm font-black text-slate-300">{t('permissions.preview.hiddenPages')}</h4>
        </div>
        {preview.pagesHidden.length === 0 ? (
          <p className="text-sm text-slate-500">{t('permissions.preview.noneHidden')}</p>
        ) : (
          <ul className="space-y-1.5">
            {preview.pagesHidden.map(item => (
              <li
                key={item.id}
                className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2"
              >
                <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div>
                  {item.parentLabelKey && (
                    <p className="text-[10px] font-bold text-slate-600">{t(item.parentLabelKey)}</p>
                  )}
                  <p className="text-sm font-bold text-slate-400">{t(item.labelKey)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-industrial space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-cyan-300" />
          <h4 className="text-sm font-black text-cyan-200">{t('permissions.preview.openActions')}</h4>
        </div>
        {preview.actionRows.length === 0 ? (
          <p className="text-sm text-slate-500">{t('permissions.preview.noneActions')}</p>
        ) : (
          <ul className="space-y-2">
            {preview.actionRows.map(row => (
              <li key={row.item.id} className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-3">
                {row.item.parentLabelKey && (
                  <p className="text-[10px] font-bold text-slate-500">{t(row.item.parentLabelKey)}</p>
                )}
                <p className="font-black text-white">{t(row.item.labelKey)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {row.labels.map(label => (
                    <span
                      key={label}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-200"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

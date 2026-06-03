import { useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { useAuth } from '../../Context/AuthContext'
import { usePartCategories } from '../../hooks/usePartCategories'
import { createPartCategory } from '../../services/partCategoriesService'
import { Field, inputCls } from '../FormField'

export function PartCategoriesTab({ notify }: { notify: (m: string, err?: boolean) => void }) {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const canManage = hasRole('admin')
  const { categories, loading, error, reload } = usePartCategories()
  const [code, setCode] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!code.trim() || !nameAr.trim()) return
    setBusy(true)
    try {
      await createPartCategory({ category_code: code, category_name_ar: nameAr })
      setCode('')
      setNameAr('')
      await reload()
      notify(t('settings.added'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  const uncategorized = categories.find(c => c.category_code === 'UNCATEGORIZED')

  return (
    <div className="space-y-4">
      {error && <div className="rounded-xl border border-red-500/30 p-3 text-sm text-red-200">{error}</div>}
      {uncategorized && (
        <div className="card-industrial border-amber-500/30 p-4 text-sm text-amber-200">
          {t('bom.uncategorizedCount', { n: uncategorized.part_count ?? 0 })}
        </div>
      )}
      {canManage && (
        <div className="card-industrial grid gap-3 p-4 sm:grid-cols-3">
          <Field label={t('bom.categoryCode')}>
            <input className={inputCls()} value={code} onChange={e => setCode(e.target.value)} dir="ltr" />
          </Field>
          <Field label={t('bom.categoryName')}>
            <input className={inputCls()} value={nameAr} onChange={e => setNameAr(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => void add()}
              className="rounded-xl bg-cyan-500 px-4 py-2 font-black text-slate-950 disabled:opacity-50"
            >
              {t('common.add')}
            </button>
          </div>
        </div>
      )}
      <div className="card-industrial overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500">
              <th className="table-cell">{t('bom.categoryCode')}</th>
              <th className="table-cell">{t('bom.categoryName')}</th>
              <th className="table-cell">{t('bom.partsCount')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="table-cell">
                  {t('common.loading')}
                </td>
              </tr>
            ) : (
              categories.map(c => (
                <tr key={c.id} className="border-b border-slate-800/80">
                  <td className="table-cell font-mono text-xs" dir="ltr">
                    {c.category_code}
                  </td>
                  <td className="table-cell">{c.category_name_ar}</td>
                  <td className="table-cell">{c.part_count ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

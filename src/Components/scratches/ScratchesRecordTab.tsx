import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { ScratchFormModal } from './ScratchFormModal'
import { ExportableTable } from '../ExportableTable'
import type { ScratchInput, ScratchRecord } from '../../Types/scratch'

const cell = 'table-cell text-center align-middle whitespace-nowrap px-3 py-2.5'

type Props = {
  items: ScratchRecord[]
  onAdd: (input: ScratchInput) => void
}

export function ScratchesRecordTab({ items, onAdd }: Props) {
  const { t, lang } = useLang()
  const [formOpen, setFormOpen] = useState(false)
  const [success, setSuccess] = useState('')

  function formatDate(iso: string) {
    const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium' })
  }

  function severityBadge(severity: ScratchRecord['severity']) {
    const tones: Record<ScratchRecord['severity'], string> = {
      light: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
      medium: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
      severe: 'bg-red-500/15 text-red-200 border-red-500/30'
    }
    return (
      <span className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-bold ${tones[severity]}`}>
        {t(`scratches.severity.${severity}`)}
      </span>
    )
  }

  function handleSave(input: ScratchInput) {
    onAdd(input)
    setFormOpen(false)
    setSuccess(t('settings.added'))
    window.setTimeout(() => setSuccess(''), 2500)
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">{t('scratches.recordHint')}</p>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-black text-white hover:bg-rose-400"
        >
          <Plus className="h-4 w-4" />
          {t('scratches.addScratch')}
        </button>
      </div>

      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>
      )}

      <div className="card-industrial overflow-hidden">
        <ExportableTable filename="scratches" title={t('scratches.title')} rowCount={items.length}>
        <div className="overflow-x-auto">
        <table className="w-full text-center text-sm">
          <thead className="bg-slate-950/90">
            <tr>
              <th className={`${cell} font-black text-slate-400`}>{t('scratches.cols.vin')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('scratches.cols.area')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('scratches.cols.severity')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('scratches.cols.date')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('common.notes')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-slate-500">
                  {t('scratches.empty')}
                </td>
              </tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                  <td className={`${cell} font-mono font-bold text-white`}>{row.vin}</td>
                  <td className={`${cell} text-slate-200`}>{row.bodyArea}</td>
                  <td className={cell}>{severityBadge(row.severity)}</td>
                  <td className={`${cell} text-slate-300`}>{formatDate(row.recordedAt)}</td>
                  <td className={`${cell} max-w-[14rem] truncate text-slate-400`}>{row.notes || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        </ExportableTable>
      </div>

      <ScratchFormModal open={formOpen} onClose={() => setFormOpen(false)} onSave={handleSave} />
    </div>
  )
}

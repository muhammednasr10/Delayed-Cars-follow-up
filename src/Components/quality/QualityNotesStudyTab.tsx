import { useEffect, useMemo, useState } from 'react'
import { Microscope } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { QualityNoteStudyModal } from './QualityNoteStudyModal'
import type {
  QualityNoteRecord,
  QualityNoteSeverity,
  QualityNoteStatus,
  QualityNoteStudyPatch
} from '../../Types/qualityNote'
import type { MpLookupOption } from '../../Types/mpLookup'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'

import { formatStationReferenceCode } from '../../Utils/stationHierarchy'
const SEVERITIES: QualityNoteSeverity[] = ['low', 'medium', 'high', 'critical']
const STATUSES: QualityNoteStatus[] = ['open', 'under_study', 'closed']

type Props = {
  items: QualityNoteRecord[]
  loading: boolean
  categories: MpLookupOption[]
  onStudy: (id: string, patch: QualityNoteStudyPatch) => Promise<void>
  initialStudyNoteId?: string | null
  onInitialStudyHandled?: () => void
}

function StatPill({ label, value, tone = 'emerald' }: { label: string; value: string; tone?: 'emerald' | 'sky' | 'violet' | 'slate' | 'amber' | 'red' }) {
  const tones = {
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    sky: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
    violet: 'border-violet-500/30 bg-violet-500/10 text-violet-100',
    slate: 'border-slate-600/50 bg-slate-800/50 text-slate-200',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    red: 'border-red-500/30 bg-red-500/10 text-red-100'
  }
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  )
}

const cell = 'table-cell text-center align-middle whitespace-nowrap px-3 py-2.5'

export function QualityNotesStudyTab({
  items,
  loading,
  categories,
  onStudy,
  initialStudyNoteId,
  onInitialStudyHandled
}: Props) {
  const { t, lang } = useLang()
  const [statusFilter, setStatusFilter] = useState<QualityNoteStatus | 'all'>('all')
  const [selected, setSelected] = useState<QualityNoteRecord | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return items
    return items.filter(row => row.status === statusFilter)
  }, [items, statusFilter])

  const stats = useMemo(() => {
    const byStatus = Object.fromEntries(STATUSES.map(s => [s, 0])) as Record<QualityNoteStatus, number>
    const byCategory = new Map<string, number>()
    const bySeverity = Object.fromEntries(SEVERITIES.map(s => [s, 0])) as Record<QualityNoteSeverity, number>
    const byStation = new Map<string, number>()

    for (const row of items) {
      byStatus[row.status] += 1
      byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + 1)
      bySeverity[row.severity] += 1
      const station = row.stationCode?.trim()
        ? formatStationReferenceCode(row.stationCode)
        : '—'
      byStation.set(station, (byStation.get(station) ?? 0) + 1)
    }

    const topStations = [...byStation.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    const topCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

    return { total: items.length, byStatus, topStations, topCategories, critical: bySeverity.critical }
  }, [items])

  function openStudy(note: QualityNoteRecord) {
    setSelected(note)
    setModalOpen(true)
  }

  useEffect(() => {
    if (!initialStudyNoteId || loading) return
    const note = items.find(row => row.id === initialStudyNoteId)
    if (note) {
      setSelected(note)
      setModalOpen(true)
      onInitialStudyHandled?.()
    }
  }, [initialStudyNoteId, items, loading, onInitialStudyHandled])

  async function handleStudy(id: string, patch: QualityNoteStudyPatch) {
    setSaving(true)
    try {
      await onStudy(id, patch)
      setModalOpen(false)
      setSelected(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial p-4 sm:p-5">
        <h3 className="text-sm font-black text-emerald-200">{t('qualityNotes.studySummaryTitle')}</h3>
        <p className="mt-1 text-sm text-slate-400">{t('qualityNotes.studySummaryHint')}</p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatPill label={t('qualityNotes.summary.total')} value={String(stats.total)} />
          <StatPill label={t('qualityNotes.status.open')} value={String(stats.byStatus.open)} tone="sky" />
          <StatPill label={t('qualityNotes.status.under_study')} value={String(stats.byStatus.under_study)} tone="violet" />
          <StatPill label={t('qualityNotes.status.closed')} value={String(stats.byStatus.closed)} tone="slate" />
          <StatPill label={t('qualityNotes.severity.critical')} value={String(stats.critical)} tone="red" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-industrial overflow-x-auto">
          <div className="border-b border-slate-800 px-4 py-3">
            <h4 className="text-sm font-black text-slate-200">{t('qualityNotes.summary.topCategories')}</h4>
          </div>
          <table className="w-full text-center text-sm">
            <thead className="bg-slate-950/90">
              <tr>
                <th className={`${cell} font-black text-slate-400`}>{t('qualityNotes.cols.category')}</th>
                <th className={`${cell} font-black text-slate-400`}>{t('qualityNotes.summary.count')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {stats.topCategories.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-10 text-slate-500">
                    {t('qualityNotes.empty')}
                  </td>
                </tr>
              ) : (
                stats.topCategories.map(([cat, count]) => (
                  <tr key={cat} className="bg-slate-900/30">
                    <td className={`${cell} text-slate-200`}>{mpLookupLabel(categories, cat, lang) || cat}</td>
                    <td className={`${cell} font-black text-white`}>{count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="card-industrial overflow-x-auto">
          <div className="border-b border-slate-800 px-4 py-3">
            <h4 className="text-sm font-black text-slate-200">{t('qualityNotes.summary.topStations')}</h4>
          </div>
          <table className="w-full text-center text-sm">
            <thead className="bg-slate-950/90">
              <tr>
                <th className={`${cell} font-black text-slate-400`}>{t('qualityNotes.cols.station')}</th>
                <th className={`${cell} font-black text-slate-400`}>{t('qualityNotes.summary.count')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {stats.topStations.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-10 text-slate-500">
                    {t('qualityNotes.empty')}
                  </td>
                </tr>
              ) : (
                stats.topStations.map(([station, count]) => (
                  <tr key={station} className="bg-slate-900/30">
                    <td className={`${cell} text-slate-200`}>{station}</td>
                    <td className={`${cell} font-black text-white`}>{count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-industrial overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-sm font-black text-slate-200">{t('qualityNotes.studyListTitle')}</h4>
          <select
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as QualityNoteStatus | 'all')}
          >
            <option value="all">{t('qualityNotes.allStatuses')}</option>
            {STATUSES.map(key => (
              <option key={key} value={key}>
                {t(`qualityNotes.status.${key}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm">
            <thead className="bg-slate-950/90">
              <tr>
                <th className={`${cell} font-black text-slate-400`}>{t('qualityNotes.cols.description')}</th>
                <th className={`${cell} font-black text-slate-400`}>{t('qualityNotes.cols.category')}</th>
                <th className={`${cell} font-black text-slate-400`}>{t('qualityNotes.cols.severity')}</th>
                <th className={`${cell} font-black text-slate-400`}>{t('qualityNotes.cols.status')}</th>
                <th className={`${cell} font-black text-slate-400`}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-slate-500">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-slate-500">
                    {t('qualityNotes.empty')}
                  </td>
                </tr>
              ) : (
                filtered.map(row => (
                  <tr key={row.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                    <td className={`${cell} max-w-[18rem] truncate text-slate-200`} title={row.description}>
                      {row.description}
                    </td>
                    <td className={`${cell} text-slate-300`}>{mpLookupLabel(categories, row.category, lang) || row.category}</td>
                    <td className={`${cell} text-slate-300`}>{t(`qualityNotes.severity.${row.severity}`)}</td>
                    <td className={`${cell} text-slate-300`}>{t(`qualityNotes.status.${row.status}`)}</td>
                    <td className={cell}>
                      <button
                        type="button"
                        onClick={() => openStudy(row)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25"
                      >
                        <Microscope className="h-3.5 w-3.5" />
                        {t('qualityNotes.studyAction')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <QualityNoteStudyModal
        open={modalOpen}
        note={selected}
        onClose={() => {
          setModalOpen(false)
          setSelected(null)
        }}
        onSave={handleStudy}
        saving={saving}
      />
    </div>
  )
}

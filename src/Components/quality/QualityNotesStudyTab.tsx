import { useMemo, useState } from 'react'
import { ListTodo, Microscope } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { QualityNoteAssignMission } from './QualityNoteAssignMission'
import { QualityNoteStudyModal } from './QualityNoteStudyModal'
import { QualityStatPill } from './QualityStatPill'
import { QUALITY_NOTE_CELL } from './qualityNoteConstants'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import { formatStationReferenceCode } from '../../Utils/stationHierarchy'
import { qualityNote8dFilledCount } from '../../Utils/qualityNote8d'
import type { QualityNoteRecord, QualityNoteStudyPatch } from '../../Types/qualityNote'
import type { MpLookupOption } from '../../Types/mpLookup'
import type { Employee } from '../../Types/employee'
import type { ShortageMissionLink, TeamMissionInput } from '../../Types/mission'

type Props = {
  items: QualityNoteRecord[]
  loading: boolean
  categories: MpLookupOption[]
  employees: Employee[]
  linkedMissions: ShortageMissionLink[]
  assignBusy?: boolean
  onStudy: (id: string, patch: QualityNoteStudyPatch) => Promise<void>
  onAssignMission: (note: QualityNoteRecord, input: TeamMissionInput) => Promise<void>
  onOpenMissions?: () => void
}

export function QualityNotesStudyTab({
  items,
  loading,
  categories,
  employees,
  linkedMissions,
  assignBusy,
  onStudy,
  onAssignMission,
  onOpenMissions
}: Props) {
  const { t, lang } = useLang()
  const [selected, setSelected] = useState<QualityNoteRecord | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [missionNote, setMissionNote] = useState<QualityNoteRecord | null>(null)
  const [linkedPanelOpen, setLinkedPanelOpen] = useState(false)

  const queue = useMemo(() => items.filter(row => row.status === 'under_study'), [items])

  const missionsByNoteId = useMemo(() => {
    const map = new Map<string, ShortageMissionLink[]>()
    for (const mission of linkedMissions) {
      const noteId = mission.sourceQualityNoteId
      if (!noteId) continue
      const list = map.get(noteId) ?? []
      list.push(mission)
      map.set(noteId, list)
    }
    return map
  }, [linkedMissions])

  const stats = useMemo(() => {
    let critical = 0
    let recurring = 0
    let with8d = 0
    for (const row of queue) {
      if (row.severity === 'critical') critical++
      else recurring++
      if (qualityNote8dFilledCount(row.study8d) > 0) with8d++
    }
    return { total: queue.length, critical, recurring, with8d }
  }, [queue])

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

  function openAssign(note: QualityNoteRecord) {
    setMissionNote(note)
    setLinkedPanelOpen((missionsByNoteId.get(note.id) ?? []).length > 0)
  }

  const linkedForNote = missionNote ? (missionsByNoteId.get(missionNote.id) ?? []) : []

  return (
    <div className="space-y-4">
      <div className="card-industrial p-4 sm:p-5">
        <h3 className="text-sm font-black text-emerald-200">{t('qualityNotes.studyQueueTitle')}</h3>
        <p className="mt-1 text-sm text-slate-400">{t('qualityNotes.studyQueueHint')}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QualityStatPill label={t('qualityNotes.summary.needsStudy')} value={String(stats.total)} />
          <QualityStatPill
            label={t('qualityNotes.severity.recurring')}
            value={String(stats.recurring)}
            tone="amber"
          />
          <QualityStatPill label={t('qualityNotes.severity.critical')} value={String(stats.critical)} tone="red" />
          <QualityStatPill
            label={t('qualityNotes.summary.eightDStarted')}
            value={String(stats.with8d)}
            tone="sky"
          />
        </div>
      </div>

      <div className="card-industrial overflow-hidden">
        <div className="border-b border-slate-800 p-4">
          <h4 className="text-sm font-black text-slate-200">{t('qualityNotes.studyListTitle')}</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm">
            <thead className="bg-slate-950/90">
              <tr>
                <th className={`${QUALITY_NOTE_CELL} font-black text-slate-400`}>
                  {t('qualityNotes.cols.description')}
                </th>
                <th className={`${QUALITY_NOTE_CELL} font-black text-slate-400`}>{t('qualityNotes.cols.category')}</th>
                <th className={`${QUALITY_NOTE_CELL} font-black text-slate-400`}>{t('qualityNotes.cols.station')}</th>
                <th className={`${QUALITY_NOTE_CELL} font-black text-slate-400`}>{t('qualityNotes.cols.severity')}</th>
                <th className={`${QUALITY_NOTE_CELL} font-black text-slate-400`}>{t('qualityNotes.cols.eightD')}</th>
                <th className={`${QUALITY_NOTE_CELL} font-black text-slate-400`}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-slate-500">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-slate-500">
                    {t('qualityNotes.studyQueueEmpty')}
                  </td>
                </tr>
              ) : (
                queue.map(row => {
                  const filled = qualityNote8dFilledCount(row.study8d)
                  const linkedCount = missionsByNoteId.get(row.id)?.length ?? 0
                  return (
                    <tr key={row.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                      <td
                        className={`${QUALITY_NOTE_CELL} max-w-[18rem] truncate text-slate-200`}
                        title={row.description}
                      >
                        {row.description}
                      </td>
                      <td className={`${QUALITY_NOTE_CELL} text-slate-300`}>
                        {mpLookupLabel(categories, row.category, lang) || row.category}
                      </td>
                      <td className={`${QUALITY_NOTE_CELL} font-mono text-slate-300`} dir="ltr">
                        {row.stationCode ? formatStationReferenceCode(row.stationCode) : '—'}
                      </td>
                      <td className={`${QUALITY_NOTE_CELL} text-slate-300`}>
                        {t(`qualityNotes.severity.${row.severity}`)}
                      </td>
                      <td className={`${QUALITY_NOTE_CELL} font-black text-cyan-200`}>{filled}/8</td>
                      <td className={QUALITY_NOTE_CELL}>
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(row)
                              setModalOpen(true)
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25"
                          >
                            <Microscope className="h-3.5 w-3.5" />
                            {t('qualityNotes.study8dAction')}
                          </button>
                          <button
                            type="button"
                            onClick={() => openAssign(row)}
                            title={
                              linkedCount > 0
                                ? t('qualityNotes.assignMission.linkedCount', { n: linkedCount })
                                : t('qualityNotes.assignMission.open')
                            }
                            className="relative inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-200 hover:bg-amber-500/25"
                          >
                            <ListTodo className="h-3.5 w-3.5" />
                            {t('qualityNotes.assignMission.open')}
                            {linkedCount > 0 && (
                              <span className="rounded-full bg-amber-400 px-1.5 text-[10px] font-black text-slate-950">
                                {linkedCount > 99 ? '99+' : linkedCount}
                              </span>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <QualityNoteStudyModal
        open={modalOpen}
        note={selected}
        saving={saving}
        onClose={() => {
          setModalOpen(false)
          setSelected(null)
        }}
        onSave={(id, patch) => void handleStudy(id, patch)}
      />

      <QualityNoteAssignMission
        note={missionNote}
        linkedForNote={linkedForNote}
        linkedPanelOpen={linkedPanelOpen}
        employees={employees}
        categories={categories}
        saving={assignBusy}
        onClose={() => setMissionNote(null)}
        onOpenLinkedPanel={() => setLinkedPanelOpen(true)}
        onCloseLinkedPanel={() => {
          setLinkedPanelOpen(false)
          setMissionNote(null)
        }}
        onAssignAnother={() => setLinkedPanelOpen(false)}
        onOpenMissions={onOpenMissions}
        onAssign={async (note, input) => {
          await onAssignMission(note, input)
          setMissionNote(null)
          setLinkedPanelOpen(false)
        }}
      />
    </div>
  )
}

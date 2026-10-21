import { ListTodo } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { MissionFormModal } from '../missions/MissionFormModal'
import { MissionStatusBadge } from '../missions/MissionTableBits'
import { Modal } from '../Modal'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import { qualityNoteMissionDescription, qualityNoteMissionTitle } from '../../Utils/qualityNoteMission'
import type { Employee } from '../../Types/employee'
import type { MpLookupOption } from '../../Types/mpLookup'
import type { ShortageMissionLink, TeamMissionInput } from '../../Types/mission'
import type { QualityNoteRecord } from '../../Types/qualityNote'

type Props = {
  note: QualityNoteRecord | null
  linkedForNote: ShortageMissionLink[]
  linkedPanelOpen: boolean
  employees: Employee[]
  categories: MpLookupOption[]
  saving?: boolean
  onClose: () => void
  onOpenLinkedPanel: () => void
  onCloseLinkedPanel: () => void
  onAssignAnother: () => void
  onOpenMissions?: () => void
  onAssign: (note: QualityNoteRecord, input: TeamMissionInput) => Promise<void>
}

export function QualityNoteAssignMission({
  note,
  linkedForNote,
  linkedPanelOpen,
  employees,
  categories,
  saving,
  onClose,
  onCloseLinkedPanel,
  onAssignAnother,
  onOpenMissions,
  onAssign
}: Props) {
  const { t, lang } = useLang()
  const showForm = Boolean(note) && !linkedPanelOpen

  async function saveMission(input: TeamMissionInput) {
    if (!note) return
    const category = mpLookupLabel(categories, note.category, lang) || note.category
    const description =
      input.description?.trim() ||
      qualityNoteMissionDescription(note, {
        category,
        severity: t(`qualityNotes.severity.${note.severity}`),
        repairTime: t(`qualityNotes.repairTime.${note.repairTime}`)
      })
    await onAssign(note, { ...input, description })
  }

  return (
    <>
      <Modal
        open={linkedPanelOpen && Boolean(note)}
        title={t('qualityNotes.assignMission.linkedTitle')}
        icon={<ListTodo className="h-5 w-5" />}
        onClose={onCloseLinkedPanel}
        maxWidthClass="max-w-md"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onCloseLinkedPanel}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
            >
              {t('common.close')}
            </button>
            {onOpenMissions && (
              <button
                type="button"
                onClick={() => {
                  onCloseLinkedPanel()
                  onOpenMissions()
                }}
                className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-500/20"
              >
                {t('qualityNotes.assignMission.openInMissions')}
              </button>
            )}
            <button
              type="button"
              onClick={onAssignAnother}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-400"
            >
              {t('qualityNotes.assignMission.assignAnother')}
            </button>
          </div>
        }
      >
        <ul className="space-y-2">
          {linkedForNote.map(item => (
            <li key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-start">
              <p className="text-sm font-bold text-white">{item.title}</p>
              <div className="mt-1">
                <MissionStatusBadge status={item.status} />
              </div>
            </li>
          ))}
        </ul>
      </Modal>

      <MissionFormModal
        open={showForm}
        employees={employees}
        editing={null}
        defaultTitle={note ? qualityNoteMissionTitle(note) : ''}
        saving={saving}
        zIndexClass="z-[220]"
        onClose={onClose}
        onSave={saveMission}
      />
    </>
  )
}

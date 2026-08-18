import { useMemo, useState } from 'react'
import { ListTodo } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { MissionFormModal } from '../missions/MissionFormModal'
import { uniqueIssueReps } from '../../Utils/missingPartPageUtils'
import type { Employee } from '../../Types/employee'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { TeamMissionInput } from '../../Types/mission'

export type ShortageMissionAssignInput = TeamMissionInput

type Props = {
  parts: MissingPartDetail[]
  employees: Employee[]
  onAssign: (input: ShortageMissionAssignInput) => void | Promise<void>
  busy?: boolean
  className?: string
  iconClassName?: string
}

export function MpAssignShortageMissionButton({
  parts,
  employees,
  onAssign,
  busy,
  className,
  iconClassName
}: Props) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const defaultTitle = useMemo(
    () =>
      uniqueIssueReps(parts)
        .map(p => p.partDescription.trim())
        .filter(Boolean)
        .join(' · '),
    [parts]
  )

  async function save(input: TeamMissionInput) {
    await onAssign(input)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t('mp.assignMission.open')}
        className={className ?? 'rounded-md p-1.5 text-amber-300 hover:bg-amber-500/20'}
      >
        <ListTodo className={iconClassName ?? 'h-[18px] w-[18px]'} />
      </button>
      <MissionFormModal
        open={open}
        employees={employees}
        editing={null}
        defaultTitle={defaultTitle}
        saving={busy}
        zIndexClass="z-[220]"
        onClose={() => setOpen(false)}
        onSave={save}
      />
    </>
  )
}

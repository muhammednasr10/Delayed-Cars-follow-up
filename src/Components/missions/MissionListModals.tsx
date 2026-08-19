import type { Employee } from '../../Types/employee'
import type { TeamMission } from '../../Types/mission'
import { missionShortageLabel } from '../../Utils/missionPeople'
import { MissionDelegateModal } from './MissionDelegateModal'
import { MissionDetailModal } from './MissionDetailModal'
import { MissionRespondModal } from './MissionRespondModal'

type Props = {
  mission: TeamMission | null
  onCloseDetail: () => void
  canDelegate: boolean
  onDelegate?: () => void
  canRespond: boolean
  onRespond?: () => void
  onOpenShortage?: (row: TeamMission) => void
  refreshKey: number
  respondTarget: TeamMission | null
  saving: boolean
  onCloseRespond: () => void
  onSubmitRespond: (response: string, files?: File[]) => void | Promise<void>
  delegateTarget: TeamMission | null
  assignableEmployees: Employee[]
  onCloseDelegate: () => void
  onSubmitDelegate: (assigneeIds: string[]) => void | Promise<void>
}

export function MissionListModals({
  mission,
  onCloseDetail,
  canDelegate,
  onDelegate,
  canRespond,
  onRespond,
  onOpenShortage,
  refreshKey,
  respondTarget,
  saving,
  onCloseRespond,
  onSubmitRespond,
  delegateTarget,
  assignableEmployees,
  onCloseDelegate,
  onSubmitDelegate
}: Props) {
  return (
    <>
      <MissionDetailModal
        mission={mission}
        onClose={onCloseDetail}
        canDelegate={canDelegate}
        onDelegate={onDelegate}
        canRespond={canRespond}
        onRespond={onRespond}
        onOpenShortage={
          mission && missionShortageLabel(mission.sourceVin) && onOpenShortage
            ? () => onOpenShortage(mission)
            : undefined
        }
        refreshKey={refreshKey}
      />
      <MissionRespondModal
        open={Boolean(respondTarget)}
        mission={respondTarget}
        saving={saving}
        onClose={onCloseRespond}
        onRespond={onSubmitRespond}
      />
      <MissionDelegateModal
        open={Boolean(delegateTarget)}
        mission={delegateTarget}
        assignableEmployees={assignableEmployees}
        saving={saving}
        onClose={onCloseDelegate}
        onDelegate={onSubmitDelegate}
      />
    </>
  )
}

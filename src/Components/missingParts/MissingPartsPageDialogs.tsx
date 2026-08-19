import { ReportMissingPartModal } from '../ReportMissingPartModal'
import { UpdateMissingPartModal, type UpdateVehicleContext } from '../UpdateMissingPartModal'
import { EditMissingPartModal } from '../EditMissingPartModal'
import { EditReportGroupModal } from '../EditReportGroupModal'
import { VinListModal, type VinListModalPayload } from '../VinListModal'
import { MissingPartDetailModal } from '../MissingPartDetailModal'
import { VehicleCardModal } from './VehicleCardModal'
import { VehicleNotesModal } from '../VehicleNotesModal'
import { TransferToQualityModal } from './TransferToQualityModal'
import { ConfirmDialog } from '../ConfirmDialog'
import { useLang } from '../../i18n/LanguageContext'
import type { MissingPartDetail, ReportGroupContext, VehicleIssuesContext } from '../../Types/missingPart'
import type { VehicleNoteTarget } from '../../Types/vehicleNote'

type Props = {
  showReport: boolean
  onCloseReport: () => void
  onReported: (msg?: string) => void
  updateVehicle: UpdateVehicleContext | null
  onCloseUpdate: () => void
  onChanged: () => void
  onNotify: (msg: string) => void
  onRequestTransfer: (part: MissingPartDetail) => void
  editVehicle: VehicleIssuesContext | null
  onCloseEditVehicle: () => void
  editGroup: ReportGroupContext | null
  onCloseEditGroup: () => void
  activeItems: MissingPartDetail[]
  onSaved: () => void
  vinList: VinListModalPayload | null
  onCloseVinList: () => void
  canCompleteVinList?: boolean
  onCompleteVinListSelected?: (parts: MissingPartDetail[]) => void
  detailTarget: MissingPartDetail | null
  onCloseDetail: () => void
  vehicleCardParts: MissingPartDetail[] | null
  orgUnitLabel?: string
  orgUnitLabelFor: (id: string | null | undefined) => string
  completingVehicleId: string | null
  transferringPartId: string | null
  restoringVehicleId: string | null
  canTransferIssue: boolean
  canRestoreFromArchive: boolean
  onRestoreFromArchive: (part: MissingPartDetail) => void
  onCloseVehicleCard: () => void
  notesTarget: VehicleNoteTarget | null
  onCloseNotes: () => void
  completeTarget: MissingPartDetail | null
  completeAllTargets: MissingPartDetail[] | null
  completeRemaining: number
  onConfirmComplete: () => void
  onCancelComplete: () => void
  transferPart: MissingPartDetail | null
  onConfirmTransfer: (part: MissingPartDetail, stationId: string) => void
  onCloseTransfer: () => void
  restoreTarget: MissingPartDetail | null
  onConfirmRestore: () => void
  onCancelRestore: () => void
}

export function MissingPartsPageDialogs({
  showReport,
  onCloseReport,
  onReported,
  updateVehicle,
  onCloseUpdate,
  onChanged,
  onNotify,
  onRequestTransfer,
  editVehicle,
  onCloseEditVehicle,
  editGroup,
  onCloseEditGroup,
  activeItems,
  onSaved,
  vinList,
  onCloseVinList,
  canCompleteVinList = false,
  onCompleteVinListSelected,
  detailTarget,
  onCloseDetail,
  vehicleCardParts,
  orgUnitLabel,
  orgUnitLabelFor,
  completingVehicleId,
  transferringPartId,
  restoringVehicleId,
  canTransferIssue,
  canRestoreFromArchive,
  onRestoreFromArchive,
  onCloseVehicleCard,
  notesTarget,
  onCloseNotes,
  completeTarget,
  completeAllTargets,
  completeRemaining,
  onConfirmComplete,
  onCancelComplete,
  transferPart,
  onConfirmTransfer,
  onCloseTransfer,
  restoreTarget,
  onConfirmRestore,
  onCancelRestore
}: Props) {
  const { t } = useLang()

  return (
    <>
      <ReportMissingPartModal open={showReport} onClose={onCloseReport} onReported={onReported} />
      <UpdateMissingPartModal
        vehicle={updateVehicle}
        onClose={onCloseUpdate}
        onChanged={onChanged}
        onNotify={onNotify}
        onRequestTransfer={onRequestTransfer}
      />
      <EditMissingPartModal
        vehicle={editVehicle}
        activeListParts={activeItems}
        onClose={onCloseEditVehicle}
        onSaved={onSaved}
      />
      <EditReportGroupModal
        group={editGroup}
        activeListParts={activeItems}
        onClose={onCloseEditGroup}
        onSaved={onSaved}
      />
      <VinListModal
        payload={vinList}
        canComplete={canCompleteVinList}
        completeBusy={Boolean(completingVehicleId)}
        onClose={onCloseVinList}
        onCompleteSelected={onCompleteVinListSelected}
      />
      <MissingPartDetailModal part={detailTarget} onClose={onCloseDetail} />
      <VehicleCardModal
        parts={vehicleCardParts}
        orgUnitLabel={orgUnitLabel}
        orgUnitLabelFor={orgUnitLabelFor}
        completingVehicleId={completingVehicleId}
        transferringPartId={transferringPartId}
        restoringVehicleId={restoringVehicleId}
        canTransferIssue={canTransferIssue}
        canRestoreFromArchive={canRestoreFromArchive}
        onTransferIssue={onRequestTransfer}
        onRestoreFromArchive={onRestoreFromArchive}
        onClose={onCloseVehicleCard}
      />
      <VehicleNotesModal target={notesTarget} onClose={onCloseNotes} />
      <ConfirmDialog
        open={Boolean(completeTarget || completeAllTargets)}
        title={
          completeAllTargets
            ? t('mp.completeAllConfirm')
            : completeRemaining > 0
              ? t('mp.completePartialTitle')
              : t('mp.complete')
        }
        message={
          completeAllTargets
            ? t('mp.completeAllMessage', { n: completeAllTargets.length })
            : completeTarget
              ? completeRemaining > 0
                ? t('mp.completePartialMessage', { vin: completeTarget.vin, n: completeRemaining })
                : t('mp.completeConfirm', { vin: completeTarget.vin })
              : ''
        }
        confirmLabel={
          completeAllTargets
            ? t('mp.completeAllYes')
            : completeRemaining > 0
              ? t('mp.completePartialYes')
              : t('common.confirm')
        }
        cancelLabel={
          completeAllTargets
            ? t('mp.completePartialNo')
            : completeRemaining > 0
              ? t('mp.completePartialNo')
              : t('common.cancel')
        }
        tone="default"
        busy={Boolean(completingVehicleId)}
        onConfirm={onConfirmComplete}
        onCancel={onCancelComplete}
      />
      <TransferToQualityModal
        part={transferPart}
        busy={Boolean(transferringPartId)}
        onConfirm={onConfirmTransfer}
        onClose={onCloseTransfer}
      />
      <ConfirmDialog
        open={Boolean(restoreTarget)}
        title={t('mp.workflow.restoreConfirmTitle')}
        message={restoreTarget ? t('mp.workflow.restoreConfirm', { vin: restoreTarget.vin }) : ''}
        confirmLabel={t('mp.workflow.submitRestore')}
        cancelLabel={t('common.cancel')}
        tone="default"
        busy={Boolean(restoringVehicleId)}
        onConfirm={onConfirmRestore}
        onCancel={onCancelRestore}
      />
    </>
  )
}

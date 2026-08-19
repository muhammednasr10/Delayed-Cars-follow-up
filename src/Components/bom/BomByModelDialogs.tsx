import { BomIplLogisticsModal } from './BomIplLogisticsModal'
import { BomPartListFormModal } from './BomPartListFormModal'
import { BomFormModal } from './BomFormModal'
import { ConfirmDialog } from '../ConfirmDialog'
import type { BomByModelDataReturn } from '../../hooks/useBomByModelData'

export function BomByModelDialogs({ data }: { data: BomByModelDataReturn }) {
  const {
    t, iplLogisticsGroup, setIplLogisticsGroup, canUpdate, iplSaving,
    saveIplLogistics, partFormOpen, setPartFormOpen, partEditId, partForm,
    partFormBusy, submitPartForm, setPartForm, formMode, editId, editIds,
    setFormMode, setEditId, setEditIds, models, effectiveModelName, reload,
    iplDeleteTarget, setIplDeleteTarget, deleting, confirmIplDelete,
    deleteTarget, setDeleteTarget, confirmDelete
  } = data

  return (
    <>
      <BomIplLogisticsModal
        open={Boolean(iplLogisticsGroup)}
        group={iplLogisticsGroup}
        canUpdate={canUpdate}
        saving={iplSaving}
        onClose={() => setIplLogisticsGroup(null)}
        onSave={saveIplLogistics}
      />

      <BomPartListFormModal
        open={partFormOpen}
        editId={partEditId}
        form={partForm}
        busy={partFormBusy}
        onClose={() => setPartFormOpen(false)}
        onSave={submitPartForm}
        onChange={setPartForm}
      />

      <BomFormModal
        mode={formMode === 'create' ? 'create' : 'edit'}
        itemId={editId}
        editItemIds={editIds.length > 1 ? editIds : undefined}
        open={formMode != null}
        defaultVehicleModelId={models.find(m => m.name === effectiveModelName)?.id || undefined}
        onClose={() => {
          setFormMode(null)
          setEditId(null)
          setEditIds([])
        }}
        onSaved={() => reload(t('settings.updated'))}
      />

      <ConfirmDialog
        open={Boolean(iplDeleteTarget)}
        title={t('bom.iplRemoveFromModelTitle')}
        message={t('bom.iplRemoveFromModelConfirm', {
          name: iplDeleteTarget?.summary.part_name_ar || iplDeleteTarget?.summary.part_name_en || '',
          model: effectiveModelName
        })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        busy={deleting}
        onConfirm={() => void confirmIplDelete()}
        onCancel={() => setIplDeleteTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('bom.deleteRow')}
        message={
          deleteTarget
            ? deleteTarget.variant
              ? `${deleteTarget.group.summary.part_number} — ${deleteTarget.variant.modelName}`
              : `${deleteTarget.group.summary.part_number} — ${deleteTarget.group.summary.applicable_models_text || deleteTarget.group.summary.part_name_ar || ''}${
                  deleteTarget.group.allIds.length > 1
                    ? ` (${t('bom.deleteGroupHint', { n: deleteTarget.group.allIds.length })})`
                    : ''
                }`
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}

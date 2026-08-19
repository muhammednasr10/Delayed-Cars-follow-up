import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, PieChart, ScanLine } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useEmployees } from '../../hooks/useEmployees'
import { useFactoryOrgScope } from '../../hooks/useFactoryOrgScope'
import { useFormatError } from '../../hooks/useFormatError'
import { PageTabShell } from '../../Components/layout/PageTabShell'
import { ScratchesRecordTab } from '../../Components/scratches/ScratchesRecordTab'
import { ScratchesSummaryTab } from '../../Components/scratches/ScratchesSummaryTab'
import {
  assignScratchFollowUp,
  completeScratch,
  createScratch,
  deleteScratch,
  getScratches,
  updateScratch,
  uploadScratchImage
} from '../../services/scratchesService'
import { getScratchNoteCounts } from '../../services/scratchNotesService'
import { createTeamMission, listOpenScratchMissions } from '../../services/missionService'
import { getVehicleModels } from '../../services/settingsService'
import type { ScratchInput, ScratchRecord } from '../../Types/scratch'
import type { VehicleModel } from '../../Types/settings'
import type { MpFollowUpAssignment, ShortageMissionAssignInput } from '../../Types/mpVehicleActions'
import type { ShortageMissionLink } from '../../Types/mission'

type ScratchTab = 'record' | 'summary'

export function ScratchesPage() {
  const { t } = useLang()
  const formatError = useFormatError()
  const { employees } = useEmployees()
  const { filterRecords, isScopedView, scopeLabel } = useFactoryOrgScope(employees)
  const [tab, setTab] = useState<ScratchTab>('record')
  const [items, setItems] = useState<ScratchRecord[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({})
  const [scratchMissions, setScratchMissions] = useState<ShortageMissionLink[]>([])
  const [assignMissionBusy, setAssignMissionBusy] = useState(false)

  const visibleItems = useMemo(() => filterRecords(items), [items, filterRecords])

  const loadExtras = useCallback(async (rows: ScratchRecord[]) => {
    try {
      setNoteCounts(await getScratchNoteCounts(rows.map(r => r.id)))
    } catch {
      setNoteCounts({})
    }
    try {
      setScratchMissions(
        await listOpenScratchMissions(
          rows.map(r => r.id),
          rows.map(r => r.vin)
        )
      )
    } catch {
      setScratchMissions([])
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await getScratches()
      setItems(rows)
      void loadExtras(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [t, loadExtras])

  useEffect(() => {
    void load()
    setModelsLoading(true)
    getVehicleModels()
      .then(setModels)
      .catch(() => setModels([]))
      .finally(() => setModelsLoading(false))
  }, [load])

  const tabs: { key: ScratchTab; label: string; icon: typeof ClipboardList }[] = [
    { key: 'record', label: t('scratches.tabs.record'), icon: ClipboardList },
    { key: 'summary', label: t('scratches.tabs.summary'), icon: PieChart }
  ]

  async function addScratch(input: ScratchInput, imageFile: File | null) {
    setSaving(true)
    setError('')
    try {
      const row = await createScratch(input)
      if (imageFile) {
        await uploadScratchImage(row.id, imageFile)
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
      throw e
    } finally {
      setSaving(false)
    }
  }

  async function editScratch(id: string, input: ScratchInput, imageFile: File | null) {
    setSaving(true)
    setError('')
    try {
      await updateScratch(id, input)
      if (imageFile) {
        await uploadScratchImage(id, imageFile)
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
      throw e
    } finally {
      setSaving(false)
    }
  }

  async function removeScratch(id: string) {
    setSaving(true)
    setError('')
    try {
      await deleteScratch(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
      throw e
    } finally {
      setSaving(false)
    }
  }

  async function followUpScratch(id: string, assignment: MpFollowUpAssignment) {
    setSaving(true)
    setError('')
    try {
      await assignScratchFollowUp(id, assignment)
      await load()
    } catch (e) {
      setError(formatError(e))
    } finally {
      setSaving(false)
    }
  }

  async function finishScratch(id: string) {
    setSaving(true)
    setError('')
    try {
      await completeScratch(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
      throw e
    } finally {
      setSaving(false)
    }
  }

  async function assignMission(row: ScratchRecord, input: ShortageMissionAssignInput) {
    setAssignMissionBusy(true)
    setError('')
    try {
      const vin = row.vin.trim()
      const model = row.modelName?.trim() ?? ''
      await createTeamMission({
        ...input,
        description: input.description?.trim() || [vin, model, row.notes].filter(Boolean).join(' · '),
        sourceScratchId: row.id,
        sourceVin: vin || null,
        sourceModelName: model || null
      })
      setScratchMissions(
        await listOpenScratchMissions(
          items.map(r => r.id),
          items.map(r => r.vin)
        )
      )
    } catch (err) {
      const raw = err instanceof Error ? err.message : ''
      const msg =
        raw === 'ASSIGNEE_NOT_SUBORDINATE' || raw.includes('ASSIGNEE_NOT_SUBORDINATE')
          ? t('missions.errAssigneeNotSubordinate')
          : formatError(err)
      setError(msg)
      throw new Error(msg)
    } finally {
      setAssignMissionBusy(false)
    }
  }

  return (
    <PageTabShell
      title={t('scratches.title')}
      subtitle={t('scratches.subtitle')}
      icon={<ScanLine className="h-6 w-6" />}
      tabs={tabs.map(item => ({ key: item.key, label: item.label, icon: <item.icon className="h-4 w-4" /> }))}
      activeTab={tab}
      onTabChange={setTab}
      activeClassName="bg-rose-500 text-white"
      message={
        error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        ) : isScopedView && scopeLabel ? (
          <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-3 text-sm text-cyan-100">
            {t('org.scopeBanner', { scope: scopeLabel })}
          </div>
        ) : undefined
      }
    >
      {tab === 'record' && (
        <ScratchesRecordTab
          items={visibleItems}
          models={models}
          modelsLoading={modelsLoading}
          loading={loading}
          saving={saving}
          noteCounts={noteCounts}
          scratchMissions={scratchMissions}
          assignMissionBusy={assignMissionBusy}
          onAdd={addScratch}
          onUpdate={editScratch}
          onDelete={removeScratch}
          onFollowUp={followUpScratch}
          onComplete={finishScratch}
          onAssignMission={assignMission}
        />
      )}
      {tab === 'summary' && <ScratchesSummaryTab items={visibleItems} />}
    </PageTabShell>
  )
}

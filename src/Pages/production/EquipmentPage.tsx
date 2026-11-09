import { useEffect, useMemo, useState } from 'react'
import { PieChart, ScrollText, Wrench } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { PageTabShell } from '../../Components/layout/PageTabShell'
import { EquipmentRegistryTab } from '../../Components/equipment/EquipmentRegistryTab'
import { EquipmentSummaryTab } from '../../Components/equipment/EquipmentSummaryTab'
import { EquipmentTransactionLogTab } from '../../Components/equipment/EquipmentTransactionLogTab'
import { getEquipmentKinds } from '../../services/equipmentKindsService'
import { FALLBACK_EQUIPMENT_KINDS, type EquipmentKind } from '../../Types/equipmentKind'

const REGISTRY_TAB = 'registry'
const SUMMARY_TAB = 'summary'
const LOG_TAB = 'transaction_log'

export function EquipmentPage() {
  const { t } = useLang()
  const [kinds, setKinds] = useState<EquipmentKind[]>(FALLBACK_EQUIPMENT_KINDS)
  const [tab, setTab] = useState<string>(REGISTRY_TAB)

  useEffect(() => {
    let cancelled = false
    void getEquipmentKinds()
      .then(rows => {
        if (!cancelled) setKinds(rows)
      })
      .catch(() => {
        if (!cancelled) setKinds(FALLBACK_EQUIPMENT_KINDS)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const tabs = useMemo(
    () => [
      { key: REGISTRY_TAB, label: t('equipment.tabs.registry'), icon: Wrench },
      { key: SUMMARY_TAB, label: t('equipment.tabs.summary'), icon: PieChart },
      { key: LOG_TAB, label: t('equipment.tabs.transactionLog'), icon: ScrollText }
    ],
    [t]
  )

  return (
    <PageTabShell
      title={t('equipment.title')}
      subtitle={t('equipment.subtitle')}
      icon={<Wrench className="h-6 w-6" />}
      tabs={tabs.map(item => ({ key: item.key, label: item.label, icon: <item.icon className="h-4 w-4" /> }))}
      activeTab={tab}
      onTabChange={setTab}
      activeClassName="bg-sky-500 text-slate-950"
    >
      {tab === SUMMARY_TAB ? (
        <EquipmentSummaryTab kinds={kinds} onOpenRegistry={() => setTab(REGISTRY_TAB)} />
      ) : tab === LOG_TAB ? (
        <EquipmentTransactionLogTab kinds={kinds} />
      ) : (
        <EquipmentRegistryTab kinds={kinds} />
      )}
    </PageTabShell>
  )
}

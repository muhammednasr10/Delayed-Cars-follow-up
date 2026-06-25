import { useState } from 'react'
import { Hammer, ScrollText, Wrench, Zap } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { PageTabShell } from '../../Components/layout/PageTabShell'
import { EquipmentRegistryTab } from '../../Components/equipment/EquipmentRegistryTab'
import { EquipmentTransactionLogTab } from '../../Components/equipment/EquipmentTransactionLogTab'

type EquipmentTab = 'rivet_gun' | 'torque_wrench' | 'other' | 'transaction_log'

export function EquipmentPage() {
  const { t } = useLang()
  const [tab, setTab] = useState<EquipmentTab>('rivet_gun')

  const tabs: { key: EquipmentTab; label: string; icon: typeof Wrench }[] = [
    { key: 'rivet_gun', label: t('equipment.tabs.rivetGun'), icon: Zap },
    { key: 'torque_wrench', label: t('equipment.tabs.torqueWrench'), icon: Hammer },
    { key: 'other', label: t('equipment.tabs.other'), icon: Wrench },
    { key: 'transaction_log', label: t('equipment.tabs.transactionLog'), icon: ScrollText }
  ]

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
      {tab === 'rivet_gun' && <EquipmentRegistryTab equipmentType="rivet_gun" />}
      {tab === 'torque_wrench' && <EquipmentRegistryTab equipmentType="torque_wrench" />}
      {tab === 'other' && <EquipmentRegistryTab equipmentType="other" />}
      {tab === 'transaction_log' && <EquipmentTransactionLogTab />}
    </PageTabShell>
  )
}

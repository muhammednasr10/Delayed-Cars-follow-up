import { useState } from 'react'
import { ClipboardList, PieChart, ScanLine } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { PageTabShell } from '../../Components/layout/PageTabShell'
import { ScratchesRecordTab } from '../../Components/scratches/ScratchesRecordTab'
import { ScratchesSummaryTab } from '../../Components/scratches/ScratchesSummaryTab'
import type { ScratchInput, ScratchRecord } from '../../Types/scratch'

type ScratchTab = 'record' | 'summary'

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `scratch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function ScratchesPage() {
  const { t } = useLang()
  const [tab, setTab] = useState<ScratchTab>('record')
  const [items, setItems] = useState<ScratchRecord[]>([])

  const tabs: { key: ScratchTab; label: string; icon: typeof ClipboardList }[] = [
    { key: 'record', label: t('scratches.tabs.record'), icon: ClipboardList },
    { key: 'summary', label: t('scratches.tabs.summary'), icon: PieChart }
  ]

  function addScratch(input: ScratchInput) {
    setItems(prev => [{ ...input, id: newId() }, ...prev])
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
    >
      {tab === 'record' && <ScratchesRecordTab items={items} onAdd={addScratch} />}
      {tab === 'summary' && <ScratchesSummaryTab items={items} />}
    </PageTabShell>
  )
}

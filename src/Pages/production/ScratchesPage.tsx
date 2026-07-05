import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, PieChart, ScanLine } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { PageTabShell } from '../../Components/layout/PageTabShell'
import { ScratchesRecordTab } from '../../Components/scratches/ScratchesRecordTab'
import { ScratchesSummaryTab } from '../../Components/scratches/ScratchesSummaryTab'
import { createScratch, getScratches } from '../../services/scratchesService'
import type { ScratchInput, ScratchRecord } from '../../Types/scratch'

type ScratchTab = 'record' | 'summary'

export function ScratchesPage() {
  const { t } = useLang()
  const [tab, setTab] = useState<ScratchTab>('record')
  const [items, setItems] = useState<ScratchRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await getScratches())
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const tabs: { key: ScratchTab; label: string; icon: typeof ClipboardList }[] = [
    { key: 'record', label: t('scratches.tabs.record'), icon: ClipboardList },
    { key: 'summary', label: t('scratches.tabs.summary'), icon: PieChart }
  ]

  async function addScratch(input: ScratchInput) {
    setSaving(true)
    setError('')
    try {
      const row = await createScratch(input)
      setItems(prev => [row, ...prev])
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
      throw e
    } finally {
      setSaving(false)
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
        ) : undefined
      }
    >
      {tab === 'record' && (
        <ScratchesRecordTab items={items} loading={loading} saving={saving} onAdd={addScratch} />
      )}
      {tab === 'summary' && <ScratchesSummaryTab items={items} />}
    </PageTabShell>
  )
}

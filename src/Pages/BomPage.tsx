import { useState } from 'react'
import { Layers } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { BomByModelTab } from '../Components/bom/BomByModelTab'
import { PartComparisonTab } from '../Components/bom/PartComparisonTab'
import { PartCategoriesTab } from '../Components/bom/PartCategoriesTab'
import { BomImportTab } from '../Components/bom/BomImportTab'
import { BomDashboardTab } from '../Components/bom/BomDashboardTab'

type Tab = 'parts' | 'compare' | 'categories' | 'import' | 'dashboard'

export function BomPage({ embedded = false }: { embedded?: boolean }) {
  const { t } = useLang()
  const [tab, setTab] = useState<Tab>('parts')
  const [msg, setMsg] = useState('')
  const [msgErr, setMsgErr] = useState(false)

  function notify(m: string, isError?: boolean) {
    setMsg(m)
    setMsgErr(Boolean(isError))
    setTimeout(() => setMsg(''), 4000)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'parts', label: t('bom.tabs.parts') },
    { key: 'compare', label: t('bom.tabs.compare') },
    { key: 'categories', label: t('bom.tabs.categories') },
    { key: 'import', label: t('bom.tabs.import') },
    { key: 'dashboard', label: t('bom.tabs.dashboard') }
  ]

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="card-industrial flex flex-wrap items-center gap-3 p-4">
          <div className="rounded-2xl bg-violet-500/20 p-3 text-violet-300">
            <Layers className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{t('bom.title')}</h2>
            <p className="text-xs text-slate-500">{t('bom.subtitle')}</p>
          </div>
        </div>
      )}

      {msg && (
        <div
          className={`rounded-xl border p-3 text-sm ${msgErr ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}
        >
          {msg}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {tabs.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded-xl px-4 py-2 text-sm font-black ${tab === item.key ? 'bg-violet-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'parts' && <BomByModelTab notify={notify} />}
      {tab === 'compare' && <PartComparisonTab />}
      {tab === 'categories' && <PartCategoriesTab notify={notify} />}
      {tab === 'import' && <BomImportTab notify={notify} />}
      {tab === 'dashboard' && <BomDashboardTab />}
    </div>
  )
}

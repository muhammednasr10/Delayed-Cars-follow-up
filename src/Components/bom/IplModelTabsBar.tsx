import { X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import type { VehicleModel } from '../../Types/settings'

type Props = {
  models: VehicleModel[]
  openTabs: string[]
  activeTab: string
  onToggleModel: (modelName: string) => void
  onSelectTab: (modelName: string) => void
  onCloseTab: (modelName: string) => void
}

export function IplModelTabsBar({ models, openTabs, activeTab, onToggleModel, onSelectTab, onCloseTab }: Props) {
  const { t } = useLang()
  const openSet = new Set(openTabs)

  return (
    <div className="space-y-3">
      <div>
        <span className="mb-2 block text-[10px] font-bold uppercase text-violet-300">{t('bom.iplModelPick')}</span>
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-800 bg-slate-900/50 p-2">
          {models.map(m => {
            const open = openSet.has(m.name)
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onToggleModel(m.name)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                  open
                    ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                    : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                {m.name}
              </button>
            )
          })}
        </div>
        <p className="mt-1.5 text-[10px] text-slate-600">{t('bom.iplModelTabsHint')}</p>
      </div>

      {openTabs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-800 pb-1">
          {openTabs.map(name => {
            const active = activeTab === name
            return (
              <div
                key={name}
                className={`flex items-center gap-0.5 rounded-t-lg border border-b-0 px-1 ${
                  active ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-transparent bg-slate-900/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectTab(name)}
                  className={`px-2.5 py-1.5 text-xs font-black ${active ? 'text-cyan-200' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {name}
                </button>
                {openTabs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onCloseTab(name)}
                    className="rounded p-0.5 text-slate-500 hover:bg-slate-800 hover:text-red-300"
                    title={t('bom.iplModelCloseTab')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )
          })}
          {openTabs.length > 1 && (
            <span className="ms-2 text-[10px] font-bold uppercase text-amber-300/90">{t('bom.iplModelCompareOn')}</span>
          )}
        </div>
      )}
    </div>
  )
}

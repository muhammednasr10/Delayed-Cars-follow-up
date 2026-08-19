import { Layers, Car } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useBomByModelData } from '../../hooks/useBomByModelData'
import { BomByModelFilterBar } from './BomByModelFilterBar'
import { BomByModelTable } from './BomByModelTable'
import { BomByModelPagination } from './BomByModelPagination'
import { BomByModelDialogs } from './BomByModelDialogs'
import type { BomLineScope } from '../../Utils/bomModelScope'

export function BomByModelTab({
  notify,
  lineScope = 'main',
  viewMode = 'consolidated'
}: {
  notify: (m: string, err?: boolean) => void
  lineScope?: BomLineScope
  /** consolidated = مجمع عبر الموديلات · perModel = IPL موديل واحد */
  viewMode?: 'consolidated' | 'perModel'
}) {
  const { t } = useLang()
  const data = useBomByModelData({ notify, lineScope, viewMode })

  return (
    <div className="space-y-4">
      {data.perModel && (
        <div className="card-industrial p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-orange-500/15 p-3 text-orange-300">
              <Car className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{t('bom.tabs.iplModels')}</h3>
              <p className="text-sm text-slate-400">{t('bom.iplModelsHint')}</p>
            </div>
          </div>
        </div>
      )}
      {viewMode === 'consolidated' && lineScope === 'main' && (
        <div className="card-industrial p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{t('bom.tabs.consolidated')}</h3>
              <p className="text-sm text-slate-400">{t('bom.consolidatedHint')}</p>
            </div>
          </div>
        </div>
      )}

      <BomByModelFilterBar data={data} />
      <BomByModelTable data={data} />
      <BomByModelPagination data={data} />
      <BomByModelDialogs data={data} />
    </div>
  )
}

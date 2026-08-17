import { AlertTriangle } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { mpLookupLabel } from '../Utils/mpLookupLabel'
import type { MissingPartDetail } from '../Types/missingPart'
import type { MpLookupOption } from '../Types/mpLookup'
import { Modal } from './Modal'

type Props = {
  parts: MissingPartDetail[] | null
  vin?: string
  modelName?: string
  reasons: MpLookupOption[]
  departments: MpLookupOption[]
  onClose: () => void
}

export function MissingPartIssuesModal({ parts, vin, modelName, reasons, departments, onClose }: Props) {
  const { t, lang } = useLang()
  if (!parts?.length) return null

  return (
    <Modal
      open={Boolean(parts?.length)}
      title={t('mp.issuesListModal.title')}
      subtitle={t('mp.issuesListModal.subtitle', { n: parts.length })}
      icon={<AlertTriangle className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
    >
      {(vin || modelName) && (
        <div className="mb-4 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-center">
          {vin && (
            <p className="font-mono text-sm font-black text-cyan-100" dir="ltr">
              {vin}
            </p>
          )}
          {modelName && <p className={`text-xs text-slate-400 ${vin ? 'mt-1' : ''}`}>{modelName}</p>}
        </div>
      )}

      <div className="max-h-[min(60vh,420px)] space-y-2 overflow-y-auto pe-1">
        {parts.map((part, i) => (
          <div key={part.id} className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-start">
            <p className="text-[10px] font-bold uppercase text-slate-500">{i + 1}</p>
            <p className="mt-1 text-sm font-bold text-white">{part.partDescription}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
              <span>
                {t('mp.cols.reasonClass')}:{' '}
                <span className="text-cyan-200">{mpLookupLabel(reasons, part.reason, lang)}</span>
              </span>
              <span>
                {t('mp.cols.department')}:{' '}
                <span className="text-slate-200">{mpLookupLabel(departments, part.department, lang)}</span>
              </span>
              {part.completingDepartment && (
                <span>
                  {t('mp.cols.completingDepartment')}:{' '}
                  <span className="text-slate-200">
                    {mpLookupLabel(departments, part.completingDepartment, lang)}
                  </span>
                </span>
              )}
              {part.followUpEmployeeName && (
                <span>
                  {t('mp.cols.followUpEmployee')}: <span className="text-slate-200">{part.followUpEmployeeName}</span>
                </span>
              )}
              <span>
                {t('mp.issuesListModal.qty')}:{' '}
                <span className="font-mono text-slate-200">
                  {part.installedQty}/{part.requiredQty}
                </span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

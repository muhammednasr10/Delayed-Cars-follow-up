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

  const single = parts.length === 1

  return (
    <Modal
      open={Boolean(parts?.length)}
      title={single ? parts[0].partDescription : t('mp.issuesListModal.title')}
      subtitle={single ? t('mp.issuesListModal.cardSubtitle') : t('mp.issuesListModal.subtitle', { n: parts.length })}
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

      <div className="max-h-[min(60vh,420px)] space-y-3 overflow-y-auto pe-1">
        {parts.map((part, i) => (
          <article
            key={part.id}
            className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-start"
          >
            {!single && (
              <>
                <p className="text-[10px] font-bold uppercase text-slate-500">{i + 1}</p>
                <p className="mt-1 text-sm font-bold text-white">{part.partDescription}</p>
              </>
            )}
            <dl className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${single ? '' : 'mt-3'}`}>
              <Field
                label={t('mp.cols.reasonClass')}
                value={mpLookupLabel(reasons, part.reason, lang)}
              />
              <Field
                label={t('mp.cols.causingDepartment')}
                value={mpLookupLabel(departments, part.department, lang)}
              />
              <Field
                label={t('mp.cols.followUpEmployee')}
                value={part.followUpEmployeeNames?.trim() || part.followUpEmployeeName?.trim() || '—'}
              />
              <Field
                label={t('mp.cols.completingDepartment')}
                value={mpLookupLabel(departments, part.completingDepartment ?? '', lang)}
              />
            </dl>
          </article>
        ))}
      </div>
    </Modal>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
      <dt className="text-[11px] font-bold text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-100">{value}</dd>
    </div>
  )
}

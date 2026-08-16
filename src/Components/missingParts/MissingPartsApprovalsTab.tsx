import { useLang } from '../../i18n/LanguageContext'
import { formatDateTime } from '../../Utils/missingPartPageUtils'
import { cell } from '../../Utils/missingPartPageUtils'
import type { MissingPartWorkflowRequest } from '../../Types/missingPartWorkflow'

type Props = {
  requests: MissingPartWorkflowRequest[]
  loading: boolean
  reviewingId: string | null
  canReview: boolean
  onApprove: (request: MissingPartWorkflowRequest) => void
  onReject: (request: MissingPartWorkflowRequest) => void
}

function stationLabel(number: string | null, name: string | null): string {
  if (!number && !name) return '—'
  if (!name || name === number) return number ?? '—'
  return `${number} — ${name}`
}

export function MissingPartsApprovalsTab({ requests, loading, reviewingId, canReview, onApprove, onReject }: Props) {
  const { t, lang } = useLang()

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-base font-black text-white">{t('mp.workflow.approvalsTitle')}</h3>
        <p className="mt-1 text-xs text-slate-400">{t('mp.workflow.approvalsHint')}</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-center">
          <thead className="bg-slate-950/90">
            <tr>
              <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.vin')}</th>
              <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.model')}</th>
              <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.workflow.kind')}</th>
              <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.reason')}</th>
              <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.workflow.fromStation')}</th>
              <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.workflow.toStation')}</th>
              <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.workflow.requestedBy')}</th>
              <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.dateTime')}</th>
              <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {requests.map(req => {
              const { date, time } = formatDateTime(req.requestedAt, lang)
              const busy = reviewingId === req.id
              return (
                <tr key={req.id} className="bg-slate-900/30">
                  <td className={`${cell} font-mono font-bold text-white`} dir="ltr">
                    {req.vin}
                  </td>
                  <td className={cell}>{req.modelName || '—'}</td>
                  <td className={cell}>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                        req.kind === 'transfer'
                          ? 'bg-emerald-500/15 text-emerald-200'
                          : 'bg-amber-500/15 text-amber-200'
                      }`}
                    >
                      {req.kind === 'transfer' ? t('mp.workflow.kindTransfer') : t('mp.workflow.kindRestore')}
                    </span>
                  </td>
                  <td className={cell}>
                    <span className="mx-auto block max-w-[140px] truncate">{req.partDescription || '—'}</span>
                  </td>
                  <td className={cell}>{stationLabel(req.fromStationNumber, req.fromStationName)}</td>
                  <td className={cell}>{stationLabel(req.toStationNumber, req.toStationName)}</td>
                  <td className={cell}>{req.requestedByName || '—'}</td>
                  <td className={`${cell} text-slate-400`}>
                    <div className="leading-tight">
                      <div>{date}</div>
                      <div className="text-[10px] text-slate-500">{time}</div>
                    </div>
                  </td>
                  <td className={cell}>
                    {canReview ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onApprove(req)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-500 disabled:opacity-40"
                        >
                          {busy ? '...' : t('mp.workflow.approve')}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onReject(req)}
                          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-black text-slate-200 hover:bg-slate-600 disabled:opacity-40"
                        >
                          {t('mp.workflow.reject')}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-500">{t('mp.noActionsPerm')}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {loading && <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>}
        {!loading && requests.length === 0 && (
          <div className="p-8 text-center text-slate-400">{t('mp.workflow.empty')}</div>
        )}
      </div>
    </div>
  )
}

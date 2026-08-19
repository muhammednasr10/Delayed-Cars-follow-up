import { Plus, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Field } from './Field'
import type { IssueLineDraft } from './types'

export function ReasonItemsField({
  line,
  stockShortage,
  onUpdate,
  onAdd,
  onRemove
}: {
  line: IssueLineDraft
  stockShortage: boolean
  onUpdate: (index: number, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
}) {
  const { t } = useLang()

  return (
    <Field label={t('mp.cols.reason')} required>
      <div className="space-y-2">
        {line.partItems.map((item, pi) => (
          <div key={pi} className="flex gap-2">
            <input
              className="input-dark min-w-0 flex-1"
              value={item}
              onChange={e => onUpdate(pi, e.target.value)}
              placeholder={stockShortage ? t('mp.stockItemPlaceholder') : t('mp.issueReasonPlaceholder')}
            />
            {line.partItems.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(pi)}
                className="shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200 hover:bg-red-500/20"
                title={t('common.delete')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            {pi === line.partItems.length - 1 && (
              <button
                type="button"
                onClick={onAdd}
                className="shrink-0 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-cyan-200 hover:bg-cyan-500/20"
                title={stockShortage ? t('mp.addStockItem') : t('mp.addReasonLine')}
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        <p className="text-[10px] text-slate-500">{stockShortage ? t('mp.stockItemsHint') : t('mp.reasonItemsHint')}</p>
      </div>
    </Field>
  )
}

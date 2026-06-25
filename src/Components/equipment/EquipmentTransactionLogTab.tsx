import { useCallback, useEffect, useMemo, useState } from 'react'
import { Gauge, Plus, RefreshCcw, ScrollText, Trash2 } from 'lucide-react'
import { useAuth } from '../../Context/AuthContext'
import { useLang } from '../../i18n/LanguageContext'
import { Field, inputCls } from '../FormField'
import { EquipmentTransactionFormModal, type TransactionFormPayload } from './EquipmentTransactionFormModal'
import {
  createCalibrationTransaction,
  createScrapTransaction,
  getLineEquipment,
  getLineEquipmentTransactions
} from '../../services/equipmentService'
import type { EquipmentTransactionType, EquipmentType, LineEquipmentTransaction } from '../../Types/equipment'
import { EQUIPMENT_TRANSACTION_TYPES } from '../../Types/equipment'

const cell = 'table-cell text-center align-middle whitespace-nowrap px-3 py-2.5'

function isSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('schema cache') || m.includes('could not find the table') || m.includes('does not exist')
}

type TxFilter = EquipmentTransactionType | 'all'

export function EquipmentTransactionLogTab() {
  const { t, lang } = useLang()
  const { hasRole } = useAuth()
  const canManage = hasRole('admin', 'production')

  const [equipment, setEquipment] = useState<Awaited<ReturnType<typeof getLineEquipment>>>([])
  const [items, setItems] = useState<LineEquipmentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [success, setSuccess] = useState('')
  const [txFilter, setTxFilter] = useState<TxFilter>('all')
  const [typeFilter, setTypeFilter] = useState<EquipmentType | 'all'>('all')
  const [formKind, setFormKind] = useState<EquipmentTransactionType | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [eq, txs] = await Promise.all([
        getLineEquipment(),
        getLineEquipmentTransactions(txFilter === 'all' ? undefined : { type: txFilter })
      ])
      setEquipment(eq)
      setItems(txs)
      setSetupRequired(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      setSetupRequired(isSchemaMissing(msg))
      setError(msg)
      setItems([])
      setEquipment([])
    } finally {
      setLoading(false)
    }
  }, [t, txFilter])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(
    () => (typeFilter === 'all' ? items : items.filter(i => i.equipmentType === typeFilter)),
    [items, typeFilter]
  )

  const stats = useMemo(
    () => ({
      calibration: items.filter(i => i.transactionType === 'calibration').length,
      scrap: items.filter(i => i.transactionType === 'scrap').length,
      scrapQty: items.reduce((n, i) => n + (i.scrapQty ?? 0), 0)
    }),
    [items]
  )

  function notify(msg: string) {
    setSuccess(msg)
    window.setTimeout(() => setSuccess(''), 2500)
  }

  function formatDt(iso: string) {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—'
    const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium' })
  }

  function txBadge(type: EquipmentTransactionType) {
    const tones = {
      calibration: 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30',
      scrap: 'bg-red-500/15 text-red-200 border-red-500/30'
    }
    return (
      <span className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-bold ${tones[type]}`}>
        {t(`equipment.txTypes.${type}`)}
      </span>
    )
  }

  function detailCell(row: LineEquipmentTransaction) {
    if (row.transactionType === 'calibration') {
      return (
        <div className="text-xs">
          <p className="font-bold text-slate-200">{t(`equipment.calibration.${row.calibrationResult ?? 'fail'}`)}</p>
          <p className="text-slate-500">{t('equipment.cols.nextCalibration')}: {formatDate(row.nextCalibrationDue)}</p>
        </div>
      )
    }
    return (
      <div className="text-xs">
        <p className="text-slate-200">{row.scrapReason}</p>
        {row.scrapQty != null && row.scrapQty > 0 && (
          <p className="text-slate-500">{t('equipment.cols.scrapQty')}: {row.scrapQty}</p>
        )}
      </div>
    )
  }

  async function saveTransaction(payload: TransactionFormPayload) {
    setSaving(true)
    try {
      if (payload.kind === 'calibration') {
        await createCalibrationTransaction({
          equipmentId: payload.equipmentId,
          occurredAt: payload.occurredAt,
          calibrationResult: payload.calibrationResult,
          nextCalibrationDue: payload.nextCalibrationDue,
          notes: payload.notes
        })
      } else {
        await createScrapTransaction({
          equipmentId: payload.equipmentId,
          occurredAt: payload.occurredAt,
          scrapReason: payload.scrapReason,
          scrapQty: payload.scrapQty,
          notes: payload.notes
        })
      }
      setFormKind(null)
      notify(t('settings.added'))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-sky-500/15 p-3 text-sky-300">
            <ScrollText className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t('equipment.transactionLogTitle')}</h3>
            <p className="text-sm text-slate-400">{t('equipment.transactionLogHint')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void load()} className="rounded-xl bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-700">
            <RefreshCcw className="h-4 w-4" />
          </button>
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setFormKind('calibration')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-black text-white hover:bg-cyan-500"
              >
                <Gauge className="h-4 w-4" />
                {t('equipment.logCalibration')}
              </button>
              <button
                type="button"
                onClick={() => setFormKind('scrap')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-500"
              >
                <Trash2 className="h-4 w-4" />
                {t('equipment.logScrap')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatPill label={t('equipment.txTypes.calibration')} value={String(stats.calibration)} tone="cyan" />
        <StatPill label={t('equipment.txTypes.scrap')} value={String(stats.scrap)} tone="red" />
        <StatPill label={t('equipment.totalScrapQty')} value={String(stats.scrapQty)} tone="amber" />
      </div>

      <div className="card-industrial grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
        <Field label={t('equipment.filterTxType')}>
          <select className={inputCls()} value={txFilter} onChange={e => setTxFilter(e.target.value as TxFilter)}>
            <option value="all">{t('common.all')}</option>
            {EQUIPMENT_TRANSACTION_TYPES.map(key => (
              <option key={key} value={key}>
                {t(`equipment.txTypes.${key}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('equipment.filterEquipmentType')}>
          <select className={inputCls()} value={typeFilter} onChange={e => setTypeFilter(e.target.value as EquipmentType | 'all')}>
            <option value="all">{t('common.all')}</option>
            <option value="rivet_gun">{t('equipment.types.rivet_gun')}</option>
            <option value="torque_wrench">{t('equipment.types.torque_wrench')}</option>
            <option value="other">{t('equipment.types.other')}</option>
          </select>
        </Field>
      </div>

      {setupRequired && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-bold">{t('equipment.setupTitle')}</p>
          <p className="mt-1 text-amber-200/80">{t('equipment.setupHint')}</p>
        </div>
      )}

      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
      {error && !setupRequired && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      <div className="card-industrial overflow-x-auto">
        <table className="w-full text-center text-sm">
          <thead className="bg-slate-950/90">
            <tr>
              <th className={`${cell} font-black text-slate-400`}>{t('equipment.cols.occurredAt')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('equipment.cols.id')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('equipment.cols.equipmentType')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('equipment.cols.txType')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('equipment.cols.details')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('common.notes')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-slate-500">
                  {t('common.loading')}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-slate-500">
                  {t('equipment.txEmpty')}
                </td>
              </tr>
            ) : (
              filtered.map(row => (
                <tr key={row.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                  <td className={`${cell} text-slate-300`}>{formatDt(row.occurredAt)}</td>
                  <td className={`${cell} font-mono font-bold text-sky-200`}>{row.equipmentCode}</td>
                  <td className={`${cell} text-slate-300`}>{t(`equipment.types.${row.equipmentType}`)}</td>
                  <td className={cell}>{txBadge(row.transactionType)}</td>
                  <td className={`${cell} max-w-[14rem]`}>{detailCell(row)}</td>
                  <td className={`${cell} max-w-[10rem] truncate text-slate-400`}>{row.notes || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formKind && (
        <EquipmentTransactionFormModal
          open={!!formKind}
          kind={formKind}
          equipment={equipment}
          onClose={() => setFormKind(null)}
          onSave={saveTransaction}
          saving={saving}
        />
      )}
    </div>
  )
}

function StatPill({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'cyan' | 'red' | 'amber' }) {
  const tones = {
    slate: 'border-slate-600/50 bg-slate-800/50 text-slate-200',
    cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100',
    red: 'border-red-500/30 bg-red-500/10 text-red-100',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100'
  }
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  )
}

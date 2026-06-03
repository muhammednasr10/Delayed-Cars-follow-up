import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Car, MessageSquare, Send, Trash2, User } from 'lucide-react'
import { useAuth } from '../Context/AuthContext'
import { usePermissions } from '../Context/PermissionsContext'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { addVehicleNote, clearVehicleNotes, deleteVehicleNote, getVehicleNotes } from '../services/vehicleNotesService'
import type { VehicleNote, VehicleNoteTarget } from '../Types/vehicleNote'

type Props = {
  target: VehicleNoteTarget | null
  onClose: () => void
}

function authorLabel(note: VehicleNote): string {
  return note.createdByName?.trim() || note.createdByEmail?.trim() || '—'
}

function formatWhen(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

export function VehicleNotesModal({ target, onClose }: Props) {
  const { t, lang } = useLang()
  const { user, isAdmin: authAdmin } = useAuth()
  const { hasPermission } = usePermissions()
  const canDeleteNotes = authAdmin || hasPermission('users', 'manage')
  const [notes, setNotes] = useState<VehicleNote[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!target) return
    setLoading(true)
    setError('')
    try {
      setNotes(await getVehicleNotes(target.vehicleId))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [target, t])

  useEffect(() => {
    if (!target) {
      setNotes([])
      setDraft('')
      setError('')
      return
    }
    void load()
  }, [target, load])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [notes, loading])

  async function removeNote(noteId: string) {
    if (!canDeleteNotes || !window.confirm(t('mp.thread.deleteNoteConfirm'))) return
    setDeletingId(noteId)
    setError('')
    try {
      await deleteVehicleNote(noteId)
      setNotes(prev => prev.filter(n => n.id !== noteId))
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error')
      setError(msg.includes('admin') || msg.includes('Permission') ? t('mp.thread.deleteDenied') : msg)
    } finally {
      setDeletingId(null)
    }
  }

  async function removeAll() {
    if (!target || !canDeleteNotes || !window.confirm(t('mp.thread.clearAllConfirm'))) return
    setClearing(true)
    setError('')
    try {
      await clearVehicleNotes(target.vehicleId)
      setNotes([])
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error')
      setError(msg.includes('admin') || msg.includes('Permission') ? t('mp.thread.deleteDenied') : msg)
    } finally {
      setClearing(false)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!target || !draft.trim()) return
    setSending(true)
    setError('')
    try {
      const note = await addVehicleNote(target.vehicleId, draft)
      setNotes(prev => [...prev, note])
      setDraft('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error')
      setError(msg === 'EMPTY_NOTE' ? t('mp.thread.emptyNote') : msg)
    } finally {
      setSending(false)
    }
  }

  const open = !!target

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      title={target ? target.vin : ''}
      subtitle={target ? `${target.modelName}${target.colorName ? ` · ${target.colorName}` : ''}` : undefined}
      icon={<Car className="h-5 w-5" />}
      footer={
        <form onSubmit={submit} className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
          <textarea
            className="input-dark min-h-[72px] flex-1 resize-y"
            placeholder={t('mp.thread.placeholder')}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            disabled={sending || !user}
            rows={2}
          />
          <button
            type="submit"
            disabled={sending || !draft.trim() || !user}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {t('mp.thread.send')}
          </button>
        </form>
      }
    >
      {canDeleteNotes && notes.length > 0 && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => void removeAll()}
            disabled={clearing || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('mp.thread.clearAll')}
          </button>
        </div>
      )}

      <div ref={scrollRef} className="max-h-[min(52vh,420px)] space-y-3 overflow-y-auto pe-1">
        {loading && <p className="text-center text-sm text-slate-400">{t('common.loading')}</p>}
        {!loading && error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}
        {!loading && !error && notes.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center">
            <MessageSquare className="mx-auto mb-2 h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-400">{t('mp.thread.empty')}</p>
          </div>
        )}
        {!loading &&
          notes.map(note => {
            const mine = user?.id && note.createdBy === user.id
            return (
              <div
                key={note.id}
                className={`rounded-xl border px-4 py-3 ${
                  mine
                    ? 'border-cyan-500/30 bg-cyan-500/10 ms-6'
                    : 'border-slate-700 bg-slate-950/60 me-6'
                }`}
              >
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-bold text-slate-200">
                      <User className="h-3 w-3 text-slate-500" />
                      {authorLabel(note)}
                    </span>
                    <span className="text-slate-600">·</span>
                    <time dateTime={note.createdAt}>{formatWhen(note.createdAt, lang)}</time>
                  </div>
                  {canDeleteNotes && (
                    <button
                      type="button"
                      onClick={() => void removeNote(note.id)}
                      disabled={deletingId === note.id || clearing}
                      title={t('common.delete')}
                      className="rounded p-1 text-slate-500 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{note.body}</p>
              </div>
            )
          })}
      </div>
    </Modal>
  )
}

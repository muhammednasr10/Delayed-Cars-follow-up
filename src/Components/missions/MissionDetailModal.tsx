import { ListTodo } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import type { TeamMission } from '../../Types/mission'

type Props = {
  mission: TeamMission | null
  onClose: () => void
}

function Field({ label, value, dir, preWrap }: { label: string; value: string; dir?: string; preWrap?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-start">
      <dt className="text-[11px] font-bold text-slate-500">{label}</dt>
      <dd
        className={`mt-1 text-sm font-medium text-slate-100 ${preWrap ? 'whitespace-pre-wrap' : ''}`}
        dir={dir}
      >
        {value || '—'}
      </dd>
    </div>
  )
}

export function MissionDetailModal({ mission, onClose }: Props) {
  const { t, lang } = useLang()
  if (!mission) return null

  function formatDate(iso: string | null) {
    if (!iso) return '—'
    const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium' })
  }

  function formatDateTime(iso: string) {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  }

  const details = mission.description?.trim() || ''
  const notes = mission.notes?.trim() || ''

  return (
    <Modal
      open={Boolean(mission)}
      title={t('missions.detail.title')}
      subtitle={mission.title}
      icon={<ListTodo className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
        >
          {t('common.close')}
        </button>
      }
    >
      <div className="space-y-3 p-5">
        <Field label={t('missions.cols.title')} value={mission.title} />
        <Field
          label={t('missions.cols.description')}
          value={details || t('missions.detail.noDescription')}
          preWrap
        />
        {notes && <Field label={t('common.notes')} value={notes} preWrap />}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('missions.cols.priority')} value={t(`missions.priority.${mission.priority}`)} />
          <Field label={t('missions.cols.dueDate')} value={formatDate(mission.dueDate)} dir="ltr" />
          <Field label={t('missions.cols.status')} value={t(`missions.status.${mission.status}`)} />
          <Field label={t('missions.detail.createdAt')} value={formatDateTime(mission.createdAt)} dir="ltr" />
        </div>
      </div>
    </Modal>
  )
}

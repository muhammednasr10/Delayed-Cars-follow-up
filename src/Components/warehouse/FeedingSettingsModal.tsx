import { useEffect, useState } from 'react'
import { Settings2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { FeedingScenarioFields } from './FeedingScenarioFields'
import { useFeedingScenarioSettings } from '../../hooks/useFeedingScenarioSettings'
import { DEFAULT_KANBAN_SCENARIO, type KanbanScenario } from '../../Types/kanbanFeeding'

type Props = {
  open: boolean
  onClose: () => void
  notify?: (msg: string, isError?: boolean) => void
}

export function FeedingSettingsModal({ open, onClose, notify }: Props) {
  const { t } = useLang()
  const { scenario, setScenario } = useFeedingScenarioSettings()
  const [draft, setDraft] = useState<KanbanScenario>(scenario)

  useEffect(() => {
    if (open) setDraft(scenario)
  }, [open, scenario])

  function setField<K extends keyof KanbanScenario>(key: K, value: KanbanScenario[K]) {
    setDraft(prev => ({ ...prev, [key]: value }))
  }

  function save() {
    setScenario(draft)
    notify?.(t('settings.updated'))
    onClose()
  }

  function handleReset() {
    const defaults = { ...DEFAULT_KANBAN_SCENARIO }
    setScenario(defaults)
    setDraft(defaults)
    notify?.(t('warehouses.feeding.settings.resetDone'))
  }

  return (
    <Modal
      open={open}
      title={t('warehouses.feeding.subTabs.settings')}
      subtitle={t('warehouses.feeding.settings.subtitle')}
      icon={<Settings2 className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      footer={
        <>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-slate-400 hover:bg-slate-800"
          >
            {t('warehouses.feeding.settings.reset')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-700"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400"
          >
            {t('common.save')}
          </button>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-400">{t('warehouses.feeding.settings.hint')}</p>
      <FeedingScenarioFields scenario={draft} onChange={setField} />
    </Modal>
  )
}

import { ListTodo } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useOpenShortageMissions } from '../../hooks/useOpenShortageMissions'
import type { ShortageMissionLink } from '../../Types/mission'

type Props = {
  linked: ShortageMissionLink[]
  searchHint?: string
  className?: string
}

/** Opens the missions board filtered to linked missions (bidirectional from source pages). */
export function OpenLinkedMissionsButton({ linked, searchHint, className }: Props) {
  const { t } = useLang()
  const openMissions = useOpenShortageMissions()
  if (!linked.length) return null
  const q = searchHint?.trim() || linked[0]?.title || linked[0]?.sourceVin || ''
  return (
    <button
      type="button"
      onClick={() => openMissions(q)}
      className={
        className ??
        'inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-100 hover:bg-amber-500/20'
      }
      title={linked.map(m => m.title).join(' · ')}
    >
      <ListTodo className="h-3.5 w-3.5" />
      {t('missions.fixedRoutes.linkedCount', { count: linked.length })}
    </button>
  )
}

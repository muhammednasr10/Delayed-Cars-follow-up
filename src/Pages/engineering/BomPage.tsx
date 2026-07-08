import { useState } from 'react'
import { useNavigation } from '../../Context/NavigationContext'
import { BomByModelTab } from '../../Components/bom/BomByModelTab'
import { BomPartListTab } from '../../Components/bom/BomPartListTab'
import { PartCategoriesTab } from '../../Components/bom/PartCategoriesTab'
import { BomImportTab } from '../../Components/bom/BomImportTab'
import { BomDashboardTab } from '../../Components/bom/BomDashboardTab'

export function BomPage({ embedded = false }: { embedded?: boolean }) {
  const { bomTab: tab } = useNavigation()
  const [msg, setMsg] = useState('')
  const [msgErr, setMsgErr] = useState(false)

  function notify(m: string, isError?: boolean) {
    setMsg(m)
    setMsgErr(Boolean(isError))
    setTimeout(() => setMsg(''), 4000)
  }

  const message = msg ? (
    <div
      className={`rounded-xl border p-3 text-sm ${msgErr ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}
    >
      {msg}
    </div>
  ) : null

  const content = (
    <>
      {tab === 'consolidated' && <BomByModelTab notify={notify} lineScope="main" viewMode="consolidated" />}
      {tab === 'iplModels' && <BomByModelTab notify={notify} lineScope="main" viewMode="perModel" />}
      {tab === 'partList' && <BomPartListTab notify={notify} />}
      {tab === 'categories' && <PartCategoriesTab notify={notify} />}
      {tab === 'import' && <BomImportTab notify={notify} />}
      {tab === 'dashboard' && <BomDashboardTab />}
    </>
  )

  if (embedded) return <div className="space-y-4">{message}{content}</div>

  return (
    <section className="space-y-4">
      {message}
      {content}
    </section>
  )
}

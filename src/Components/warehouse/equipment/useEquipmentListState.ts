import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLang } from '../../../i18n/LanguageContext'

type Options<T> = {
  loadRows: () => Promise<T[]>
  filterRow: (row: T, query: string) => boolean
  notify: (msg: string, isError?: boolean) => void
}

export function useEquipmentListState<T>({ loadRows, filterRow, notify }: Options<T>) {
  const { t } = useLang()
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await loadRows())
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setLoading(false)
    }
  }, [loadRows, notify, t])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(row => filterRow(row, q))
  }, [rows, search, filterRow])

  async function runDelete(deleteFn: (id: string) => Promise<void>) {
    if (!deleteId) return
    setBusy(true)
    try {
      await deleteFn(deleteId)
      notify(t('settings.deleted'))
      setDeleteId(null)
      await load()
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  return {
    rows,
    loading,
    search,
    setSearch,
    filtered,
    busy,
    setBusy,
    deleteId,
    setDeleteId,
    load,
    runDelete
  }
}

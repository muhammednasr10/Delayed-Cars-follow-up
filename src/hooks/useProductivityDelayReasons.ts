import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getProductivityDelayReasonsMonth,
  upsertProductivityDelayReason
} from '../services/productivityDelayReasonsService'
import type { ProductivityDelayKind } from '../Types/productivityDelayReason'

export function useProductivityDelayReasons(
  kind: ProductivityDelayKind,
  year: number,
  month: number,
  canManage: boolean
) {
  const [reasonsByDate, setReasonsByDate] = useState<Map<string, string>>(new Map())
  const saveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const load = useCallback(async () => {
    const records = await getProductivityDelayReasonsMonth(year, month, kind)
    const map = new Map<string, string>()
    for (const record of records) {
      map.set(record.workDate, record.reasons)
    }
    setReasonsByDate(map)
  }, [year, month, kind])

  useEffect(() => {
    void load().catch(() => setReasonsByDate(new Map()))
  }, [load])

  useEffect(() => {
    return () => {
      for (const timer of saveTimersRef.current.values()) clearTimeout(timer)
      saveTimersRef.current.clear()
    }
  }, [])

  const persist = useCallback(
    async (workDate: string, reasons: string) => {
      if (!canManage) return
      await upsertProductivityDelayReason({ workDate, kind, reasons })
    },
    [canManage, kind]
  )

  function scheduleSave(workDate: string, reasons: string) {
    if (!canManage) return
    const existing = saveTimersRef.current.get(workDate)
    if (existing) clearTimeout(existing)
    saveTimersRef.current.set(
      workDate,
      setTimeout(() => {
        saveTimersRef.current.delete(workDate)
        void persist(workDate, reasons)
      }, 600)
    )
  }

  function flushSave(workDate: string) {
    if (!canManage) return
    const existing = saveTimersRef.current.get(workDate)
    if (existing) {
      clearTimeout(existing)
      saveTimersRef.current.delete(workDate)
    }
    void persist(workDate, reasonsByDate.get(workDate) ?? '')
  }

  function setReason(workDate: string, reasons: string) {
    setReasonsByDate(prev => {
      const next = new Map(prev)
      next.set(workDate, reasons)
      return next
    })
    scheduleSave(workDate, reasons)
  }

  return { reasonsByDate, setReason, flushSave }
}

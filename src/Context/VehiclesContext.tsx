import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { VehicleInput, VehicleOverview, VehicleUpdateInput } from '../Types/vehicle'
import {
  createVehicle,
  getVehicles,
  markVehicleDelivered,
  releaseVehicleForDelivery,
  softDeleteVehicle,
  updateVehicle as updateVehicleRow
} from '../services/vehiclesService'

type Result = { ok: boolean; message?: string }

type VehiclesContextValue = {
  vehicles: VehicleOverview[]
  loading: boolean
  error: string
  setupRequired: boolean
  /** Start loading vehicles (no-op after first call). Pages that need data call this via useVehicles. */
  ensureLoaded: () => void
  refresh: () => Promise<void>
  addVehicle: (input: VehicleInput) => Promise<Result>
  updateVehicle: (id: string, input: VehicleUpdateInput) => Promise<Result>
  removeVehicle: (id: string) => Promise<Result>
  release: (id: string) => Promise<Result>
  deliver: (id: string) => Promise<Result>
}

const VehiclesContext = createContext<VehiclesContextValue | undefined>(undefined)

function isSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('schema cache') ||
    m.includes('could not find the table') ||
    m.includes('does not exist') ||
    (m.includes('relation') && m.includes('not exist'))
  )
}

export function VehiclesProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState<VehicleOverview[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [wanted, setWanted] = useState(false)
  const inflightRef = useRef<Promise<void> | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase) {
      setError('Supabase غير مهيأ. أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY.')
      setLoading(false)
      return
    }
    if (inflightRef.current) {
      await inflightRef.current
      return
    }
    setLoading(true)
    setError('')
    const task = (async () => {
      try {
        setVehicles(await getVehicles())
        setSetupRequired(false)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'تعذر تحميل السيارات.'
        setSetupRequired(isSchemaMissing(message))
        setError(message)
      } finally {
        setLoading(false)
      }
    })()
    inflightRef.current = task
    try {
      await task
    } finally {
      inflightRef.current = null
    }
  }, [])

  const ensureLoaded = useCallback(() => {
    setWanted(true)
  }, [])

  useEffect(() => {
    if (!wanted) return
    void refresh()
  }, [wanted, refresh])

  async function addVehicle(input: VehicleInput): Promise<Result> {
    try {
      await createVehicle(input)
      await refresh()
      return { ok: true }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'فشل إنشاء السيارة.' }
    }
  }

  async function updateVehicle(id: string, input: VehicleUpdateInput): Promise<Result> {
    try {
      await updateVehicleRow(id, input)
      await refresh()
      return { ok: true }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'فشل تعديل السيارة.' }
    }
  }

  async function removeVehicle(id: string): Promise<Result> {
    try {
      await softDeleteVehicle(id)
      await refresh()
      return { ok: true }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'فشل حذف السيارة.' }
    }
  }

  async function release(id: string): Promise<Result> {
    try {
      await releaseVehicleForDelivery(id)
      await refresh()
      return { ok: true }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'تعذر تحرير السيارة للتسليم.' }
    }
  }

  async function deliver(id: string): Promise<Result> {
    try {
      await markVehicleDelivered(id)
      await refresh()
      return { ok: true }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'تعذر تسليم السيارة.' }
    }
  }

  const value = useMemo(
    () => ({
      vehicles,
      loading,
      error,
      setupRequired,
      ensureLoaded,
      refresh,
      addVehicle,
      updateVehicle,
      removeVehicle,
      release,
      deliver
    }),
    [vehicles, loading, error, setupRequired, ensureLoaded, refresh]
  )

  return <VehiclesContext.Provider value={value}>{children}</VehiclesContext.Provider>
}

export function useVehicles() {
  const context = useContext(VehiclesContext)
  if (!context) throw new Error('useVehicles must be used inside VehiclesProvider')
  const { ensureLoaded } = context
  useEffect(() => {
    ensureLoaded()
  }, [ensureLoaded])
  return context
}

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { VehicleInput, VehicleOverview } from '../Types/vehicle'
import {
  createVehicle,
  getVehicles,
  markVehicleDelivered,
  releaseVehicleForDelivery
} from '../services/vehiclesService'

type Result = { ok: boolean; message?: string }

type VehiclesContextValue = {
  vehicles: VehicleOverview[]
  loading: boolean
  error: string
  setupRequired: boolean
  refresh: () => Promise<void>
  addVehicle: (input: VehicleInput) => Promise<Result>
  release: (id: string) => Promise<Result>
  deliver: (id: string) => Promise<Result>
}

const VehiclesContext = createContext<VehiclesContextValue | undefined>(undefined)

// The schema/migrations have not been applied yet (PostgREST schema-cache miss).
function isSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('schema cache') ||
    m.includes('could not find the table') ||
    m.includes('does not exist') ||
    m.includes('relation') && m.includes('not exist')
  )
}

export function VehiclesProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState<VehicleOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)

  async function refresh() {
    if (!supabase) {
      setError('Supabase غير مهيأ. أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
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
  }

  useEffect(() => {
    refresh()
  }, [])

  async function addVehicle(input: VehicleInput): Promise<Result> {
    try {
      await createVehicle(input)
      await refresh()
      return { ok: true }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'فشل إنشاء السيارة.' }
    }
  }

  // Critical actions re-fetch from the DB so the UI reflects rules enforced
  // server-side (a rejected release must NOT look successful).
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
    () => ({ vehicles, loading, error, setupRequired, refresh, addVehicle, release, deliver }),
    [vehicles, loading, error, setupRequired]
  )

  return <VehiclesContext.Provider value={value}>{children}</VehiclesContext.Provider>
}

export function useVehicles() {
  const context = useContext(VehiclesContext)
  if (!context) throw new Error('useVehicles must be used inside VehiclesProvider')
  return context
}

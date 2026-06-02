import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { initialDelayedCars } from '../Data/mockCars'
import type { DelayedCar, DelayedCarInput, DelayStatus } from '../Types/car'
import { createDelayedCar, getDelayedCars, updateDelayedCar, updateDelayedCarStatus } from '../services/delayedCarsService'

type DelayedCarsContextValue = {
  cars: DelayedCar[]
  loading: boolean
  error: string
  refreshCars: () => Promise<void>
  addCar: (input: DelayedCarInput) => Promise<{ ok: boolean; message?: string }>
  updateStatus: (id: string, status: DelayStatus) => Promise<void>
  updateCar: (id: string, patch: Partial<DelayedCar>) => Promise<void>
  addNote: (id: string, note: string) => Promise<void>
}

const DelayedCarsContext = createContext<DelayedCarsContextValue | undefined>(undefined)

export function DelayedCarsProvider({ children }: { children: ReactNode }) {
  const [cars, setCars] = useState<DelayedCar[]>(supabase ? [] : initialDelayedCars)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refreshCars() {
    setLoading(true)
    setError('')

    if (!supabase) {
      setCars(initialDelayedCars)
      setLoading(false)
      return
    }

    try {
      const data = await getDelayedCars()
      setCars(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load delayed cars from Supabase'
      console.error('Unable to load delayed cars from Supabase:', err)
      setError(message)
      setCars(initialDelayedCars)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshCars()
  }, [])

  async function addCar(input: DelayedCarInput) {
    const chassisExists = cars.some(
      car => car.chassisNumber.trim().toLowerCase() === input.chassisNumber.trim().toLowerCase()
    )

    if (chassisExists) {
      return { ok: false, message: 'رقم الشاسيه موجود بالفعل. يجب أن يكون فريد.' }
    }

    const now = new Date().toISOString()

    if (supabase) {
      try {
        const created = await createDelayedCar(input)
        setCars(prev => [created, ...prev])
        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ السيارة على Supabase.'
        console.error('Supabase insert failed:', err)
        return { ok: false, message }
      }
    }

    const newCar: DelayedCar = {
      ...input,
      id: crypto.randomUUID(),
      status: 'waiting',
      createdAt: now,
      updatedAt: now,
      resolvedAt: null
    }
    setCars(prev => [newCar, ...prev])
    return { ok: true }
  }

  async function updateStatus(id: string, status: DelayStatus) {
    const now = new Date().toISOString()
    const resolvedAt = status === 'received_installed' || status === 'closed' ? now : null

    setCars(prev =>
      prev.map(car => (car.id === id ? { ...car, status, updatedAt: now, resolvedAt } : car))
    )

    if (supabase) {
      try {
        await updateDelayedCarStatus(id, status)
      } catch (err) {
        console.error('Supabase updateStatus failed:', err)
      }
    }
  }

  async function updateCar(id: string, patch: Partial<DelayedCar>) {
    const now = new Date().toISOString()
    setCars(prev =>
      prev.map(car => (car.id === id ? { ...car, ...patch, updatedAt: now } : car))
    )

    if (supabase) {
      try {
        await updateDelayedCar(id, patch)
      } catch (err) {
        console.error('Supabase updateCar failed:', err)
      }
    }
  }

  async function addNote(id: string, note: string) {
    const car = cars.find(item => item.id === id)
    const updatedNotes = car?.notes ? `${car.notes}\n${note}` : note
    await updateCar(id, { notes: updatedNotes })
  }

  const value = useMemo(
    () => ({ cars, loading, error, refreshCars, addCar, updateStatus, updateCar, addNote }),
    [cars, loading, error]
  )

  return <DelayedCarsContext.Provider value={value}>{children}</DelayedCarsContext.Provider>
}

export function useDelayedCars() {
  const context = useContext(DelayedCarsContext)
  if (!context) {
    throw new Error('useDelayedCars must be used inside DelayedCarsProvider')
  }
  return context
}

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { initialDelayedCars } from '../Data/mockCars'
import type { DelayedCar, DelayedCarInput, DelayStatus } from '../Types/car'

type DelayedCarsContextValue = {
  cars: DelayedCar[]
  loading: boolean
  addCar: (input: DelayedCarInput) => Promise<{ ok: boolean; message?: string }>
  updateStatus: (id: string, status: DelayStatus) => Promise<void>
  updateCar: (id: string, patch: Partial<DelayedCar>) => Promise<void>
  addNote: (id: string, note: string) => Promise<void>
}

const DelayedCarsContext = createContext<DelayedCarsContextValue | undefined>(undefined)

export function DelayedCarsProvider({ children }: { children: ReactNode }) {
  const [cars, setCars] = useState<DelayedCar[]>(supabase ? [] : initialDelayedCars)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    async function loadCars() {
      const client = supabase
      if (!client) {
        setCars(initialDelayedCars)
        setLoading(false)
        return
      }

      const { data, error } = await client.from('delayed_cars').select('*')
      if (error) {
        console.warn('Unable to load delayed cars from Supabase:', error.message)
        setCars(initialDelayedCars)
      } else if (data) {
        setCars(
          data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        )
      }
      setLoading(false)
    }

    loadCars()
  }, [])

  async function addCar(input: DelayedCarInput) {
    const chassisExists = cars.some(
      car => car.chassisNumber.trim().toLowerCase() === input.chassisNumber.trim().toLowerCase()
    )

    if (chassisExists) {
      return { ok: false, message: 'رقم الشاسيه موجود بالفعل. يجب أن يكون فريد.' }
    }

    const now = new Date().toISOString()
    const newCar: DelayedCar = {
      ...input,
      id: crypto.randomUUID(),
      status: 'waiting',
      createdAt: now,
      updatedAt: now
    }

    if (supabase) {
      const client = supabase
      const { data, error } = await client.from('delayed_cars').insert(newCar).select().single()
      if (error) {
        console.error('Supabase insert failed:', error.message)
        return { ok: false, message: 'حدث خطأ أثناء حفظ السيارة على Supabase.' }
      }
      if (data) {
        setCars(prev => [data, ...prev])
        return { ok: true }
      }
    }

    setCars(prev => [newCar, ...prev])
    return { ok: true }
  }

  async function updateStatus(id: string, status: DelayStatus) {
    const now = new Date().toISOString()
    setCars(prev =>
      prev.map(car => {
        if (car.id !== id) return car
        return {
          ...car,
          status,
          updatedAt: now,
          resolvedAt: status === 'installed' || status === 'closed' ? now : car.resolvedAt
        }
      })
    )

    if (supabase) {
      const client = supabase
      const patch = {
        status,
        updatedAt: now,
        resolvedAt: status === 'installed' || status === 'closed' ? now : null
      }
      const { error } = await client.from('delayed_cars').update(patch).eq('id', id)
      if (error) {
        console.error('Supabase updateStatus failed:', error.message)
      }
    }
  }

  async function updateCar(id: string, patch: Partial<DelayedCar>) {
    const now = new Date().toISOString()
    setCars(prev =>
      prev.map(car => (car.id === id ? { ...car, ...patch, updatedAt: now } : car))
    )

    if (supabase) {
      const client = supabase
      const { error } = await client.from('delayed_cars').update({ ...patch, updatedAt: now }).eq('id', id)
      if (error) {
        console.error('Supabase updateCar failed:', error.message)
      }
    }
  }

  async function addNote(id: string, note: string) {
    const now = new Date().toISOString()
    let updatedNotes = ''

    setCars(prev =>
      prev.map(car => {
        if (car.id !== id) return car
        updatedNotes = car.notes ? `${car.notes}\n${note}` : note
        return {
          ...car,
          notes: updatedNotes,
          updatedAt: now
        }
      })
    )

    if (supabase) {
      const client = supabase
      const { error } = await client.from('delayed_cars').update({ notes: updatedNotes, updatedAt: now }).eq('id', id)
      if (error) {
        console.error('Supabase addNote failed:', error.message)
      }
    }
  }

  const value = useMemo(
    () => ({ cars, loading, addCar, updateStatus, updateCar, addNote }),
    [cars, loading]
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

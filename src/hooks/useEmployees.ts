import { useCallback, useEffect, useState } from 'react'
import { getEmployees } from '../services/employeesService'
import type { Employee } from '../Types/employee'

// Centralized employee loading with loading / error / refresh state.
export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setEmployees(await getEmployees())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load employees')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { employees, loading, error, reload: load }
}

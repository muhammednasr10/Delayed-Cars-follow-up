import { useCallback, useEffect, useState } from 'react'
import { getEmployeeStationLevels } from '../services/employeeStationLevelService'
import type { EmployeeStationLevel } from '../Types/training'

export function useEmployeeStationLevels() {
  const [levels, setLevels] = useState<EmployeeStationLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setLevels(await getEmployeeStationLevels())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load station training levels')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { levels, loading, error, reload: load }
}

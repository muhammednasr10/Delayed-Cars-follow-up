import { useCallback, useEffect, useState } from 'react'
import { getEmployeeTrainings, getSkills, getStationRequiredSkills } from '../services/trainingService'
import type { EmployeeTraining, StationRequiredSkill, TrainingSkill } from '../Types/training'

export function useTrainingSkills() {
  const [skills, setSkills] = useState<TrainingSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setSkills(await getSkills()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load skills') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  return { skills, loading, error, reload: load }
}

export function useStationRequiredSkills() {
  const [required, setRequired] = useState<StationRequiredSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setRequired(await getStationRequiredSkills()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load required skills') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  return { required, loading, error, reload: load }
}

export function useEmployeeTrainingRecords() {
  const [records, setRecords] = useState<EmployeeTraining[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setRecords(await getEmployeeTrainings()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load training records') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  return { records, loading, error, reload: load }
}

import { useEffect, useState } from 'react'
import { EMPTY_MISSION_FILTER_QUERY, type MissionFilterQuery } from '../Utils/missionFilters'

export function useOpenedMissionSearch(openedSearch?: string, openedSearchKey = 0) {
  const [query, setQuery] = useState<MissionFilterQuery>(EMPTY_MISSION_FILTER_QUERY)
  useEffect(() => {
    if (!openedSearch) return
    setQuery(q => ({ ...q, search: openedSearch }))
  }, [openedSearch, openedSearchKey])
  return { query, setQuery }
}

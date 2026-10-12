import { useLineAreaDailyHubSections } from './useLineAreaDailyHubSections'

export { useLineAreaDailyHubSections }

export function useBodyDailyHubSections(refreshKey = 0) {
  return useLineAreaDailyHubSections('body', refreshKey)
}

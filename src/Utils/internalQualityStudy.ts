import type { QualityNote8D } from '../Types/qualityNote'
import { parseQualityNoteFishbone, qualityNoteFishboneHasCauses } from './qualityNoteFishbone'

const STEPS = [
  'd1Team',
  'd2Problem',
  'd3Containment',
  'd4RootCause',
  'd5Corrective',
  'd6Implement',
  'd7Prevent',
  'd8Congratulate'
] as const satisfies readonly (keyof QualityNote8D)[]

/** True when the study card has something the user actually wrote. Copied problem text in D2 does not count. */
export function internalQualityStudyHasContent(
  study8d: QualityNote8D,
  summary: string,
  originalProblem: string
): boolean {
  if (summary.trim()) return true
  return STEPS.some(key => {
    if (key === 'd2Problem') {
      const text = study8d.d2Problem.trim()
      return text.length > 0 && text !== originalProblem.trim()
    }
    if (key === 'd4RootCause') {
      return qualityNoteFishboneHasCauses(parseQualityNoteFishbone(study8d.d4RootCause))
    }
    return study8d[key].trim().length > 0
  })
}

export function nextStudyCounter(input: {
  currentCount: number
  currentLastStudyAt: string | null
  hasContent: boolean
  recurrence: boolean
  nowIso: string
}): { studyCount: number; lastStudyAt: string | null } {
  if (!input.hasContent) {
    return { studyCount: input.currentCount, lastStudyAt: input.currentLastStudyAt }
  }
  const studyCount =
    input.currentCount === 0 ? 1 : input.recurrence ? input.currentCount + 1 : input.currentCount
  return { studyCount, lastStudyAt: input.nowIso }
}

import { describe, expect, it } from 'vitest'
import {
  addMissionRecurrencePeriod,
  isRecurrenceSeriesRoot,
  isSpawnedRecurrenceCopy,
  nextAutoRecurrenceDueDate
} from './missionRecurrence'

const now = new Date(2026, 7, 18, 15, 0, 0)

describe('addMissionRecurrencePeriod', () => {
  it('advances daily, weekly, and monthly dates', () => {
    expect(addMissionRecurrencePeriod('2026-08-18', 'daily')).toBe('2026-08-19')
    expect(addMissionRecurrencePeriod('2026-08-18', 'weekly')).toBe('2026-08-25')
    expect(addMissionRecurrencePeriod('2026-01-31', 'monthly')).toBe('2026-02-28')
    expect(addMissionRecurrencePeriod('2026-08-18', 'custom')).toBeNull()
  })
})

describe('nextAutoRecurrenceDueDate', () => {
  it('returns the next date after today when the anchor is today or past', () => {
    expect(nextAutoRecurrenceDueDate('2026-08-18', 'daily', now)).toBe('2026-08-19')
    expect(nextAutoRecurrenceDueDate('2026-08-10', 'daily', now)).toBe('2026-08-19')
    expect(nextAutoRecurrenceDueDate('2026-08-04', 'weekly', now)).toBe('2026-08-25')
  })

  it('returns null for non-automatic recurrence', () => {
    expect(nextAutoRecurrenceDueDate('2026-08-18', 'none', now)).toBeNull()
    expect(nextAutoRecurrenceDueDate(null, 'daily', now)).toBeNull()
  })
})

describe('isRecurrenceSeriesRoot', () => {
  it('is true only for the original auto-recurring row', () => {
    expect(
      isRecurrenceSeriesRoot({ id: 'a', recurrenceSeriesId: 'a', recurrenceType: 'daily' })
    ).toBe(true)
    expect(
      isRecurrenceSeriesRoot({ id: 'b', recurrenceSeriesId: 'a', recurrenceType: 'none' })
    ).toBe(false)
  })
})

describe('isSpawnedRecurrenceCopy', () => {
  it('is true when the row belongs to another mission series', () => {
    expect(isSpawnedRecurrenceCopy({ id: 'b', recurrenceSeriesId: 'a' })).toBe(true)
    expect(isSpawnedRecurrenceCopy({ id: 'a', recurrenceSeriesId: 'a' })).toBe(false)
  })
})

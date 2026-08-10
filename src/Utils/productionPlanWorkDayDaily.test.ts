import { describe, expect, it } from 'vitest'
import {
  computeProductivityLostCars,
  computeProductivityLossRemainder,
  DAILY_PRODUCTIVITY_TARGET
} from './productionPlanWorkDayDaily'

describe('computeProductivityLostCars', () => {
  it('returns 0 when productivity is zero or negative input', () => {
    expect(computeProductivityLostCars(0)).toBe(0)
    expect(computeProductivityLostCars(-1)).toBe(0)
  })

  it('computes lost cars as target minus productivity', () => {
    expect(computeProductivityLostCars(57)).toBe(18)
    expect(computeProductivityLostCars(75)).toBe(0)
  })

  it('never returns negative when productivity exceeds target', () => {
    expect(computeProductivityLostCars(80)).toBe(0)
    expect(computeProductivityLostCars(100)).toBe(0)
  })

  it('uses daily target constant', () => {
    expect(DAILY_PRODUCTIVITY_TARGET).toBe(75)
    expect(computeProductivityLostCars(60)).toBe(15)
  })
})

describe('computeProductivityLossRemainder', () => {
  it('subtracts stop lost vehicles from total lost', () => {
    expect(computeProductivityLossRemainder(57, 5)).toBe(13)
    expect(computeProductivityLossRemainder(80, 2)).toBe(0)
  })
})

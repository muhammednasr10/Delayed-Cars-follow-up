import { describe, expect, it } from 'vitest'
import { isProductionOrderFinished, orderVisibleInPlanMonth } from './productionOrderMonth'
import type { ProductionOrder } from '../Types/production'

function order(partial: Partial<ProductionOrder> & Pick<ProductionOrder, 'id' | 'orderNumber'>): ProductionOrder {
  return {
    modelId: 'm1',
    plannedQty: 100,
    status: 'planned',
    ...partial
  }
}

describe('orderVisibleInPlanMonth', () => {
  it('shows orders opened in the selected month', () => {
    const o = order({
      id: '1',
      orderNumber: 'A',
      openedAt: '2026-09-10T08:00:00.000Z',
      plannedQty: 100,
      status: 'in_progress'
    })
    expect(orderVisibleInPlanMonth(o, 2026, 9, 10)).toBe(true)
    expect(orderVisibleInPlanMonth(o, 2026, 8, 10)).toBe(false)
  })

  it('carries unfinished orders into later months', () => {
    const o = order({
      id: '2',
      orderNumber: 'B',
      openedAt: '2026-08-01T08:00:00.000Z',
      plannedQty: 100,
      status: 'in_progress'
    })
    expect(orderVisibleInPlanMonth(o, 2026, 9, 40)).toBe(true)
    expect(orderVisibleInPlanMonth(o, 2026, 9, 100)).toBe(false)
  })

  it('hides cancelled and completed orders from later months', () => {
    const cancelled = order({
      id: '3',
      orderNumber: 'C',
      openedAt: '2026-08-01T08:00:00.000Z',
      status: 'cancelled'
    })
    const completed = order({
      id: '4',
      orderNumber: 'D',
      openedAt: '2026-08-01T08:00:00.000Z',
      status: 'completed',
      plannedQty: 50
    })
    expect(orderVisibleInPlanMonth(cancelled, 2026, 9, 0)).toBe(false)
    expect(orderVisibleInPlanMonth(completed, 2026, 9, 10)).toBe(false)
  })
})

describe('isProductionOrderFinished', () => {
  it('treats full assembly entry as finished', () => {
    const o = order({ id: '5', orderNumber: 'E', plannedQty: 20, status: 'planned' })
    expect(isProductionOrderFinished(o, 19)).toBe(false)
    expect(isProductionOrderFinished(o, 20)).toBe(true)
  })
})

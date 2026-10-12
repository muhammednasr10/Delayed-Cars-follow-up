import { describe, expect, it } from 'vitest'
import { controlActionName } from './permissionsControlItems'

describe('controlActionName', () => {
  it('reads the action after a page-scoped key', () => {
    expect(controlActionName('production_training__attendance::create')).toBe('create')
    expect(controlActionName('update')).toBe('update')
  })
})

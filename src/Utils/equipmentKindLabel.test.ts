import { describe, expect, it } from 'vitest'
import { FALLBACK_EQUIPMENT_KINDS } from '../Types/equipmentKind'
import { equipmentKindLabel, slugEquipmentKindCode } from './equipmentKindLabel'

describe('slugEquipmentKindCode', () => {
  it('slugifies latin labels', () => {
    expect(slugEquipmentKindCode('Torque Gun')).toBe('torque_gun')
  })

  it('falls back when the label has no latin letters', () => {
    expect(slugEquipmentKindCode('يد عزم')).toMatch(/^kind_/)
  })
})

describe('equipmentKindLabel', () => {
  it('picks the language label from the catalog', () => {
    expect(equipmentKindLabel('rivet_gun', FALLBACK_EQUIPMENT_KINDS, 'ar')).toBe('مسدس برشام')
    expect(equipmentKindLabel('rivet_gun', FALLBACK_EQUIPMENT_KINDS, 'en')).toBe('Rivet gun')
  })

  it('falls back to the code when the kind is unknown', () => {
    expect(equipmentKindLabel('air_gun', FALLBACK_EQUIPMENT_KINDS, 'ar', 'unknown')).toBe('unknown')
  })
})

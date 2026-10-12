import { describe, expect, it } from 'vitest'
import type { Employee } from '../Types/employee'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import { filterAssemblyWorkforceForViewer } from './assemblySupervisorScope'

function unit(id: string, name: string, parentId: string | null, kind: FactoryOrgUnit['unitKind']): FactoryOrgUnit {
  return { id, name, parentId, unitKind: kind, sortOrder: 0, isActive: true }
}

function employee(partial: Pick<Employee, 'id' | 'fullName' | 'jobRole'> & Partial<Employee>): Employee {
  return {
    employeeCode: partial.id,
    department: null,
    workAreaId: null,
    workAreaName: null,
    stationId: null,
    stationLabel: null,
    lineName: null,
    factoryOrgUnitId: null,
    orgUnitLabel: null,
    directManagerId: null,
    directManagerName: null,
    directManagerIds: [],
    directManagerNames: [],
    profileId: null,
    phone: null,
    email: null,
    notes: null,
    assignmentStatus: null,
    isActive: true,
    employmentStatus: 'active',
    stoppedReason: null,
    stoppedAt: null,
    createdAt: '',
    updatedAt: '',
    ...partial
  }
}

const units = [
  unit('trim', 'تريم أ&ب', null, 'administration'),
  unit('trim-a', 'تريم أ', 'trim', 'section'),
  unit('trim-b', 'تريم ب', 'trim', 'section')
]

describe('filterAssemblyWorkforceForViewer', () => {
  const sayed = employee({
    id: 'sayed',
    fullName: 'سيد حلمي',
    jobRole: 'supervisor',
    factoryOrgUnitId: 'trim'
  })
  const ayman = employee({
    id: 'ayman',
    fullName: 'أيمن ممدوح',
    jobRole: 'assistant_supervisor',
    factoryOrgUnitId: 'trim-a',
    directManagerIds: ['sayed']
  })
  const hany = employee({
    id: 'hany',
    fullName: 'هاني عبد الفتاح',
    jobRole: 'assistant_supervisor',
    factoryOrgUnitId: 'trim-b',
    directManagerIds: ['sayed']
  })
  const workerA = employee({
    id: 'worker-a',
    fullName: 'عامل أ',
    jobRole: 'technician',
    factoryOrgUnitId: 'trim-a',
    directManagerIds: ['ayman']
  })
  const workerB = employee({
    id: 'worker-b',
    fullName: 'عامل ب',
    jobRole: 'technician',
    factoryOrgUnitId: 'trim-b',
    directManagerIds: ['hany']
  })
  const people = [sayed, ayman, hany, workerA, workerB]

  it('shows both trim sections to the parent supervisor', () => {
    const ids = filterAssemblyWorkforceForViewer(people, 'sayed', false, units).map(person => person.id)
    expect(ids).toEqual(expect.arrayContaining(['sayed', 'ayman', 'hany', 'worker-a', 'worker-b']))
  })

  it('shows only trim A to its assistant', () => {
    const ids = filterAssemblyWorkforceForViewer(people, 'ayman', false, units).map(person => person.id)
    expect(ids).toEqual(expect.arrayContaining(['ayman', 'worker-a']))
    expect(ids).not.toContain('worker-b')
    expect(ids).not.toContain('hany')
  })

  it('does not let an assistant inherit the other subsection from a work-area name', () => {
    const named = [
      employee({ id: 'assistant', fullName: 'مساعد أ', jobRole: 'assistant_supervisor', workAreaName: 'تريم أ', directManagerIds: ['boss'] }),
      employee({ id: 'boss', fullName: 'مشرف', jobRole: 'supervisor', workAreaName: 'تريم أ&ب' }),
      employee({ id: 'tech-a', fullName: 'فني أ', jobRole: 'technician', workAreaName: 'تريم أ' }),
      employee({ id: 'tech-b', fullName: 'فني ب', jobRole: 'technician', workAreaName: 'تريم ب' })
    ]
    const ids = filterAssemblyWorkforceForViewer(named, 'assistant', false).map(person => person.id)
    expect(ids).toContain('tech-a')
    expect(ids).not.toContain('tech-b')
  })
})

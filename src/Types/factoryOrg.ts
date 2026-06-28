export type FactoryOrgUnitKind = 'administration' | 'section' | 'subsection'

export type FactoryOrgUnit = {
  id: string
  name: string
  parentId: string | null
  parentName?: string | null
  unitKind: FactoryOrgUnitKind
  sortOrder: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export type FactoryOrgUnitInput = {
  name: string
  parentId?: string | null
  unitKind: FactoryOrgUnitKind
  sortOrder?: number
  isActive?: boolean
}

export type FactoryOrgUnitNode = {
  unit: FactoryOrgUnit
  children: FactoryOrgUnitNode[]
}

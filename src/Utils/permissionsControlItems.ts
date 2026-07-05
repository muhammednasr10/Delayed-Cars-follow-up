import type { SystemPermission } from '../Types/permissions'
import type { MatrixTreeNode } from '../config/permissionsMatrixTree'
import { PERMISSIONS_MATRIX_TREE } from '../config/permissionsMatrixTree'
import { permissionsForNode } from './permissionsMatrixResolve'
import { sortActionsForMatrix } from './permissionLabels'

/** أزرار التحكم الأساسية التي يطلبها الأدمن */
export const PRIMARY_CONTROL_ACTIONS = ['create', 'update', 'delete'] as const
export type PrimaryControlAction = (typeof PRIMARY_CONTROL_ACTIONS)[number]

export type PermissionControlItem = {
  id: string
  labelKey: string
  descKey?: string
  parentLabelKey?: string
  parentId?: string | null
  pagePerm: SystemPermission | null
  /** إضافة / تعديل / حذف إن وُجدت في الوحدة */
  primaryActions: Partial<Record<PrimaryControlAction, SystemPermission>>
  /** باقي الإجراءات (عرض، تصدير، اعتماد…) */
  otherActions: SystemPermission[]
}

export type PermissionPageTreeNode = {
  item: PermissionControlItem
  children: PermissionPageTreeNode[]
}

function buildItem(
  node: MatrixTreeNode,
  allPermissions: SystemPermission[],
  parentLabelKey?: string
): PermissionControlItem | null {
  const nodePerms = permissionsForNode(node, allPermissions)
  if (nodePerms.length === 0) return null

  const pagePerm = nodePerms.find(p => p.module_key === 'pages') ?? null
  const actionPerms = nodePerms.filter(p => p.module_key !== 'pages')
  const primaryActions: PermissionControlItem['primaryActions'] = {}
  const otherActions: SystemPermission[] = []

  for (const p of actionPerms) {
    if ((PRIMARY_CONTROL_ACTIONS as readonly string[]).includes(p.permission_key)) {
      primaryActions[p.permission_key as PrimaryControlAction] = p
    } else {
      otherActions.push(p)
    }
  }

  const sortedOtherKeys = sortActionsForMatrix(otherActions.map(p => p.permission_key))
  const sortedOther = sortedOtherKeys
    .map(k => otherActions.find(p => p.permission_key === k))
    .filter((p): p is SystemPermission => Boolean(p))

  return {
    id: node.id,
    labelKey: node.labelKey,
    descKey: node.descKey,
    parentLabelKey,
    parentId: null,
    pagePerm,
    primaryActions,
    otherActions: sortedOther
  }
}

/** بنود التحكم من شجرة المصفوفة — صفحة + إجراءات لكل بند */
export function buildPermissionControlItems(allPermissions: SystemPermission[]): PermissionControlItem[] {
  const items: PermissionControlItem[] = []

  function walk(node: MatrixTreeNode, parentId: string | null, parentLabelKey?: string) {
    const item = buildItem(node, allPermissions, parentLabelKey)
    if (item) {
      items.push({ ...item, parentId })
    }
    const nextParentId = item?.id ?? parentId
    const nextParentLabel = item ? node.labelKey : parentLabelKey
    for (const child of node.children ?? []) {
      walk(child, nextParentId, nextParentLabel)
    }
  }

  for (const root of PERMISSIONS_MATRIX_TREE) {
    for (const child of root.children ?? []) {
      walk(child, null, root.labelKey)
    }
    if (!root.children?.length) walk(root, null)
  }

  return items
}

/** شجرة الصفحات + الإجراءات — للعرض القابل للطي */
export function buildPagePermissionTree(allPermissions: SystemPermission[]): PermissionPageTreeNode[] {
  const items = buildPermissionControlItems(allPermissions).filter(controlItemHasAnyPermission)
  const byParent = new Map<string | null, PermissionControlItem[]>()

  for (const item of items) {
    const key = item.parentId ?? null
    const parentExists = key != null && items.some(i => i.id === key)
    const groupKey = parentExists ? key : null
    const list = byParent.get(groupKey) ?? []
    list.push(item)
    byParent.set(groupKey, list)
  }

  function childrenOf(parentId: string | null): PermissionPageTreeNode[] {
    return (byParent.get(parentId) ?? []).map(item => ({
      item,
      children: childrenOf(item.id)
    }))
  }

  return childrenOf(null)
}

export function itemHasActions(item: PermissionControlItem): boolean {
  return Boolean(
    item.primaryActions.create ||
      item.primaryActions.update ||
      item.primaryActions.delete ||
      item.otherActions.length > 0
  )
}

export function controlItemHasAnyPermission(item: PermissionControlItem): boolean {
  return Boolean(
    item.pagePerm ||
      item.primaryActions.create ||
      item.primaryActions.update ||
      item.primaryActions.delete ||
      item.otherActions.length > 0
  )
}

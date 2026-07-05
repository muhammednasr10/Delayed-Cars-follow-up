import type { SystemPermission } from '../Types/permissions'
import { permissionKey } from '../services/permissionsService'
import type { MatrixTreeNode } from '../config/permissionsMatrixTree'
import { PERMISSIONS_MATRIX_TREE } from '../config/permissionsMatrixTree'
import { sortActionsForMatrix } from './permissionLabels'

export function permissionsForNode(
  node: MatrixTreeNode,
  allPermissions: SystemPermission[]
): SystemPermission[] {
  const out: SystemPermission[] = []
  const seen = new Set<string>()

  function push(perm: SystemPermission | undefined) {
    if (!perm || seen.has(perm.id)) return
    seen.add(perm.id)
    out.push(perm)
  }

  if (node.pagePerm) {
    push(allPermissions.find(p => p.module_key === 'pages' && p.permission_key === node.pagePerm))
  }

  for (const am of node.actionModules ?? []) {
    const modPerms = allPermissions.filter(p => p.module_key === am.moduleKey)
    const filtered = am.actions?.length
      ? modPerms.filter(p => am.actions!.includes(p.permission_key))
      : modPerms
    const sorted = sortActionsForMatrix(filtered.map(p => p.permission_key))
    for (const actionKey of sorted) {
      push(filtered.find(p => p.permission_key === actionKey))
    }
  }

  return out
}

export function collectPermissionsForSubtree(
  node: MatrixTreeNode,
  allPermissions: SystemPermission[]
): SystemPermission[] {
  const out = [...permissionsForNode(node, allPermissions)]
  const seen = new Set(out.map(p => p.id))
  for (const child of node.children ?? []) {
    for (const p of collectPermissionsForSubtree(child, allPermissions)) {
      if (!seen.has(p.id)) {
        seen.add(p.id)
        out.push(p)
      }
    }
  }
  return out
}

export function countEnabled(
  perms: SystemPermission[],
  rolePerms: Map<string, boolean>
): { enabled: number; total: number } {
  let enabled = 0
  for (const p of perms) {
    if (rolePerms.get(permissionKey(p.module_key, p.permission_key))) enabled++
  }
  return { enabled, total: perms.length }
}

function nodeMatchesSearch(node: MatrixTreeNode, term: string, t: (k: string) => string): boolean {
  const label = t(node.labelKey).toLowerCase()
  if (label.includes(term)) return true
  if (node.pagePerm?.toLowerCase().includes(term)) return true
  if (node.descKey) {
    const d = t(node.descKey).toLowerCase()
    if (d.includes(term)) return true
  }
  return false
}

export function filterMatrixTree(
  nodes: MatrixTreeNode[],
  term: string,
  t: (k: string) => string
): MatrixTreeNode[] {
  const q = term.trim().toLowerCase()
  if (!q) return nodes

  function walk(node: MatrixTreeNode): MatrixTreeNode | null {
    const kids = (node.children ?? []).map(walk).filter((n): n is MatrixTreeNode => n != null)
    if (nodeMatchesSearch(node, q, t) || kids.length > 0) {
      return { ...node, children: kids.length > 0 ? kids : node.children }
    }
    return null
  }

  return nodes.map(walk).filter((n): n is MatrixTreeNode => n != null)
}

export function allMatrixTreeNodes(): MatrixTreeNode[] {
  return PERMISSIONS_MATRIX_TREE
}

export function collectAllNodeIds(nodes: MatrixTreeNode[] = PERMISSIONS_MATRIX_TREE): string[] {
  const ids: string[] = []
  function walk(node: MatrixTreeNode) {
    ids.push(node.id)
    for (const child of node.children ?? []) walk(child)
  }
  for (const n of nodes) walk(n)
  return ids
}

export function countUserPermissionBreakdown(
  permissions: SystemPermission[],
  effective: Map<string, boolean>,
  roleBase: Map<string, boolean>,
  overrideKeys: Set<string>
): { enabled: number; fromRole: number; overrides: number; overrideAllow: number; overrideDeny: number; denied: number; total: number } {
  let enabled = 0
  let fromRole = 0
  let overrides = 0
  let overrideAllow = 0
  let overrideDeny = 0
  let denied = 0
  for (const p of permissions) {
    const key = permissionKey(p.module_key, p.permission_key)
    const allowed = effective.get(key) ?? false
    const isOverride = overrideKeys.has(key)
    if (allowed) enabled++
    else denied++
    if (isOverride) {
      overrides++
      if (allowed) overrideAllow++
      else overrideDeny++
    } else if (allowed) {
      fromRole++
    }
  }
  return { enabled, fromRole, overrides, overrideAllow, overrideDeny, denied, total: permissions.length }
}

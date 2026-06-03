import { useLang } from '../i18n/LanguageContext'
import { JobRoleBadge } from './EmployeeBadges'
import type { Employee } from '../Types/employee'

type Props = { employees: Employee[] }

type Node = Employee & { children: Node[] }

// Build a forest from direct_manager_id. Roots = employees whose manager is
// missing/not in the set (e.g. General Managers).
function buildTree(employees: Employee[]): Node[] {
  const nodes = new Map<string, Node>()
  employees.forEach(e => nodes.set(e.id, { ...e, children: [] }))
  const roots: Node[] = []
  nodes.forEach(node => {
    const parent = node.directManagerId ? nodes.get(node.directManagerId) : null
    if (parent) parent.children.push(node)
    else roots.push(node)
  })
  const sortRec = (list: Node[]) => {
    list.sort((a, b) => a.fullName.localeCompare(b.fullName))
    list.forEach(n => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}

export function EmployeeOrgChart({ employees }: Props) {
  const { t } = useLang()
  const roots = buildTree(employees)

  if (roots.length === 0) {
    return <div className="p-8 text-center text-slate-400">{t('org.empty')}</div>
  }

  return (
    <div className="space-y-3 p-4">
      {roots.map(node => <TreeNode key={node.id} node={node} depth={0} />)}
    </div>
  )
}

function TreeNode({ node, depth }: { node: Node; depth: number }) {
  const { t } = useLang()
  return (
    <div className="border-s-2 border-slate-800 ps-3" style={{ marginInlineStart: depth === 0 ? 0 : 12 }}>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-2">
        <span className="font-black text-white">{node.fullName}</span>
        <JobRoleBadge role={node.jobRole} />
        {node.department && <span className="text-xs text-slate-400">· {t(`department.${node.department}`)}</span>}
        {!node.isActive && <span className="rounded-full bg-slate-600/30 px-2 py-0.5 text-[10px] font-bold text-slate-300">{t('org.f.inactive')}</span>}
      </div>
      {node.children.length > 0 && (
        <div className="mt-2 space-y-2">
          {node.children.map(child => <TreeNode key={child.id} node={child} depth={depth + 1} />)}
        </div>
      )}
    </div>
  )
}

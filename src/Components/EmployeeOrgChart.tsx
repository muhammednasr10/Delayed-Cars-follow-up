import { useLang } from '../i18n/LanguageContext'
import { compareEmployees } from '../services/employeesService'
import { JobRoleBadge } from './EmployeeBadges'
import type { Employee } from '../Types/employee'

type Props = { employees: Employee[] }

type Node = Employee & { children: Node[] }

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
    list.sort(compareEmployees)
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
    <div className="overflow-x-auto p-4 md:p-6">
      <div className="org-chart-forest inline-flex min-w-full flex-wrap items-start justify-center gap-10">
        {roots.map(node => (
          <div key={node.id} className="org-chart-root">
            <OrgTreeNode node={node} />
          </div>
        ))}
      </div>
    </div>
  )
}

function OrgTreeNode({ node }: { node: Node }) {
  const hasChildren = node.children.length > 0

  return (
    <div className="org-chart-node flex flex-col items-center">
      <EmployeeCard node={node} />
      {hasChildren && (
        <>
          <div className="org-chart-vline" aria-hidden />
          <ul className="org-chart-children">
            {node.children.map(child => (
              <li key={child.id} className="org-chart-child">
                <OrgTreeNode node={child} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function EmployeeCard({ node }: { node: Node }) {
  const { t } = useLang()
  return (
    <div
      className={`org-chart-card min-w-[9.5rem] max-w-[11rem] rounded-xl border px-3 py-2.5 text-center shadow-lg ${
        node.isActive
          ? 'border-cyan-500/35 bg-slate-900/90 shadow-cyan-500/5'
          : 'border-slate-600 bg-slate-900/50 opacity-75'
      }`}
    >
      <p className="font-mono text-[10px] font-bold text-cyan-400/90" dir="ltr">
        {node.employeeCode}
      </p>
      <p className="mt-1 text-sm font-black leading-snug text-white">{node.fullName}</p>
      <div className="mt-2 flex justify-center">
        <JobRoleBadge role={node.jobRole} />
      </div>
      {node.workAreaName && (
        <p className="mt-1.5 truncate text-[10px] text-slate-500" title={node.workAreaName}>
          {node.workAreaName}
        </p>
      )}
      {!node.isActive && (
        <span className="mt-1.5 inline-block rounded-full bg-slate-600/40 px-2 py-0.5 text-[9px] font-bold text-slate-300">
          {t('org.f.inactive')}
        </span>
      )}
    </div>
  )
}

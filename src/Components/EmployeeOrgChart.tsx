import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { useLang } from '../i18n/LanguageContext'
import { compareEmployees } from '../services/employeesService'
import { JobRoleBadge } from './EmployeeBadges'
import type { Employee } from '../Types/employee'
import { JOB_ROLES, type JobRole } from '../Types/enums'

type Props = { employees: Employee[] }

type Node = Employee & { children: Node[]; extraManagerNames: string[] }

const VERTICAL_STACK_LEAF_ROLES: JobRole[] = ['technician', 'leader']
const MIN_SCALE = 0.35
const MAX_SCALE = 2
const ZOOM_STEP = 0.1
const TOP_PADDING = 20

const JOB_ROLE_RANK = new Map<JobRole, number>(JOB_ROLES.map((role, index) => [role, index]))

function shouldStackChildrenVertically(node: Node): boolean {
  if (node.children.length === 0) return false
  return node.children.every(
    child => child.children.length === 0 && VERTICAL_STACK_LEAF_ROLES.includes(child.jobRole)
  )
}

function managerIdsFor(employee: Employee): string[] {
  if (employee.directManagerIds.length > 0) return [...new Set(employee.directManagerIds)]
  return employee.directManagerId ? [employee.directManagerId] : []
}

function pickTreeParentId(managers: string[], byId: Map<string, Employee>): string {
  return [...managers].sort((a, b) => {
    const empA = byId.get(a)!
    const empB = byId.get(b)!
    const ra = JOB_ROLE_RANK.get(empA.jobRole) ?? JOB_ROLES.length
    const rb = JOB_ROLE_RANK.get(empB.jobRole) ?? JOB_ROLES.length
    if (ra !== rb) return ra - rb
    return compareEmployees(empA, empB)
  })[0]
}

/** Each employee appears once — under the highest manager in the hierarchy. */
function buildTree(employees: Employee[]): Node[] {
  const byId = new Map(employees.map(e => [e.id, e]))
  const nodes = new Map<string, Node>()
  employees.forEach(e => nodes.set(e.id, { ...e, children: [], extraManagerNames: [] }))

  nodes.forEach(node => {
    const managers = managerIdsFor(node).filter(id => id !== node.id && byId.has(id))
    if (managers.length === 0) return

    const parentId = pickTreeParentId(managers, byId)
    nodes.get(parentId)!.children.push(node)
    node.extraManagerNames = managers
      .filter(id => id !== parentId)
      .map(id => byId.get(id)!.fullName)
  })

  const roots: Node[] = []
  nodes.forEach(node => {
    const managers = managerIdsFor(node).filter(id => id !== node.id && byId.has(id))
    if (managers.length === 0) roots.push(node)
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
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const forestRef = useRef<HTMLDivElement>(null)

  const centerChart = useCallback((currentScale: number) => {
    const viewport = viewportRef.current
    const forest = forestRef.current
    if (!viewport || !forest) return

    const offsetX = (viewport.clientWidth - forest.offsetWidth * currentScale) / 2
    setOffset({ x: offsetX, y: TOP_PADDING })
  }, [])

  useLayoutEffect(() => {
    centerChart(1)
    setScale(1)
  }, [employees, centerChart])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      setScale(s => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const zoomIn = useCallback(() => {
    setScale(s => Math.min(MAX_SCALE, s + ZOOM_STEP))
  }, [])

  const zoomOut = useCallback(() => {
    setScale(s => Math.max(MIN_SCALE, s - ZOOM_STEP))
  }, [])

  const resetView = useCallback(() => {
    setScale(1)
    requestAnimationFrame(() => centerChart(1))
  }, [centerChart])

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      if ((e.target as HTMLElement).closest('.org-chart-card, .org-chart-zoom-controls')) return
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: offset.x,
        originY: offset.y
      }
      setIsDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [offset.x, offset.y]
  )

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    setOffset({
      x: drag.originX + (e.clientX - drag.startX),
      y: drag.originY + (e.clientY - drag.startY)
    })
  }, [])

  const endDrag = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    setIsDragging(false)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }, [])

  if (roots.length === 0) {
    return <div className="p-8 text-center text-slate-400">{t('org.empty')}</div>
  }

  return (
    <div
      ref={viewportRef}
      className={`org-chart-viewport ${isDragging ? 'org-chart-viewport--dragging' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div
        className="org-chart-zoom-controls"
        onPointerDown={e => e.stopPropagation()}
      >
        <button type="button" className="org-chart-zoom-btn" onClick={zoomIn} aria-label={t('org.chartZoomIn')}>
          +
        </button>
        <span className="org-chart-zoom-label">{Math.round(scale * 100)}%</span>
        <button type="button" className="org-chart-zoom-btn" onClick={zoomOut} aria-label={t('org.chartZoomOut')}>
          −
        </button>
        <button type="button" className="org-chart-zoom-reset" onClick={resetView}>
          {t('org.chartZoomReset')}
        </button>
      </div>
      <div
        className="org-chart-canvas"
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          transformOrigin: 'top left'
        }}
        dir="ltr"
      >
        <div ref={forestRef} className="org-chart-forest">
          {roots.map(node => (
            <div key={node.id} className="org-chart-root">
              <OrgTreeNode node={node} />
            </div>
          ))}
        </div>
      </div>
      <p className="org-chart-pan-hint">{t('org.chartPanHint')}</p>
    </div>
  )
}

function OrgTreeNode({ node }: { node: Node }) {
  const hasChildren = node.children.length > 0
  const stackVertical = hasChildren && shouldStackChildrenVertically(node)

  return (
    <div className="org-chart-node">
      <EmployeeCard node={node} />
      {hasChildren && (
        <div className={stackVertical ? 'org-chart-stack' : 'org-chart-branch'}>
          <div className="org-chart-vline" aria-hidden />
          {stackVertical ? (
            <ul className="org-chart-children org-chart-children--stack">
              {node.children.map(child => (
                <li key={child.id} className="org-chart-child org-chart-child--stack">
                  <EmployeeCard node={child} />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="org-chart-children">
              {node.children.map(child => (
                <li key={child.id} className="org-chart-child">
                  <OrgTreeNode node={child} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function EmployeeCard({ node }: { node: Node }) {
  const { t } = useLang()
  const extraManagers = node.extraManagerNames.join('، ')
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
      {node.extraManagerNames.length > 0 && (
        <p className="mt-1.5 text-[9px] font-semibold leading-snug text-amber-300/90" title={extraManagers}>
          {t('org.chartAlsoReportsTo', { names: extraManagers })}
        </p>
      )}
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

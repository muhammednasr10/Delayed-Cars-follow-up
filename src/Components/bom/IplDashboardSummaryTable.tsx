import type { ReactNode } from 'react'

export function IplDashboardSummaryTable({
  title,
  note,
  headers,
  children,
  empty
}: {
  title: string
  note?: string
  headers: string[]
  children: ReactNode
  empty?: boolean
}) {
  return (
    <div className="card-industrial overflow-hidden">
      <div className="border-b border-slate-800 px-4 py-3">
        <h3 className="text-sm font-black text-white">{title}</h3>
        {note ? <p className="mt-1 text-xs font-bold text-cyan-200">{note}</p> : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500">
              {headers.map(header => (
                <th key={header} className="px-3 py-2 text-start">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empty ? (
              <tr>
                <td colSpan={headers.length} className="px-3 py-6 text-center text-slate-500">
                  —
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

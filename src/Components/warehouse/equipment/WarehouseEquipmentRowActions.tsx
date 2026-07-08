import { Pencil, Trash2 } from 'lucide-react'

type Props = {
  onEdit: () => void
  onDelete: () => void
}

export function WarehouseEquipmentRowActions({ onEdit, onDelete }: Props) {
  return (
    <div className="flex gap-1">
      <button type="button" onClick={onEdit} className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700">
        <Pencil className="h-4 w-4" />
      </button>
      <button type="button" onClick={onDelete} className="rounded-lg bg-red-500/15 p-2 text-red-300 hover:bg-red-500/25">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

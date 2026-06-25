import { ListTodo, PackageX, ScanLine } from 'lucide-react'
import { ModuleSectionLayout } from '../Components/ModuleSectionLayout'

export function DamagedPartsPage() {
  return (
    <ModuleSectionLayout
      icon={PackageX}
      titleKey="damagedParts.title"
      subtitleKey="damagedParts.subtitle"
      accentClass="text-orange-300 bg-orange-500/15"
    />
  )
}

export function MissionsPage() {
  return (
    <ModuleSectionLayout
      icon={ListTodo}
      titleKey="missions.title"
      subtitleKey="missions.subtitle"
      accentClass="text-amber-300 bg-amber-500/15"
    />
  )
}

export function ScratchesPage() {
  return (
    <ModuleSectionLayout
      icon={ScanLine}
      titleKey="scratches.title"
      subtitleKey="scratches.subtitle"
      accentClass="text-rose-300 bg-rose-500/15"
    />
  )
}

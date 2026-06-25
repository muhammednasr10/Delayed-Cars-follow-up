import { PackageX } from 'lucide-react'
import { ModuleSectionLayout } from '../../Components/ModuleSectionLayout'

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

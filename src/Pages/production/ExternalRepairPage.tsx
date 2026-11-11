import { useEffect, useMemo, useState } from 'react'
import { Factory } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'
import { useAuth } from '../../Context/AuthContext'
import { useCanViewPage } from '../../hooks/useCanViewPage'
import { usePermissions } from '../../Context/PermissionsContext'
import { pagePermForProduction } from '../../config/pageAccess'
import { productivityNavVisible } from '../../config/pageTabAccess'
import { isProductivityRecorder } from '../../Utils/assemblyAreas'
import { getFactoryOrgUnits } from '../../services/factoryOrgService'
import { HomePage } from './HomePage'
import { MissingPartsPage } from './MissingPartsPage'
import { ProductivityPage } from './ProductivityPage'
import { TrainingMatrixPage } from './TrainingMatrixPage'
import { DamagedPartsPage } from './DamagedPartsPage'
import { MissionsPage } from './MissionsPage'
import { RequestsPage } from './RequestsPage'
import { ScratchesPage } from './ScratchesPage'
import { EquipmentPage } from './EquipmentPage'
import { InternalQualityPage } from './InternalQualityPage'
import { FeedbackPage } from './FeedbackPage'
import {
  externalRepairDepartments,
  externalRepairSiteForSelection,
  externalRepairSites,
  resolveExternalRepairWorkforceUnitId
} from '../../Utils/productionAreaCounts'
import type { FactoryOrgUnit } from '../../Types/factoryOrg'

/** الإصلاح الخارجي: مواقع → أقسام → نفس وحدات التجميع. */
export function ExternalRepairPage() {
  const { t } = useLang()
  const nav = useNavigation()
  const { profile } = useAuth()
  const { canViewPage, loading: pagesLoading } = useCanViewPage()
  const { canViewTab, loading: permsLoading } = usePermissions()
  const navLoading = pagesLoading || permsLoading
  const recorder = isProductivityRecorder(profile?.system_role_code, profile?.system_role_name_ar)
  const [orgUnits, setOrgUnits] = useState<FactoryOrgUnit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void getFactoryOrgUnits()
      .then(units => {
        if (!cancelled) setOrgUnits(units)
      })
      .catch(() => {
        if (!cancelled) setOrgUnits([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sites = useMemo(() => externalRepairSites(orgUnits), [orgUnits])
  const activeSite = externalRepairSiteForSelection(orgUnits, nav.externalRepairSectionId) ?? sites[0] ?? null
  const departments = useMemo(
    () => (activeSite ? externalRepairDepartments(orgUnits, activeSite.id) : []),
    [orgUnits, activeSite]
  )
  const activeDepartment =
    departments.find(dept => dept.id === nav.externalRepairSectionId) ?? departments[0] ?? null
  const workforceUnitId =
    activeDepartment?.id ?? resolveExternalRepairWorkforceUnitId(orgUnits, nav.externalRepairSectionId)

  const { externalRepairSectionId, productionPage, navigate } = nav

  useEffect(() => {
    if (loading) return
    if (sites.length === 0) {
      if (externalRepairSectionId != null) {
        navigate({ externalRepairSectionId: null, productionPage: 'home' })
      }
      return
    }
    const site = externalRepairSiteForSelection(orgUnits, externalRepairSectionId) ?? sites[0]!
    const siteDepartments = externalRepairDepartments(orgUnits, site.id)
    const preferredDeptId =
      (externalRepairSectionId && siteDepartments.some(dept => dept.id === externalRepairSectionId)
        ? externalRepairSectionId
        : null) ??
      siteDepartments[0]?.id ??
      site.id
    if (preferredDeptId !== externalRepairSectionId) {
      navigate({
        productionArea: 'externalRepair',
        productionPage: productionPage === 'overview' ? 'home' : productionPage || 'home',
        externalRepairSectionId: preferredDeptId
      })
    }
  }, [loading, sites, orgUnits, externalRepairSectionId, productionPage, navigate])

  if (loading) {
    return (
      <section className="card-industrial p-8 text-center text-sm text-slate-400">{t('common.loading')}</section>
    )
  }

  if (sites.length === 0) {
    return (
      <section className="card-industrial flex min-h-[min(50vh,28rem)] flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="rounded-3xl bg-slate-800/80 p-5 text-cyan-300">
          <Factory className="h-12 w-12" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">{t('departments.productionArea.externalRepair')}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">{t('externalRepair.noSections')}</p>
        </div>
      </section>
    )
  }

  if (!activeSite || !workforceUnitId) return null

  const scopeLabel =
    activeDepartment != null ? `${activeSite.name} · ${activeDepartment.name}` : activeSite.name
  const page = nav.productionPage

  if (page === 'home' && (navLoading || canViewPage(pagePermForProduction('home')))) {
    return <HomePage />
  }
  if (page === 'missing' && (navLoading || canViewPage(pagePermForProduction('missing')))) {
    return <MissingPartsPage />
  }
  if (
    page === 'vehicles' &&
    (navLoading || productivityNavVisible(canViewPage, canViewTab, recorder))
  ) {
    return <ProductivityPage />
  }
  if (page === 'training' && (navLoading || canViewPage(pagePermForProduction('training')))) {
    return <TrainingMatrixPage workforceOrgUnitId={workforceUnitId} workforceLabel={scopeLabel} />
  }
  if (page === 'damagedParts' && (navLoading || canViewPage(pagePermForProduction('damagedParts')))) {
    return <DamagedPartsPage />
  }
  if (page === 'missions' && (navLoading || canViewPage(pagePermForProduction('missions')))) {
    return <MissionsPage />
  }
  if (page === 'requests' && (navLoading || canViewPage(pagePermForProduction('requests')))) {
    return <RequestsPage />
  }
  if (page === 'scratches' && (navLoading || canViewPage(pagePermForProduction('scratches')))) {
    return <ScratchesPage />
  }
  if (page === 'equipment' && (navLoading || canViewPage(pagePermForProduction('equipment')))) {
    return <EquipmentPage />
  }
  if (page === 'internalQuality' && (navLoading || canViewPage(pagePermForProduction('internalQuality')))) {
    return <InternalQualityPage />
  }
  if (page === 'feedback' && (navLoading || canViewPage(pagePermForProduction('feedback')))) {
    return <FeedbackPage />
  }

  return <TrainingMatrixPage workforceOrgUnitId={workforceUnitId} workforceLabel={scopeLabel} />
}

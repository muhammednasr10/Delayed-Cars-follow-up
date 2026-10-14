import { lazy, Suspense } from 'react'
import { pagePermForProduction } from '../../config/pageAccess'
import { productivityNavVisible } from '../../config/pageTabAccess'
import { useAuth } from '../../Context/AuthContext'
import { isProductivityRecorder } from '../../Utils/assemblyAreas'
import { usePermissions } from '../../Context/PermissionsContext'
import { useNavigation } from '../../Context/NavigationContext'
import { useCanViewPage } from '../../hooks/useCanViewPage'
import { useLang } from '../../i18n/LanguageContext'
import type { LineShopArea } from '../../navigation/lineShopNav'
import { BodyAttendancePage } from './BodyAttendancePage'
import { BodyHomePage } from './BodyHomePage'
import { MissingPartsPage } from './MissingPartsPage'
import { PaintHomePage } from './PaintHomePage'

const ProductivityPage = lazy(() => import('./ProductivityPage').then(m => ({ default: m.ProductivityPage })))

function PageFallback() {
  const { t } = useLang()
  return <p className="p-8 text-center text-slate-400">{t('common.loading')}</p>
}

/** صفحات البودي والدهان. الدهان يزيد شاشة النواقص. */
export function LineShopRoutes({ area }: { area: LineShopArea }) {
  const nav = useNavigation()
  const { profile } = useAuth()
  const { loading: permsLoading } = usePermissions()
  const recorder = isProductivityRecorder(profile?.system_role_code, profile?.system_role_name_ar)
  const { canViewPage, canViewTab, loading: pagesLoading } = useCanViewPage()
  const navLoading = permsLoading || pagesLoading
  const allow = (key: Parameters<typeof pagePermForProduction>[0]) =>
    navLoading ||
    (key === 'vehicles'
      ? productivityNavVisible(canViewPage, canViewTab, recorder)
      : canViewPage(pagePermForProduction(key)))

  if (nav.productionPage === 'overview' || nav.productionPage === 'settings') return null

  return (
    <>
      {nav.productionPage === 'home' && allow('home') && (area === 'paint' ? <PaintHomePage /> : <BodyHomePage />)}
      {nav.productionPage === 'training' && allow('training') && (
        <Suspense fallback={<PageFallback />}>
          <BodyAttendancePage area={area} />
        </Suspense>
      )}
      {area === 'paint' && nav.productionPage === 'missing' && allow('missing') && <MissingPartsPage />}
      {nav.productionPage === 'vehicles' && allow('vehicles') && (
        <Suspense fallback={<PageFallback />}>
          <ProductivityPage />
        </Suspense>
      )}
    </>
  )
}

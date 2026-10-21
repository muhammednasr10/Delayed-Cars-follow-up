import { SetupRequired } from '../../Components/SetupRequired'
import { QualityNotesRecordTab } from '../../Components/quality/QualityNotesRecordTab'
import { QualityNotesStudyTab } from '../../Components/quality/QualityNotesStudyTab'
import { useQualityNotesPage } from '../../hooks/useQualityNotesPage'
import { useNavigation } from '../../Context/NavigationContext'

export function QualityPage() {
  const { qualityTab: tab, navigate } = useNavigation()
  const page = useQualityNotesPage()

  if (page.setupRequired) return <SetupRequired detail={page.error} />

  return (
    <section className="space-y-4">
      {page.error && !page.setupRequired && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{page.error}</div>
      )}
      {page.success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {page.success}
        </div>
      )}

      {tab === 'record' && (
        <QualityNotesRecordTab
          items={page.displayItems}
          loading={page.loading}
          stations={page.stations}
          models={page.models}
          categories={page.categories}
          onCategoriesChange={page.setCategories}
          onAdd={page.handleAdd}
          onUpdate={page.handleUpdate}
          onDelete={page.handleDelete}
          onStatusChange={page.handleStatusChange}
        />
      )}
      {tab === 'study' && (
        <QualityNotesStudyTab
          items={page.displayItems}
          loading={page.loading}
          categories={page.categories}
          employees={page.employees}
          linkedMissions={page.linkedMissions}
          assignBusy={page.assignBusy}
          onStudy={page.handleStudy}
          onAssignMission={page.handleAssignMission}
          onOpenMissions={() =>
            navigate({
              department: 'production',
              productionArea: 'assembly',
              productionPage: 'missions',
              showGlobalHome: false,
              showProfile: false
            })
          }
        />
      )}
    </section>
  )
}

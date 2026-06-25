import { MessageSquareText } from 'lucide-react'
import { ModuleSectionLayout } from '../../Components/ModuleSectionLayout'

export function FeedbackPage() {
  return (
    <ModuleSectionLayout
      icon={MessageSquareText}
      titleKey="feedback.title"
      subtitleKey="feedback.subtitle"
      accentClass="text-indigo-300 bg-indigo-500/15"
    />
  )
}

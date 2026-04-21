import { ScreenHeader } from './ScreenHeader'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return <ScreenHeader title={title} subtitle={description} actions={actions} />
}

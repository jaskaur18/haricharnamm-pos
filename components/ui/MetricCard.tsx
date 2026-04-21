import { StatTile } from './StatTile'

export function MetricCard({
  label,
  value,
  detail,
  tone = 'accent',
}: {
  label: string
  value: string
  detail?: string
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'accent' | 'purple'
}) {
  return <StatTile label={label} value={value} detail={detail} tone={tone} />
}

import { StatTile } from './StatTile'

export function MetricCard({
  label,
  value,
  detail,
  accentColor,
}: {
  label: string
  value: string
  detail?: string
  accentColor?: string
}) {
  const tone = accentColor === '#60A5FA'
    ? 'info'
    : accentColor === '#34D399'
      ? 'success'
      : accentColor === '#FDE047'
        ? 'warning'
        : accentColor === '#FCA5A5'
          ? 'danger'
          : 'accent'
  return <StatTile label={label} value={value} detail={detail} tone={tone as any} />
}

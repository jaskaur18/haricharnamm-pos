import { SurfaceCard } from './SurfaceCard'

export function SectionCard(props: React.ComponentProps<typeof SurfaceCard>) {
  return <SurfaceCard p="$4" gap="$3" {...props} />
}

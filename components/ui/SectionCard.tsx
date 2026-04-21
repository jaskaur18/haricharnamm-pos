import { GetProps } from 'tamagui'
import { SurfaceCard } from './SurfaceCard'

export type SectionCardProps = GetProps<typeof SurfaceCard>

export function SectionCard(props: SectionCardProps) {
  return <SurfaceCard p="$4" gap="$3" {...props} />
}

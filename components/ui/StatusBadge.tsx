import { Paragraph } from 'tamagui'

const badgeMap = {
  in_stock: {
    bg: '$successSoft',
    color: '$success',
    label: 'In Stock',
  },
  low_stock: {
    bg: '$warningSoft',
    color: '$warning',
    label: 'Low Stock',
  },
  out_of_stock: {
    bg: '$dangerSoft',
    color: '$danger',
    label: 'Out of Stock',
  },
  completed: {
    bg: '$successSoft',
    color: '$success',
    label: 'Completed',
  },
  returned_partial: {
    bg: '$warningSoft',
    color: '$warning',
    label: 'Partial Return',
  },
  returned_full: {
    bg: '$dangerSoft',
    color: '$danger',
    label: 'Full Return',
  },
} as const

export function StatusBadge({
  status,
}: {
  status: keyof typeof badgeMap
}) {
  const token = badgeMap[status]

  return (
    <Paragraph
      bg={token.bg}
      color={token.color}
      px="$2"
      py="$1.5"
      rounded="$10"
      fontSize="$1"
      fontWeight="700"
      style={{ textAlign: 'center' }}
    >
      {token.label}
    </Paragraph>
  )
}

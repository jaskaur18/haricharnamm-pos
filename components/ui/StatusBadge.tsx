import { Paragraph } from 'tamagui'

const badgeMap = {
  in_stock: {
    bg: 'rgba(52, 211, 153, 0.16)',
    color: '$green10',
    label: 'In Stock',
  },
  low_stock: {
    bg: 'rgba(250, 204, 21, 0.16)',
    color: '$yellow10',
    label: 'Low Stock',
  },
  out_of_stock: {
    bg: 'rgba(248, 113, 113, 0.16)',
    color: '$red10',
    label: 'Out of Stock',
  },
  completed: {
    bg: 'rgba(52, 211, 153, 0.16)',
    color: '$green10',
    label: 'Completed',
  },
  returned_partial: {
    bg: 'rgba(250, 204, 21, 0.16)',
    color: '$yellow10',
    label: 'Partial Return',
  },
  returned_full: {
    bg: 'rgba(248, 113, 113, 0.16)',
    color: '$red10',
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

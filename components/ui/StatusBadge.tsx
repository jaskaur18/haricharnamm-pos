import { Paragraph } from 'tamagui'

const badgeMap = {
  in_stock: {
    bg: 'rgba(134, 239, 172, 0.15)',
    color: '#86EFAC',
    label: 'In Stock',
  },
  low_stock: {
    bg: 'rgba(253, 224, 71, 0.15)',
    color: '#FDE047',
    label: 'Low Stock',
  },
  out_of_stock: {
    bg: 'rgba(252, 165, 165, 0.15)',
    color: '#FCA5A5',
    label: 'Out of Stock',
  },
  completed: {
    bg: 'rgba(52, 211, 153, 0.15)',
    color: '#34D399',
    label: 'Completed',
  },
  returned_partial: {
    bg: 'rgba(253, 224, 71, 0.15)',
    color: '#FDE047',
    label: 'Partial Return',
  },
  returned_full: {
    bg: 'rgba(252, 165, 165, 0.15)',
    color: '#FCA5A5',
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
      py="$1"
      rounded="$10"
      fontSize="$1"
      fontWeight="700"
      style={{ textAlign: 'center' }}
    >
      {token.label}
    </Paragraph>
  )
}

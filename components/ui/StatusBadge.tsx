import { Paragraph } from 'tamagui'

const badgeMap = {
  in_stock: {
    bg: '#14532D',
    color: '#86EFAC',
    label: 'In Stock',
  },
  low_stock: {
    bg: '#713F12',
    color: '#FDE047',
    label: 'Low Stock',
  },
  out_of_stock: {
    bg: '#7F1D1D',
    color: '#FCA5A5',
    label: 'Out of Stock',
  },
  completed: {
    bg: '#14532D',
    color: '#86EFAC',
    label: 'Completed',
  },
  returned_partial: {
    bg: '#713F12',
    color: '#FDE047',
    label: 'Partial Return',
  },
  returned_full: {
    bg: '#7F1D1D',
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
      text="center"
    >
      {token.label}
    </Paragraph>
  )
}

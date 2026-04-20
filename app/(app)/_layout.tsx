import { Slot } from 'expo-router'
import { AppShell } from 'components/app/AppShell'

export default function AppLayout() {
  return (
    <AppShell>
      <Slot />
    </AppShell>
  )
}

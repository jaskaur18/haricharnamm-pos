import { ConvexReactClient } from 'convex/react'
import { api } from '../convex/_generated/api'

export const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
})

export const convexApi = api as any

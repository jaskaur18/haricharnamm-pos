import { ConvexReactClient } from 'convex/react'
import { api } from '../convex/_generated/api'

// Fallback to prevent hard synchronous native crash when environment variables are omitted during EAS build
const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL || 'https://mock.convex.cloud'

export const convex = new ConvexReactClient(CONVEX_URL, {
  unsavedChangesWarning: false,
})

export const convexApi = api

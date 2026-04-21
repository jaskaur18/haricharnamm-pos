import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const STORAGE_KEY = 'hc.auth.session.v1'

function canUseWebStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export async function readStoredSession() {
  if (canUseWebStorage()) {
    return window.localStorage.getItem(STORAGE_KEY)
  }
  return SecureStore.getItemAsync(STORAGE_KEY)
}

export async function writeStoredSession(value: string) {
  if (canUseWebStorage()) {
    window.localStorage.setItem(STORAGE_KEY, value)
    return
  }
  await SecureStore.setItemAsync(STORAGE_KEY, value)
}

export async function clearStoredSession() {
  if (canUseWebStorage()) {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }
  await SecureStore.deleteItemAsync(STORAGE_KEY)
}

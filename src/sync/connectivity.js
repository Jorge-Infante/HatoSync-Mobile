import { useNetInfo } from '@react-native-community/netinfo'
import NetInfo from '@react-native-community/netinfo'

/**
 * Connectivity helpers. We treat "unknown" (null) as online so we never block
 * the UI before the first reading; only an explicit `false` means offline.
 */
export function useOnline() {
  const net = useNetInfo()
  return net.isConnected !== false && net.isInternetReachable !== false
}

export async function isOnline() {
  const state = await NetInfo.fetch()
  return state.isConnected !== false && state.isInternetReachable !== false
}

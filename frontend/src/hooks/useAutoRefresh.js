/**
 * hooks/useAutoRefresh.js
 * ------------------------
 * v1.4.0 — Returns an ever-increasing `refreshKey` integer that increments
 * every REFRESH_INTERVAL ms while the browser tab is visible.
 *
 * Usage:
 *   const refreshKey = useAutoRefresh()
 *   useEffect(() => { fetchData() }, [refreshKey, ...otherDeps])
 *
 * This makes any component automatically re-fetch data without user action,
 * and pauses polling when the tab is hidden to save resources.
 */

import { useEffect, useState } from 'react'

const REFRESH_INTERVAL = 30_000  // 30 seconds

export function useAutoRefresh(intervalMs = REFRESH_INTERVAL) {
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const tick = () => {
      // Only bump the key when the tab is visible
      if (!document.hidden) {
        setRefreshKey((k) => k + 1)
      }
    }

    const id = setInterval(tick, intervalMs)

    // Also refresh immediately when the user returns to the tab
    const handleVisibility = () => {
      if (!document.hidden) tick()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [intervalMs])

  return refreshKey
}

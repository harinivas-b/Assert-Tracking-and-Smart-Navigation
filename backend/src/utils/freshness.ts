/**
 * Freshness utility for calculating dynamic status of Trackers, Gateways, and Assets.
 * Based on real ThingSpeak telemetry update frequency (~15-25 seconds per feed).
 */

// A device reporting within 90 seconds is actively transmitting
export const FRESHNESS_ACTIVE_SEC = 90;

// A device reporting between 90s and 180s (3 min) is considered stale
export const FRESHNESS_STALE_SEC = 180;

/**
 * Computes dynamic status of a BLE Smart Tag / Tracker.
 */
export function computeTagStatus(
  lastSeen: Date | string | null | undefined,
  batteryLevel?: number | null
): 'ACTIVE' | 'STALE' | 'OFFLINE' | 'LOW_BATTERY' {
  if (!lastSeen) return 'OFFLINE';
  const ageSec = (Date.now() - new Date(lastSeen).getTime()) / 1000;
  if (ageSec > FRESHNESS_STALE_SEC) return 'OFFLINE';
  if (ageSec > FRESHNESS_ACTIVE_SEC) return 'STALE';
  if (batteryLevel !== undefined && batteryLevel !== null && batteryLevel < 20) return 'LOW_BATTERY';
  return 'ACTIVE';
}

/**
 * Computes dynamic status of a BLE Gateway / Reader.
 */
export function computeGatewayStatus(
  lastSeen: Date | string | null | undefined,
  timeoutSec: number = 90
): 'ONLINE' | 'STALE' | 'OFFLINE' {
  if (!lastSeen) return 'OFFLINE';
  const ageSec = (Date.now() - new Date(lastSeen).getTime()) / 1000;
  if (ageSec > FRESHNESS_STALE_SEC) return 'OFFLINE';
  if (ageSec > timeoutSec) return 'STALE';
  return 'ONLINE';
}

/**
 * Computes dynamic status of an Asset based on its assigned tracker's freshness.
 */
export function computeAssetStatus(
  trackerLastSeen: Date | string | null | undefined,
  currentAssetStatus?: string
): 'ACTIVE' | 'STALE' | 'OFFLINE' | 'MISSING' {
  if (currentAssetStatus === 'MISSING') return 'MISSING';
  if (!trackerLastSeen) return 'OFFLINE';
  const ageSec = (Date.now() - new Date(trackerLastSeen).getTime()) / 1000;
  if (ageSec > FRESHNESS_STALE_SEC) return 'OFFLINE';
  if (ageSec > FRESHNESS_ACTIVE_SEC) return 'STALE';
  return 'ACTIVE';
}

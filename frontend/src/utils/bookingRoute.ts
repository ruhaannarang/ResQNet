/**
 * Pure helpers for the booking → map workflow. No network, no storage —
 * every rule here is unit-testable and shared by both portals.
 */

export interface CoordInput {
  latitude: number | null | undefined
  longitude: number | null | undefined
}

export interface RouteValidationError {
  code:
    | 'MISSING_ORIGIN'
    | 'MISSING_DESTINATION'
    | 'INVALID_ORIGIN'
    | 'INVALID_DESTINATION'
    | 'IDENTICAL_POINTS'
  message: string
}

export type RouteValidation =
  | { ok: true; origin: { latitude: number; longitude: number }; destination: { latitude: number; longitude: number } }
  | { ok: false; error: RouteValidationError }

const isValidLat = (v: unknown): v is number =>
  typeof v === 'number' && isFinite(v) && v >= -90 && v <= 90
const isValidLng = (v: unknown): v is number =>
  typeof v === 'number' && isFinite(v) && v >= -180 && v <= 180

/**
 * Validate a booking leg before any route is calculated.
 * Never falls back — a failure is a structured error the UI must show.
 */
export function validateRoutePoints(
  origin: CoordInput | null | undefined,
  destination: CoordInput | null | undefined,
  originName = 'Origin',
  destinationName = 'Destination',
): RouteValidation {
  if (!origin || origin.latitude == null || origin.longitude == null) {
    return {
      ok: false,
      error: {
        code: 'MISSING_ORIGIN',
        message: `${originName} GPS is missing. Set the location explicitly — no route was calculated.`,
      },
    }
  }
  if (!destination || destination.latitude == null || destination.longitude == null) {
    return {
      ok: false,
      error: {
        code: 'MISSING_DESTINATION',
        message: `${destinationName} GPS is missing. Set the location explicitly — no route was calculated.`,
      },
    }
  }
  if (!isValidLat(origin.latitude) || !isValidLng(origin.longitude)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_ORIGIN',
        message: `${originName} coordinates are out of range (${origin.latitude}, ${origin.longitude}).`,
      },
    }
  }
  if (!isValidLat(destination.latitude) || !isValidLng(destination.longitude)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_DESTINATION',
        message: `${destinationName} coordinates are out of range (${destination.latitude}, ${destination.longitude}).`,
      },
    }
  }
  if (
    Math.abs(origin.latitude - destination.latitude) < 1e-6 &&
    Math.abs(origin.longitude - destination.longitude) < 1e-6
  ) {
    return {
      ok: false,
      error: {
        code: 'IDENTICAL_POINTS',
        message: `${originName} and ${destinationName} are the same point — refusing to route to itself.`,
      },
    }
  }
  return {
    ok: true,
    origin: { latitude: origin.latitude, longitude: origin.longitude },
    destination: { latitude: destination.latitude, longitude: destination.longitude },
  }
}

/** Canonical trip phases. Legacy 'enroute' (v1 store) maps to 'transporting'. */
export type TripPhase =
  | 'pending'
  | 'accepted'
  | 'arrived_at_patient'
  | 'transporting'
  | 'completed'
  | 'cancelled'

export function normalizeStatus(s: string | undefined | null): TripPhase {
  const v = String(s || '').toLowerCase()
  if (v === 'enroute') return 'transporting' // v1 legacy
  if (
    v === 'pending' ||
    v === 'accepted' ||
    v === 'arrived_at_patient' ||
    v === 'transporting' ||
    v === 'completed' ||
    v === 'cancelled'
  ) {
    return v
  }
  return 'pending'
}

export const PHASE_LABEL: Record<TripPhase, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  arrived_at_patient: 'At patient',
  transporting: 'Transporting',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

/** Does this booking carry a usable hospital/destination fix for the transport leg? */
export function hasDestinationFix(b: {
  destination_latitude: number | null | undefined
  destination_longitude: number | null | undefined
}): boolean {
  return (
    b.destination_latitude != null &&
    b.destination_longitude != null &&
    isValidLat(b.destination_latitude) &&
    isValidLng(b.destination_longitude)
  )
}

/** Does this booking carry a usable patient/incident fix for the pickup leg? */
export function hasPickupFix(b: {
  pickup_latitude: number | null | undefined
  pickup_longitude: number | null | undefined
}): boolean {
  return (
    b.pickup_latitude != null &&
    b.pickup_longitude != null &&
    isValidLat(b.pickup_latitude) &&
    isValidLng(b.pickup_longitude)
  )
}

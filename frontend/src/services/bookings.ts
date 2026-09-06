import axios from 'axios'
import { Booking, BookingCreate } from '../types'

const API_BASE = '/api/v1'
export const BOOKINGS_STORAGE_KEY = 'resqnet_bookings_v1'
const STORAGE_KEY = BOOKINGS_STORAGE_KEY

// Last-known backend reachability (null = not checked yet)
let backendLive: boolean | null = null

const SEED: Booking[] = [
  {
    id: 'seed-b1',
    requester_name: 'Asha R.',
    phone: '+91 98450 12345',
    category: 'medical',
    medical_service_type: 'pickup',
    pickup_address: '14th Cross, HSR Layout Sector 6, Bengaluru',
    destination: 'Narayana Health City (preferred)',
    priority: 'critical',
    num_patients: 1,
    description: 'Elderly patient, chest pain. Need ambulance at home gate.',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'seed-b2',
    requester_name: 'Kiran M.',
    phone: '+91 99010 67890',
    category: 'medical',
    medical_service_type: 'to_hospital',
    pickup_address: 'Sony World Signal, Koramangala, Bengaluru',
    destination: "St. John's Medical College Hospital",
    priority: 'high',
    num_patients: 1,
    description: 'Road accident victim, conscious. Need hospital transfer.',
    status: 'accepted',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

function readLocal(): Booking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (_) {}
  return []
}

function writeLocal(items: Booking[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (_) {}
}

function mergeWithLocal(remote: Booking[]): Booking[] {
  const local = readLocal()
  const ids = new Set(remote.map((b) => b.id))
  // Local-only items (created while backend was down) go first, then remote.
  // For shared ids, remote wins (driver status updates come through the backend).
  const merged = [...local.filter((b) => !ids.has(b.id)), ...remote]
  writeLocal(merged)
  return merged
}

export const bookingService = {
  seed: SEED,

  /** Last-known backend reachability (null = not checked yet). */
  isBackendLive(): boolean | null {
    return backendLive
  },

  /** Lightweight connectivity probe used for the online/offline badge. */
  async checkConnection(): Promise<boolean> {
    try {
      await axios.get(`${API_BASE}/bookings`, { params: { limit: 1 }, timeout: 3000 })
      backendLive = true
    } catch (_) {
      backendLive = false
    }
    return backendLive
  },

  async list(status?: string): Promise<Booking[]> {
    try {
      const res = await axios.get(`${API_BASE}/bookings`, {
        params: status && status !== 'all' ? { status } : {},
        timeout: 4000,
      })
      backendLive = true
      const items = res.data as Booking[]
      const merged = mergeWithLocal(items)
      if (merged.length === 0) {
        writeLocal(SEED)
        return status && status !== 'all' ? SEED.filter((b) => b.status === status) : SEED
      }
      return status && status !== 'all' ? merged.filter((b) => b.status === status) : merged
    } catch (_) {
      backendLive = false
      const local = readLocal()
      const items = local.length > 0 ? local : SEED
      if (local.length === 0) writeLocal(SEED)
      return status && status !== 'all' ? items.filter((b) => b.status === status) : items
    }
  },

  async create(payload: BookingCreate): Promise<Booking> {
    const localItem: Booking = {
      ...payload,
      id: `local-bk-${Date.now().toString(36)}`,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    try {
      const res = await axios.post(`${API_BASE}/bookings`, payload, { timeout: 5000 })
      backendLive = true
      const created = res.data as Booking
      writeLocal([created, ...readLocal()])
      return created
    } catch (_) {
      backendLive = false
      writeLocal([localItem, ...readLocal()])
      return localItem
    }
  },

  async setStatus(id: string, status: string): Promise<Booking | null> {
    const bumped = readLocal().map((b) =>
      b.id === id ? { ...b, status, updated_at: new Date().toISOString() } : b
    )
    writeLocal(bumped)
    try {
      const res = await axios.patch(`${API_BASE}/bookings/${id}/status`, { status }, { timeout: 4000 })
      backendLive = true
      const updated = res.data as Booking
      writeLocal(readLocal().map((b) => (b.id === id ? updated : b)))
      return updated
    } catch (_) {
      backendLive = false
      return bumped.find((b) => b.id === id) || null
    }
  },
}

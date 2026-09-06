import axios from 'axios'
import { CommunityUpdate, CommunityUpdateCreate } from '../types'

const API_BASE = '/api/v1'
const STORAGE_KEY = 'resqnet_community_updates_v1'

const SEED: CommunityUpdate[] = [
  {
    id: 'seed-1',
    road_name: 'Outer Ring Road, Marathahalli',
    category: 'construction',
    title: 'Metro pillar work — one lane closed',
    description:
      'Namma Metro construction near Marathahalli bridge. One lane barricaded both sides, expect 10-15 min delay. Ambulances use service lane.',
    severity: 'high',
    area: 'Marathahalli, Bengaluru',
    reporter_name: 'Ravi K.',
    upvotes: 24,
    created_at: new Date().toISOString(),
    status: 'active',
  },
  {
    id: 'seed-2',
    road_name: 'Whitefield Main Road',
    category: 'pothole',
    title: 'Large potholes after rain near ITPL gate',
    description:
      'Deep potholes on left lane towards Hope Farm. Two-wheelers please slow down. Reported to BBMP.',
    severity: 'medium',
    area: 'Whitefield, Bengaluru',
    reporter_name: 'Priya S.',
    upvotes: 17,
    created_at: new Date().toISOString(),
    status: 'active',
  },
  {
    id: 'seed-3',
    road_name: 'Electronic City Flyover',
    category: 'roadblock',
    title: 'Police barricade for VIP movement till 6 PM',
    description: 'One lane blocked on flyover entry. Emergency vehicles waved through on request.',
    severity: 'medium',
    area: 'Electronic City, Bengaluru',
    reporter_name: 'Imran M.',
    upvotes: 11,
    created_at: new Date().toISOString(),
    status: 'active',
  },
  {
    id: 'seed-4',
    road_name: 'Koramangala 80ft Road',
    category: 'flooding',
    title: 'Waterlogging near Forum junction',
    description: 'Knee-deep water after heavy rain. Avoid low-clearance vehicles, use 100ft road instead.',
    severity: 'high',
    area: 'Koramangala, Bengaluru',
    reporter_name: 'Divya N.',
    upvotes: 9,
    created_at: new Date().toISOString(),
    status: 'active',
  },
]

function readLocal(): CommunityUpdate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (_) {}
  return SEED
}

function writeLocal(items: CommunityUpdate[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (_) {}
}

export const communityService = {
  seed: SEED,

  async list(category?: string): Promise<CommunityUpdate[]> {
    try {
      const res = await axios.get(`${API_BASE}/community/updates`, {
        params: category && category !== 'all' ? { category } : {},
        timeout: 4000,
      })
      const items = res.data as CommunityUpdate[]
      // Merge locally-created items that the (stateless) backend doesn't know about
      const local = readLocal()
      const ids = new Set(items.map((i) => i.id))
      const merged = [...local.filter((l) => !ids.has(l.id)), ...items]
      writeLocal(merged)
      return category && category !== 'all'
        ? merged.filter((u) => u.category === category)
        : merged
    } catch (_) {
      const local = readLocal()
      if (local.length === 0) writeLocal(SEED)
      const items = local.length > 0 ? local : SEED
      return category && category !== 'all'
        ? items.filter((u) => u.category === category)
        : items
    }
  },

  async create(payload: CommunityUpdateCreate): Promise<CommunityUpdate> {
    const localItem: CommunityUpdate = {
      ...payload,
      id: `local-${Date.now().toString(36)}`,
      upvotes: 0,
      created_at: new Date().toISOString(),
      status: 'active',
    }
    try {
      const res = await axios.post(`${API_BASE}/community/updates`, payload, { timeout: 4000 })
      const created = res.data as CommunityUpdate
      writeLocal([created, ...readLocal()])
      return created
    } catch (_) {
      writeLocal([localItem, ...readLocal()])
      return localItem
    }
  },

  async upvote(id: string): Promise<CommunityUpdate | null> {
    // Optimistic local bump first so UI feels instant
    const bumped = readLocal().map((u) => (u.id === id ? { ...u, upvotes: u.upvotes + 1 } : u))
    writeLocal(bumped)
    try {
      const res = await axios.post(`${API_BASE}/community/updates/${id}/upvote`, {}, { timeout: 4000 })
      return res.data as CommunityUpdate
    } catch (_) {
      return bumped.find((u) => u.id === id) || null
    }
  },
}

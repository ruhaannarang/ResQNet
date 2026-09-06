import { useEffect, useMemo, useState } from 'react'
import {
  Truck, MapPin, Cross, Phone, User, Users, CheckCircle2,
  Flag, Ban, RotateCcw, Stethoscope, Home, Siren, Navigation, Crosshair,
} from 'lucide-react'
import { Booking, GPSPosition } from '../types'
import { bookingService } from '../services/bookings'
import { PlaceSearch } from './PlaceSearch'
import { normalizeStatus, hasDestinationFix, PHASE_LABEL, TripPhase } from '../utils/bookingRoute'

const FILTERS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'arrived_at_patient', label: 'At patient' },
  { id: 'transporting', label: 'Transporting' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

function statusStyle(s: string) {
  const v = normalizeStatus(s)
  if (v === 'pending') return 'bg-amber-50 text-amber-800 border-amber-200'
  if (v === 'accepted') return 'bg-sky-50 text-sky-700 border-sky-200'
  if (v === 'arrived_at_patient') return 'bg-violet-50 text-violet-700 border-violet-200'
  if (v === 'transporting') return 'bg-blue-50 text-blue-700 border-blue-200'
  if (v === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}

function medicalBadge(t?: string | null) {
  if (t === 'to_hospital') return { label: 'Ambulance to hospital', icon: Cross }
  if (t === 'pickup') return { label: 'Ambulance to patient', icon: Home }
  return null
}

function fmtCoord(v: number | null | undefined) {
  return v == null ? '—' : v.toFixed(5)
}

function timeAgo(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  } catch (_) {
    return 'recently'
  }
}

export function DriverPortal({
  driverLocation,
  driverLocationLabel,
  onDriverLocationChange,
  onAcceptAndTrack,
  onArrived,
  onStartTransport,
  onViewRoute,
  refreshSignal,
}: {
  driverLocation: GPSPosition | null
  driverLocationLabel: string
  onDriverLocationChange: (pos: GPSPosition | null, label: string) => void
  onAcceptAndTrack?: (b: Booking) => void
  onArrived?: (b: Booking) => void
  onStartTransport?: (b: Booking) => void
  onViewRoute?: (b: Booking) => void
  refreshSignal?: number
}) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [acting, setActing] = useState<string | null>(null)
  const [online, setOnline] = useState<boolean | null>(null)
  const [locating, setLocating] = useState(false)

  const refresh = async (initial = false) => {
    if (initial) setLoading(true)
    try {
      setBookings(await bookingService.list())
    } finally {
      setOnline(bookingService.isBackendLive())
      if (initial) setLoading(false)
    }
  }

  useEffect(() => {
    refresh(true)
    const t = setInterval(() => refresh(false), 10000)
    // Instant sync when another tab in this browser creates/updates a booking
    const onStorage = () => refresh(false)
    window.addEventListener('storage', onStorage)
    return () => { clearInterval(t); window.removeEventListener('storage', onStorage) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Instant refresh after this device advances a trip phase (accept/arrive/transport).
  useEffect(() => {
    if (refreshSignal) refresh(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal])

  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, accepted: 0, transporting: 0 }
    bookings.forEach((b) => {
      const s = normalizeStatus(b.status)
      if (s === 'pending') c.pending += 1
      else if (s === 'accepted' || s === 'arrived_at_patient') c.accepted += 1
      else if (s === 'transporting') c.transporting += 1
    })
    return c
  }, [bookings])

  const filtered = filter === 'all'
    ? bookings
    : bookings.filter((b) => normalizeStatus(b.status) === filter)

  const act = async (id: string, status: string) => {
    setActing(`${id}:${status}`)
    const updated = await bookingService.setStatus(id, status)
    if (updated) setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)))
    else setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status, updated_at: new Date().toISOString() } : b)))
    setActing(null)
  }

  const useGpsNow = () => {
    setLocating(true)
    if (!('geolocation' in navigator)) {
      setLocating(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onDriverLocationChange(
          { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
          `Driver GPS (${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)})`,
        )
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    )
  }

  const renderActions = (b: Booking) => {
    const s: TripPhase = normalizeStatus(b.status)
    const busy = (key: string) => acting === `${b.id}:${key}`
    if (s === 'pending') {
      return (
        <div className="flex gap-2">
          <button onClick={() => (onAcceptAndTrack ? onAcceptAndTrack(b) : act(b.id, 'accepted'))} disabled={!!acting} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-900 text-white text-xs font-semibold px-3 py-2.5 rounded-xl hover:bg-slate-800 disabled:opacity-50">
            {busy('accepted') ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Accept & view route
          </button>
          <button onClick={() => act(b.id, 'cancelled')} disabled={!!acting} className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <Ban className="w-3.5 h-3.5" /> Decline
          </button>
        </div>
      )
    }
    if (s === 'accepted') {
      return (
        <div className="space-y-2">
          <button onClick={() => (onArrived ? onArrived(b) : act(b.id, 'arrived_at_patient'))} disabled={!!acting} className="w-full inline-flex items-center justify-center gap-1.5 bg-violet-600 text-white text-xs font-semibold px-3 py-2.5 rounded-xl hover:bg-violet-700 disabled:opacity-50">
            <MapPin className="w-3.5 h-3.5" /> Arrived at patient
          </button>
          <div className="flex gap-2">
            {onViewRoute && (
              <button onClick={() => onViewRoute(b)} disabled={!!acting} className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">
                <Navigation className="w-3.5 h-3.5" /> Route
              </button>
            )}
            <button onClick={() => act(b.id, 'cancelled')} disabled={!!acting} className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              <Ban className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      )
    }
    if (s === 'arrived_at_patient') {
      const canTransport = hasDestinationFix(b)
      return (
        <div className="space-y-2">
          <div className="text-xs text-violet-800 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2">
            Waiting — patient boarding. First route ended.
          </div>
          {canTransport ? (
            <button onClick={() => (onStartTransport ? onStartTransport(b) : act(b.id, 'transporting'))} disabled={!!acting} className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50">
              <Navigation className="w-3.5 h-3.5" /> Start transport to hospital
            </button>
          ) : (
            <button onClick={() => act(b.id, 'completed')} disabled={!!acting} className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 text-white text-xs font-semibold px-3 py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark completed
            </button>
          )}
        </div>
      )
    }
    if (s === 'transporting') {
      return (
        <div className="space-y-2">
          <button onClick={() => act(b.id, 'completed')} disabled={!!acting} className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 text-white text-xs font-semibold px-3 py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
            {busy('completed') ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Flag className="w-3.5 h-3.5" />} Mark completed
          </button>
          {onViewRoute && (
            <button onClick={() => onViewRoute(b)} disabled={!!acting} className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">
              <Navigation className="w-3.5 h-3.5" /> View route on map
            </button>
          )}
        </div>
      )
    }
    return (
      <button onClick={() => act(b.id, 'pending')} disabled={!!acting} className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
        <RotateCcw className="w-3.5 h-3.5" /> Reopen
      </button>
    )
  }

  return (
    <div className="max-w-[1100px] mx-auto w-full px-4 lg:px-6 py-8 space-y-6">
      {/* Hero */}
      <div className="panel-card overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 grid place-items-center shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-extrabold tracking-tight">Driver Portal</h1>
              <p className="text-sm text-white/70 leading-relaxed mt-1">
                Accept → drive to patient → start transport → complete. Routes always start from your live GPS.
              </p>
              <div className="mt-3">
                {online === null ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/10 border border-white/20 text-white/80 px-2.5 py-1 rounded-full">Checking server…</span>
                ) : online ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-emerald-500/20 border border-emerald-300/30 text-emerald-100 px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Live — connected to booking server</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-amber-500/20 border border-amber-300/30 text-amber-100 px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Offline — this browser's bookings only. Start the backend or use the same browser as booking.</span>
                )}
              </div>
            </div>
            <button onClick={() => refresh(false)} className="hidden sm:inline-flex items-center gap-1.5 bg-white/10 border border-white/20 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-white/20 shrink-0">
              <RotateCcw className="w-4 h-4" /> Refresh
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-5 max-w-md">
            {[
              { label: 'Pending', value: counts.pending, dot: 'bg-amber-400' },
              { label: 'Accepted', value: counts.accepted, dot: 'bg-sky-400' },
              { label: 'Transporting', value: counts.transporting, dot: 'bg-blue-400' },
            ].map((k) => (
              <div key={k.label} className="bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${k.dot}`} />
                <div>
                  <div className="text-lg font-extrabold leading-none">{k.value}</div>
                  <div className="text-[11px] text-white/60 font-medium">{k.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Driver location */}
      <div className="panel-card p-5">
        <h3 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2 mb-1">
          <Crosshair className="w-4 h-4 text-slate-500" /> My location (route start)
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Accepting a booking uses a fresh GPS fix. Set a manual point as backup — routes never start from a guessed location.
        </p>
        {driverLocation ? (
          <div className="flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-semibold text-emerald-800 truncate">{driverLocationLabel || 'Manual point'}</span>
            <span className="ml-auto font-mono text-emerald-700 shrink-0">
              {driverLocation.latitude.toFixed(5)}, {driverLocation.longitude.toFixed(5)}
            </span>
            <button onClick={() => onDriverLocationChange(null, '')} className="text-emerald-700 hover:text-emerald-900 font-semibold shrink-0">Clear</button>
          </div>
        ) : (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-3">
            No driver location set. Accept will request live GPS; set a manual point below as backup.
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3 items-start">
          <button
            onClick={useGpsNow}
            disabled={locating}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            <Crosshair className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
            {locating ? 'Getting GPS…' : 'Use GPS now'}
          </button>
          <PlaceSearch
            label="Or set manually"
            placeholder="Search your position…"
            onSelect={(pos, name) =>
              onDriverLocationChange(
                pos,
                name.split(',').slice(0, 2).join(',').trim(),
              )
            }
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${filter === f.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500 self-center">{filtered.length} booking{filtered.length === 1 ? '' : 's'}</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="panel-card p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-2/3" />
              <div className="h-3 bg-slate-100 rounded w-1/2 mt-2" />
              <div className="h-3 bg-slate-100 rounded w-full mt-3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel-card p-10 text-center">
          <Siren className="w-8 h-8 text-slate-300 mx-auto" />
          <div className="text-sm font-semibold text-slate-700 mt-3">No bookings here</div>
          <div className="text-xs text-slate-500 mt-1">New user bookings will land in Pending automatically.</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((b) => {
            const med = b.category === 'medical' ? medicalBadge(b.medical_service_type) : null
            return (
              <article key={b.id} className="panel-card p-5 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white grid place-items-center shrink-0">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 leading-snug flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{b.pickup_address}</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                      {fmtCoord(b.pickup_latitude)}, {fmtCoord(b.pickup_longitude)}
                    </div>
                    {b.destination_address && (
                      <div className="text-xs text-slate-500 mt-1">
                        <div className="flex items-center gap-1.5">
                          <Cross className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">→ {b.destination_address}</span>
                        </div>
                        <div className="font-mono text-[11px] ml-5">
                          {fmtCoord(b.destination_latitude)}, {fmtCoord(b.destination_longitude)}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-1 rounded-full border shrink-0 ${statusStyle(b.status)}`}>{PHASE_LABEL[normalizeStatus(b.status)]}</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded-full capitalize">{b.category}</span>
                  {med && (
                    <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full inline-flex items-center gap-1">
                      <med.icon className="w-3 h-3" /> {med.label}
                    </span>
                  )}
                  <span className="text-[11px] font-semibold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded-full capitalize">{b.priority}</span>
                  <span className="text-[11px] font-medium text-slate-500 inline-flex items-center gap-1 px-1 py-1"><Users className="w-3 h-3" /> {b.num_patients}</span>
                </div>

                {b.description && <p className="text-[13px] leading-relaxed text-slate-600">{b.description}</p>}

                <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700"><User className="w-3.5 h-3.5" /> {b.requester_name}</span>
                  <a href={`tel:${b.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:underline"><Phone className="w-3.5 h-3.5" /> {b.phone}</a>
                  <span className="ml-auto text-[11px] text-slate-400">{timeAgo(b.created_at)}</span>
                </div>

                <div className="text-[11px] font-mono text-slate-400">ID {b.id}</div>
                {renderActions(b)}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import {
  CalendarPlus, Stethoscope, Flame, ShieldCheck, Biohazard, Home,
  Cross, MapPin, Phone, User, Users, CheckCircle2, Clock3, Navigation, Crosshair,
} from 'lucide-react'
import { Booking } from '../types'
import { bookingService } from '../services/bookings'
import { PlaceSearch } from './PlaceSearch'
import { normalizeStatus, PHASE_LABEL } from '../utils/bookingRoute'

const CATEGORIES = [
  { id: 'medical', label: 'Medical', icon: Stethoscope },
  { id: 'fire', label: 'Fire', icon: Flame },
  { id: 'police', label: 'Police', icon: ShieldCheck },
  { id: 'disaster', label: 'Disaster', icon: Biohazard },
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

function medicalLabel(t?: string | null) {
  if (t === 'to_hospital') return 'Ambulance to hospital'
  if (t === 'pickup') return 'Ambulance to my location'
  return null
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

const EMPTY_FORM = {
  requester_name: '',
  phone: '',
  category: 'medical',
  medical_service_type: 'pickup',
  pickup_address: '',
  pickup_latitude: null as number | null,
  pickup_longitude: null as number | null,
  destination_address: '',
  destination_latitude: null as number | null,
  destination_longitude: null as number | null,
  priority: 'high',
  num_patients: 1,
  description: '',
}

export function UserBookingPortal({ userCity }: { userCity?: string }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [online, setOnline] = useState<boolean | null>(null)
  const [locating, setLocating] = useState(false)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null)

  const refresh = async () => {
    setBookings(await bookingService.list())
    setOnline(bookingService.isBackendLive())
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 15000)
    // Instant sync when another tab in this browser creates/updates a booking
    const onStorage = () => refresh()
    window.addEventListener('storage', onStorage)
    return () => { clearInterval(t); window.removeEventListener('storage', onStorage) }
  }, [])

  const isMedical = form.category === 'medical'
  const needsHospital = isMedical && form.medical_service_type === 'to_hospital'
  // Where the responding vehicle must reach: ambulance pickup for medical,
  // incident spot (= the unit's destination) for fire / police / disaster.
  const targetFieldLabel = isMedical ? 'Patient pickup location *' : 'Incident location *'

  /** Fill pickup with the user's live GPS: readable address + exact coords, stored separately. */
  const useCurrentLocation = () => {
    setLocating(true)

    const applyCoords = async (lat: number, lng: number) => {
      setGpsCoords({ lat, lng })
      // Human-readable address only — coordinates go to dedicated numeric fields.
      let place = `Current location (${lat.toFixed(5)}, ${lng.toFixed(5)})`
      try {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 5000)
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
          { signal: ctrl.signal }
        )
        clearTimeout(timer)
        const data = await res.json()
        if (data?.display_name) {
          place = String(data.display_name).split(',').slice(0, 3).join(',').trim()
        }
      } catch (_) {}
      setForm((f) => ({ ...f, pickup_address: place, pickup_latitude: lat, pickup_longitude: lng }))
      setLocating(false)
      setToast(
        isMedical
          ? 'Current location set as ambulance pickup (GPS locked).'
          : 'Current location set as the destination for the responding unit (GPS locked).'
      )
      setTimeout(() => setToast(null), 4000)
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => applyCoords(pos.coords.latitude, pos.coords.longitude),
        async () => {
          // GPS denied/unavailable — IP fallback (same as dispatch view)
          try {
            const res = await fetch('https://ipwho.is/')
            const data = await res.json()
            if (data?.success && data.latitude && data.longitude) {
              applyCoords(data.latitude, data.longitude)
              return
            }
          } catch (_) {}
          setLocating(false)
          setToast('Location blocked. Allow GPS or type the address manually.')
          setTimeout(() => setToast(null), 4000)
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      )
    } else {
      setLocating(false)
      setToast('Geolocation not supported — please type the address manually.')
      setTimeout(() => setToast(null), 4000)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.requester_name.trim() || !form.phone.trim() || !form.pickup_address.trim()) {
      setToast('Please fill your name, phone and pickup location.')
      setTimeout(() => setToast(null), 4000)
      return
    }
    if (needsHospital && (form.destination_latitude == null || form.destination_longitude == null)) {
      setToast('Please pick the hospital from search so the driver gets exact GPS coordinates.')
      setTimeout(() => setToast(null), 4000)
      return
    }
    setSubmitting(true)
    try {
      const created = await bookingService.create({
        requester_name: form.requester_name.trim(),
        phone: form.phone.trim(),
        category: form.category,
        medical_service_type: isMedical ? form.medical_service_type : null,
        pickup_address: form.pickup_address.trim(),
        pickup_latitude: form.pickup_latitude,
        pickup_longitude: form.pickup_longitude,
        destination_address: form.destination_address.trim(),
        destination_latitude: form.destination_latitude,
        destination_longitude: form.destination_longitude,
        priority: form.priority,
        num_patients: form.num_patients,
        description: form.description.trim(),
      })
      setBookings((prev) => [created, ...prev])
      setForm({ ...EMPTY_FORM, category: form.category })
      setGpsCoords(null)
      setToast(`Booked! ID ${created.id} — a driver will accept it shortly. Track status below.`)
    } finally {
      setSubmitting(false)
      setTimeout(() => setToast(null), 5000)
    }
  }

  return (
    <div className="max-w-[1100px] mx-auto w-full px-4 lg:px-6 py-8 space-y-6">
      {/* Hero */}
      <div className="panel-card overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 grid place-items-center shrink-0">
              <CalendarPlus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Book Emergency Service</h1>
              <p className="text-sm text-white/70 leading-relaxed mt-1 max-w-3xl">
                Request an ambulance, fire unit or rescue van. Your booking appears live in the
                driver portal{userCity ? ` for the ${userCity} sector` : ''}.
              </p>
              <div className="mt-3">
                {online === null ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/10 border border-white/20 text-white/80 px-2.5 py-1 rounded-full">Checking server…</span>
                ) : online ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-emerald-500/20 border border-emerald-300/30 text-emerald-100 px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Backend live — drivers see bookings instantly</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-amber-500/20 border border-amber-300/30 text-amber-100 px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Offline mode — bookings stay in this browser only. Start the backend to share.</span>
                )}
              </div>
            </div>
          </div>
        </div>
        {toast && (
          <div className="mx-6 my-4 flex items-center gap-2 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {toast}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        {/* Form */}
        <form onSubmit={handleSubmit} className="panel-card p-6 lg:col-span-3 space-y-5">
          <h2 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span className="w-1.5 h-7 rounded-full bg-red-600" /> New booking
          </h2>

          {/* Category */}
          <div>
            <label className="label-formal">Service needed</label>
            <div className="grid grid-cols-4 gap-1.5">
              {CATEGORIES.map((c) => {
                const active = form.category === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setForm({ ...form, category: c.id })}
                    className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-xs font-semibold transition-colors ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    <c.icon className="w-4 h-4" /> {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Medical service type */}
          {isMedical && (
            <div className="animate-fade-in">
              <label className="label-formal">Medical service type</label>
              <div className="grid sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, medical_service_type: 'pickup' })}
                  className={`text-left rounded-xl border p-3.5 transition-colors ${form.medical_service_type === 'pickup' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 hover:border-slate-400'}`}
                >
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Home className="w-4 h-4" /> Call ambulance here
                  </div>
                  <div className={`text-xs mt-1 leading-relaxed ${form.medical_service_type === 'pickup' ? 'text-white/70' : 'text-slate-500'}`}>
                    Ambulance comes to the patient at your location.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, medical_service_type: 'to_hospital' })}
                  className={`text-left rounded-xl border p-3.5 transition-colors ${form.medical_service_type === 'to_hospital' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 hover:border-slate-400'}`}
                >
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Cross className="w-4 h-4" /> Ambulance to hospital
                  </div>
                  <div className={`text-xs mt-1 leading-relaxed ${form.medical_service_type === 'to_hospital' ? 'text-white/70' : 'text-slate-500'}`}>
                    Transfer the patient from pickup point to a hospital.
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label-formal flex items-center gap-1"><User className="w-3 h-3" /> Your name *</label>
              <input className="input-field" placeholder="e.g. Asha R." value={form.requester_name} onChange={(e) => setForm({ ...form, requester_name: e.target.value })} maxLength={100} />
            </div>
            <div>
              <label className="label-formal flex items-center gap-1"><Phone className="w-3 h-3" /> Phone *</label>
              <input className="input-field" placeholder="+91 …" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} />
            </div>
          </div>

          {/* Locations */}
          <div className="space-y-4">
            <div>
              <label className="label-formal flex items-center gap-1"><MapPin className="w-3 h-3" /> {targetFieldLabel}</label>
              <input
                className="input-field"
                placeholder="Street, landmark, area…"
                value={form.pickup_address}
                onChange={(e) => {
                  // Manual edit clears the stored GPS fix — addresses alone are not routable.
                  setForm({ ...form, pickup_address: e.target.value, pickup_latitude: null, pickup_longitude: null })
                  setGpsCoords(null)
                }}
                maxLength={300}
              />
              <div className="mt-2">
                <PlaceSearch
                  label="Search pickup place"
                  placeholder="Type area or landmark, pick from list…"
                  onSelect={(pos, name) => {
                    setForm((f) => ({
                      ...f,
                      pickup_address: name.split(',').slice(0, 3).join(',').trim(),
                      pickup_latitude: pos.latitude,
                      pickup_longitude: pos.longitude,
                    }))
                    setGpsCoords({ lat: pos.latitude, lng: pos.longitude })
                  }}
                />
              </div>
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={locating}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 disabled:opacity-50 transition-colors"
              >
                <Crosshair className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
                {locating ? 'Getting your location…' : isMedical ? 'Use my current location as pickup' : 'Send responding unit to my current location'}
              </button>
              {gpsCoords && (
                <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  GPS locked: {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
                </span>
              )}
            </div>
            <div>
              <PlaceSearch
                label={needsHospital ? 'Search destination hospital *' : 'Search destination (optional)'}
                placeholder="Type hospital or place, pick from list…"
                bias={gpsCoords ? { latitude: gpsCoords.lat, longitude: gpsCoords.lng } : undefined}
                onSelect={(pos, name) =>
                  setForm((f) => ({
                    ...f,
                    destination_address: name.split(',').slice(0, 2).join(',').trim(),
                    destination_latitude: pos.latitude,
                    destination_longitude: pos.longitude,
                  }))
                }
              />
            </div>
            <div>
              <label className="label-formal flex items-center gap-1"><Cross className="w-3 h-3" /> {needsHospital ? 'Destination hospital *' : isMedical ? 'Preferred hospital (optional)' : 'Destination (optional)'}</label>
              <input
                className="input-field"
                placeholder={needsHospital ? 'Pick from search above for exact GPS' : 'e.g. Nearest hospital'}
                value={form.destination_address}
                onChange={(e) => {
                  // Manual edit clears the stored GPS fix.
                  setForm({ ...form, destination_address: e.target.value, destination_latitude: null, destination_longitude: null })
                }}
                maxLength={300}
              />
              {form.destination_latitude != null && form.destination_longitude != null && (
                <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  GPS locked: {form.destination_latitude.toFixed(5)}, {form.destination_longitude.toFixed(5)}
                </span>
              )}
            </div>
          </div>

          {/* Priority + patients */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label-formal">Priority</label>
              <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="label-formal flex items-center gap-1"><Users className="w-3 h-3" /> Patients</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setForm({ ...form, num_patients: Math.max(1, form.num_patients - 1) })} className="w-9 h-[42px] grid place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700">−</button>
                <div className="flex-1 h-[42px] grid place-items-center rounded-xl border border-slate-200 bg-slate-50 font-mono text-sm font-semibold text-slate-900">{form.num_patients}</div>
                <button type="button" onClick={() => setForm({ ...form, num_patients: Math.min(20, form.num_patients + 1) })} className="w-9 h-[42px] grid place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700">+</button>
              </div>
            </div>
          </div>

          <div>
            <label className="label-formal">Notes for the driver (optional)</label>
            <textarea className="input-field min-h-[72px] resize-y" placeholder="Floor, gate, callback info…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} />
          </div>

          <button type="submit" disabled={submitting} className="w-full btn-danger py-3.5 text-[14px] disabled:opacity-60">
            {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Navigation className="w-4 h-4" />}
            {submitting ? 'Booking…' : 'Confirm booking'}
          </button>
        </form>

        {/* Track */}
        <div className="lg:col-span-2 panel-card p-5">
          <h3 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2 mb-1">
            <Clock3 className="w-4 h-4 text-slate-500" /> Recent requests & live status
          </h3>
          <p className="text-xs text-slate-500 mb-4">Auto-refreshes as drivers accept and update trips.</p>
          {bookings.length === 0 ? (
            <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-4 text-center">
              No bookings yet — your request will appear here.
            </div>
          ) : (
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-0.5">
              {bookings.slice(0, 10).map((b) => (
                <div key={b.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-slate-900 truncate">{b.pickup_address}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {b.requester_name} • {b.category}
                        {b.category === 'medical' && medicalLabel(b.medical_service_type) ? ` • ${medicalLabel(b.medical_service_type)}` : ''}
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full border shrink-0 ${statusStyle(b.status)}`}>{PHASE_LABEL[normalizeStatus(b.status)]}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                    <span className="font-mono">{b.id}</span>
                    <span className="ml-auto">{timeAgo(b.updated_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

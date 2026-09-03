import { useState, useCallback, useEffect } from 'react'
import { Header } from './components/Header'
import { MapContainer } from './components/MapContainer'
import { EmergencyForm } from './components/EmergencyForm'
import { RoutePanel } from './components/RoutePanel'
import { CommandCenter } from './components/CommandCenter'
import { About } from './components/About'
import { apiClient } from './services/api'
import { EmergencyRequest, OptimizedResult, GPSPosition, EmergencyCategory, VehicleClass } from './types'
import { getLocationLabels } from './utils/locationLabels'
import { Activity, Clock3, Route, ShieldCheck, AlertCircle, X, ChevronRight, Layers, Sparkles, MapPin } from 'lucide-react'

const getInitialLocation = (): { origin: GPSPosition; destination: GPSPosition; userCity: string } => {
  try {
    const cached = localStorage.getItem('resqnet_cached_location')
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed.origin?.latitude && parsed.destination?.latitude) {
        return {
          origin: parsed.origin,
          destination: parsed.destination,
          userCity: parsed.userCity || 'Bengaluru',
        }
      }
    }
  } catch (_) {}
  // Default regional fallback (Bengaluru)
  const baseLat = 12.9716
  const baseLng = 77.5946
  return {
    origin: { latitude: baseLat, longitude: baseLng },
    destination: { latitude: Number((baseLat + 0.015).toFixed(6)), longitude: Number((baseLng + 0.015).toFixed(6)) },
    userCity: 'Bengaluru',
  }
}

function KpiStrip({ hasResult, result }: { hasResult: boolean; result: OptimizedResult | null }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 lg:px-6 py-4">
      {[
        { label: 'Active Units', value: '12', sub: '8 ALS • 4 BLS', icon: ShieldCheck, trend: '+2 today' },
        { label: 'Avg. Response', value: hasResult && result ? `${Math.floor(result.best_route.total_duration_seconds/60)}m ${Math.round(result.best_route.total_duration_seconds%60)}s` : '4m 18s', sub: 'Target < 6m', icon: Clock3, trend: '−12% vs avg' },
        { label: 'Routes Evaluated', value: hasResult && result ? String(result.all_routes.length) : '—', sub: hasResult ? `Best ${result?.best_route.total_score.toFixed(2)}` : 'Awaiting dispatch', icon: Route, trend: hasResult ? 'OSRM live' : 'Standby' },
        { label: 'System Uptime', value: '99.98%', sub: 'Last 30 days', icon: Activity, trend: 'Operational' },
      ].map((k) => (
        <div key={k.label} className="panel-card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white grid place-items-center shrink-0">
            <k.icon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 leading-none">{k.label}</div>
            <div className="text-[15px] font-extrabold tracking-tight text-slate-900 leading-none mt-1">{k.value}</div>
            <div className="text-xs text-slate-500 mt-1 truncate">{k.sub}</div>
          </div>
          <span className={`hidden sm:inline-flex text-[11px] font-semibold px-2 py-1 rounded-full border ${k.trend.includes('Operational') || k.trend.includes('OSRM') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : k.trend.includes('−') ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{k.trend}</span>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [result, setResult] = useState<OptimizedResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [geoNotice, setGeoNotice] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(false)
  const [hasManualDestination, setHasManualDestination] = useState(false)
  const [activeView, setActiveView] = useState('dispatch')
  const [mobileTab, setMobileTab] = useState<'form' | 'map' | 'command'>('form')

  const initialLoc = getInitialLocation()
  const [origin, setOrigin] = useState<GPSPosition>(initialLoc.origin)
  const [destination, setDestination] = useState<GPSPosition>(initialLoc.destination)
  const [userCity, setUserCity] = useState<string>(initialLoc.userCity)
  const [category, setCategory] = useState<EmergencyCategory>('medical')
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>('ambulance_als')

  const labels = getLocationLabels(category, vehicleClass)

  const requestCurrentLocation = useCallback((isInitial = false) => {
    setIsLocating(true)
    setGeoNotice(null)

    const applyCoords = (lat: number, lng: number, city?: string) => {
      const newOrigin = { latitude: lat, longitude: lng }
      const newDest = { latitude: Number((lat + 0.015).toFixed(6)), longitude: Number((lng + 0.015).toFixed(6)) }
      setOrigin(newOrigin)
      setIsUsingCurrentLocation(true)
      if (city) setUserCity(city)
      setDestination((prevDest) => {
        if (!hasManualDestination) {
          try {
            localStorage.setItem('resqnet_cached_location', JSON.stringify({ origin: newOrigin, destination: newDest, userCity: city || 'Bengaluru' }))
          } catch (_) {}
          return newDest
        }
        return prevDest
      })
      setIsLocating(false)
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          applyCoords(position.coords.latitude, position.coords.longitude)
        },
        async (geoError) => {
          console.warn('Browser GPS unavailable, fetching IP geolocation fallback:', geoError.message)
          try {
            const res = await fetch('https://ipwho.is/')
            const data = await res.json()
            if (data && data.success && data.latitude && data.longitude) {
              applyCoords(data.latitude, data.longitude, data.city)
              return
            }
          } catch (_) {}

          setIsLocating(false)
          if (geoError.code === 1) {
            setGeoNotice(
              'Location access blocked in browser. Using detected regional location. Click the lock/tune icon in your address bar to enable GPS.'
            )
          } else {
            setGeoNotice('Using detected regional location. Click "Use Current Location" to re-try GPS fix.')
          }
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
      )
    } else {
      fetch('https://ipwho.is/')
        .then((r) => r.json())
        .then((d) => {
          if (d && d.success && d.latitude && d.longitude) {
            applyCoords(d.latitude, d.longitude, d.city)
          } else {
            setIsLocating(false)
          }
        })
        .catch(() => setIsLocating(false))
    }
  }, [hasManualDestination])

  useEffect(() => { requestCurrentLocation(true) }, [requestCurrentLocation])

  const handleEmergencySubmit = useCallback(async (request: EmergencyRequest) => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.computeRoute(request)
      setResult(response)
      setMobileTab('map')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compute route')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleMapClick = useCallback((type: 'origin' | 'destination', pos: GPSPosition) => {
    if (type === 'origin') { setOrigin(pos); setIsUsingCurrentLocation(false) }
    else { setDestination(pos); setHasManualDestination(true) }
  }, [])

  const handleViewChange = (v: string) => {
    setActiveView(v)
    setError(null)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Header activeView={activeView} onViewChange={handleViewChange} isUsingCurrentLocation={isUsingCurrentLocation} userCity={userCity} />

      {activeView === 'dispatch' && (
        <div className="bg-white border-b border-slate-200">
          <KpiStrip hasResult={!!result} result={result} />
        </div>
      )}

      {/* Location notice */}
      {geoNotice && (
        <div className="mx-4 lg:mx-6 mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl px-4 py-3 shadow-sm animate-fade-in">
          <div className="w-8 h-8 rounded-xl bg-amber-600 text-white grid place-items-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Location Access Notice</div>
            <div className="text-xs leading-relaxed text-amber-800/90 mt-0.5">{geoNotice}</div>
          </div>
          <button onClick={() => setGeoNotice(null)} className="w-8 h-8 grid place-items-center rounded-xl hover:bg-amber-100 text-amber-700 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="mx-4 lg:mx-6 mt-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-4 py-3 shadow-sm animate-fade-in">
          <div className="w-8 h-8 rounded-xl bg-red-600 text-white grid place-items-center shrink-0"><AlertCircle className="w-4 h-4" /></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Dispatch notice</div>
            <div className="text-sm leading-relaxed text-red-700/90">{error}</div>
          </div>
          <button onClick={() => setError(null)} className="w-8 h-8 grid place-items-center rounded-xl hover:bg-red-100 text-red-700 shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}

      {activeView === 'about' ? (
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <About />
        </div>
      ) : (
        <>
          {/* Mobile tabs */}
          <div className="lg:hidden sticky top-[96px] z-30 bg-white border-b border-slate-200 flex p-1.5 gap-1 mx-4 mt-4 rounded-2xl shadow-sm">
            {[
              { id: 'form', label: 'Dispatch', icon: Sparkles },
              { id: 'map', label: 'Live Map', icon: Layers },
              { id: 'command', label: 'Command', icon: Activity },
            ].map((t) => (
              <button key={t.id} onClick={() => setMobileTab(t.id as any)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${mobileTab===t.id ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>

          {/* Main */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 lg:p-6 gap-6 max-w-[1600px] w-full mx-auto min-h-0">
            {/* Left */}
            <aside className={`${mobileTab==='form' ? 'flex' : 'hidden'} lg:flex w-full lg:w-[380px] xl:w-[400px] shrink-0 flex-col gap-4 overflow-y-auto lg:max-h-[calc(100vh-220px)] pr-0 lg:pr-1`}>
              <div className="panel-card p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-[13px] font-extrabold tracking-tight text-slate-900 flex items-center gap-2"><span className="w-1.5 h-7 rounded-full bg-red-600" /> New Emergency Request</h2>
                    {isUsingCurrentLocation && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 mt-2 rounded font-semibold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        GPS Active
                      </span>
                    )}
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Configure incident, vehicle and coordinates. The optimizer evaluates corridors with hard constraints and soft penalties.</p>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide uppercase bg-slate-900 text-white px-2.5 py-1 rounded-full">Priority Lane <ChevronRight className="w-3 h-3" /></span>
                </div>
                <EmergencyForm
                  onSubmit={handleEmergencySubmit}
                  loading={loading}
                  origin={origin}
                  destination={destination}
                  onUseCurrentLocation={() => requestCurrentLocation(false)}
                  isLocating={isLocating}
                  isUsingCurrentLocation={isUsingCurrentLocation}
                  category={category}
                  onCategoryChange={setCategory}
                  vehicleClass={vehicleClass}
                  onVehicleClassChange={setVehicleClass}
                  labels={labels}
                />
              </div>

              {result && (
                <div className="animate-fade-in">
                  <RoutePanel result={result} />
                </div>
              )}

              <div className="hidden lg:block panel-card p-4">
                <div className="text-xs font-bold tracking-widest uppercase text-slate-700 mb-2">How scoring works</div>
                <div className="text-xs leading-relaxed text-slate-500 space-y-2">
                  <p><span className="font-semibold text-slate-700">Hard constraints</span> reject impossible corridors (width, height, weight, grade). <span className="font-semibold text-slate-700">Soft weights</span> rank feasible routes: time × incident-aware bias, traffic, road quality, comfort, vehicle fit, weather.</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="badge bg-slate-900 text-white">AI Optimizer</span>
                    <span className="badge bg-white border border-slate-200 text-slate-600">OSRM Live</span>
                    <span className="badge bg-amber-50 border border-amber-200 text-amber-800">Explainable</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Center map */}
            <main className={`${mobileTab==='map' ? 'flex' : 'hidden'} lg:flex flex-1 min-h-[520px] lg:min-h-0 rounded-2xl overflow-hidden border border-slate-200 shadow-elevated bg-white relative`}>
              <MapContainer
                origin={origin}
                destination={destination}
                result={result}
                onMapClick={handleMapClick}
                onUseCurrentLocation={() => requestCurrentLocation(false)}
                isLocating={isLocating}
                labels={labels}
              />
              {loading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm grid place-items-center z-[1001]">
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-elevated px-6 py-5 flex items-center gap-4 min-w-[320px]">
                    <span className="w-10 h-10 rounded-xl bg-slate-900 text-white grid place-items-center"><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /></span>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Optimizing corridors…</div>
                      <div className="text-xs text-slate-500">Evaluating feasibility, traffic and comfort • OSRM live</div>
                    </div>
                  </div>
                </div>
              )}
            </main>

            {/* Right */}
            <aside className={`${mobileTab==='command' ? 'flex' : 'hidden'} lg:flex w-full lg:w-[360px] xl:w-[380px] shrink-0 flex-col overflow-y-auto lg:max-h-[calc(100vh-220px)]`}>
              <div className="panel-card overflow-hidden min-h-[480px]">
                <CommandCenter
                  result={result}
                  isUsingCurrentLocation={isUsingCurrentLocation}
                  userCity={userCity}
                  labels={labels}
                />
              </div>
            </aside>
          </div>
        </>
      )}

      <footer className="border-t border-slate-200 bg-white px-4 lg:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <span>© 2026 ResQNet • Emergency Routing Platform • Built for command-center reliability</span>
        <span className="flex items-center gap-3">
          <span className="hidden sm:inline">Latency ~120ms • Encrypted transit</span>
          <span className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-2.5 py-1 rounded-full font-semibold">Formal Edition <span className="w-1 h-1 rounded-full bg-emerald-400" /></span>
        </span>
      </footer>
    </div>
  )
}

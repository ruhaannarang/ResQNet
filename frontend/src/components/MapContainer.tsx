import { useState, useEffect } from 'react'
import { MapContainer as LeafletMap, TileLayer, Marker, Popup, Polyline, Tooltip, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { GPSPosition, OptimizedResult } from '../types'
import { LocationLabels } from '../utils/locationLabels'
import { MapPinned, Layers, Maximize2, Crosshair, Navigation } from 'lucide-react'

interface Props {
  origin: GPSPosition
  destination: GPSPosition
  result: OptimizedResult | null
  onMapClick: (type: 'origin' | 'destination', pos: GPSPosition) => void
  onUseCurrentLocation?: () => void
  isLocating?: boolean
  labels: LocationLabels
}

const createPin = (variant: 'origin' | 'dest', letter: string) => {
  const color = variant === 'origin' ? '#059669' : '#DC2626'
  return L.divIcon({
    className: 'formal-pin',
    html: `<div style="position:relative;width:36px;height:44px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.22))">
      <div style="position:absolute;left:50%;top:0;transform:translateX(-50%);width:32px;height:32px;background:${color};border:2px solid white;border-radius:50% 50% 50% 0;transform:translateX(-50%) rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.18)"></div>
      <div style="position:absolute;left:50%;top:3px;transform:translateX(-50%);width:28px;height:28px;display:flex;align-items:center;justify-content:center;color:white;font:800 11px Inter,sans-serif;z-index:2">${letter}</div>
      <div style="position:absolute;left:50%;bottom:4px;transform:translateX(-50%);width:10px;height:4px;background:rgba(15,23,42,0.22);border-radius:50%;filter:blur(1px)"></div>
    </div>`,
    iconSize: [36, 44],
    iconAnchor: [18, 38],
  })
}

function MapClickHandler({
  onMapClick,
  selectionMode,
}: {
  onMapClick: Props['onMapClick']
  selectionMode: 'origin' | 'destination'
}) {
  useMapEvents({
    click(e) {
      const pos = { latitude: e.latlng.lat, longitude: e.latlng.lng }
      onMapClick(selectionMode, pos)
    },
  })
  return null
}

function MapViewController({
  origin,
  destination,
  result,
}: {
  origin: GPSPosition
  destination: GPSPosition
  result: OptimizedResult | null
}) {
  const map = useMap()

  useEffect(() => {
    if (result && result.best_route.segments.length > 0) {
      const points: [number, number][] = result.best_route.segments.flatMap((seg) => [
        [seg.start.latitude, seg.start.longitude],
        [seg.end.latitude, seg.end.longitude],
      ])
      if (points.length > 0) {
        map.fitBounds(L.latLngBounds(points), { padding: [50, 50] })
      }
    } else {
      const bounds = L.latLngBounds([
        [origin.latitude, origin.longitude],
        [destination.latitude, destination.longitude],
      ])
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 15 })
    }
  }, [origin.latitude, origin.longitude, destination.latitude, destination.longitude, result, map])

  return null
}

export function MapContainer({
  origin,
  destination,
  result,
  onMapClick,
  onUseCurrentLocation,
  isLocating,
  labels,
}: Props) {
  const [selectionMode, setSelectionMode] = useState<'origin' | 'destination'>('destination')
  const [tile, setTile] = useState<'light' | 'dark'>('light')

  const center: [number, number] = [
    (origin.latitude + destination.latitude) / 2,
    (origin.longitude + destination.longitude) / 2,
  ]

  const getRoutePositions = (route: OptimizedResult['best_route']): [number, number][] => {
    const positions: [number, number][] = []
    for (const seg of route.segments) {
      positions.push([seg.start.latitude, seg.start.longitude])
    }
    if (route.segments.length > 0) {
      const last = route.segments[route.segments.length - 1]
      positions.push([last.end.latitude, last.end.longitude])
    }
    return positions
  }

  const originIcon = createPin('origin', labels.originShort.charAt(0).toUpperCase())
  const destIcon = createPin('dest', labels.destinationShort.charAt(0).toUpperCase())

  return (
    <div className="h-full w-full relative bg-slate-100 overflow-hidden">
      <LeafletMap center={center} zoom={13} className="h-full w-full" zoomControl={false}>
        <MapViewController origin={origin} destination={destination} result={result} />
        <TileLayer
          attribution='&copy; OpenStreetMap &bull; ResQNet OSRM'
          url={tile === 'light' ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'}
        />
        <MapClickHandler onMapClick={onMapClick} selectionMode={selectionMode} />

        <Marker position={[origin.latitude, origin.longitude]} icon={originIcon}>
          <Tooltip permanent direction="top" offset={[0, -26]}>
            <span className="font-bold text-[11px] text-emerald-800 bg-white border border-emerald-300 rounded px-1.5 py-0.5 shadow-sm">
              🟢 {labels.origin}
            </span>
          </Tooltip>
          <Popup>
            <div className="text-sm leading-tight p-1">
              <div className="font-bold text-emerald-700 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {labels.origin}</div>
              <div className="font-mono text-xs text-slate-600 mt-1">{origin.latitude.toFixed(5)}, {origin.longitude.toFixed(5)}</div>
              <div className="text-xs text-slate-500 mt-1">{labels.originDescription}</div>
            </div>
          </Popup>
        </Marker>

        <Marker position={[destination.latitude, destination.longitude]} icon={destIcon}>
          <Tooltip permanent direction="top" offset={[0, -26]}>
            <span className="font-bold text-[11px] text-red-800 bg-white border border-red-300 rounded px-1.5 py-0.5 shadow-sm">
              🔴 {labels.destination}
            </span>
          </Tooltip>
          <Popup>
            <div className="text-sm leading-tight p-1">
              <div className="font-bold text-red-700 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> {labels.destination}</div>
              <div className="font-mono text-xs text-slate-600 mt-1">{destination.latitude.toFixed(5)}, {destination.longitude.toFixed(5)}</div>
              <div className="text-xs text-slate-500 mt-1">{labels.destinationDescription}</div>
            </div>
          </Popup>
        </Marker>

        {result && (
          <>
            {/* outline for best route */}
            <Polyline positions={getRoutePositions(result.best_route)} color="#ffffff" weight={8} opacity={0.9} />
            <Polyline positions={getRoutePositions(result.best_route)} color="#0F172A" weight={5} opacity={1} />

            {result.all_routes.slice(1).map((route) => (
              <Polyline
                key={route.route_id}
                positions={getRoutePositions(route)}
                color="#64748B"
                weight={3.5}
                opacity={0.55}
                dashArray="10 8"
              />
            ))}
          </>
        )}
      </LeafletMap>

      {/* Top control bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-start justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto bg-white/95 backdrop-blur rounded-2xl shadow-elevated border border-slate-200 p-1.5 flex flex-wrap items-center gap-1.5 max-w-full">
          <button
            type="button"
            onClick={() => setSelectionMode('origin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${selectionMode === 'origin' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-50'}`}
          >
            <MapPinned className="w-3.5 h-3.5" /> 🟢 {labels.origin}
          </button>
          <button
            type="button"
            onClick={() => setSelectionMode('destination')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${selectionMode === 'destination' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-50'}`}
          >
            <Crosshair className="w-3.5 h-3.5" /> 🔴 {labels.destination}
          </button>
          {onUseCurrentLocation && (
            <button
              type="button"
              onClick={onUseCurrentLocation}
              disabled={isLocating}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 disabled:opacity-50"
              title={`Set ${labels.origin} to current location`}
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Locating…' : `Set ${labels.originShort} to My Location`}</span>
            </button>
          )}
          <span className="hidden sm:inline text-[11px] text-slate-400 px-2 border-l border-slate-200 ml-1">Click map to set {selectionMode === 'origin' ? labels.origin : labels.destination}</span>
        </div>

        <div className="hidden lg:flex pointer-events-auto items-center gap-2">
          <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 p-1 flex items-center gap-1">
            <button onClick={() => setTile('light')} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${tile==='light' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Light</button>
            <button onClick={() => setTile('dark')} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${tile==='dark' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Dark</button>
          </div>
          <button className="w-9 h-9 grid place-items-center bg-white rounded-xl shadow-elevated border border-slate-200 text-slate-600 hover:text-slate-900">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom legend + stats */}
      <div className="absolute bottom-4 left-4 right-4 z-[1000] flex flex-col lg:flex-row gap-3 pointer-events-none">
        <div className="pointer-events-auto bg-white/95 backdrop-blur rounded-2xl shadow-elevated border border-slate-200 px-4 py-3 flex-1 max-w-[620px]">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-slate-700">Route Legend</span>
            {result && <span className="ml-auto text-xs font-medium text-slate-500">{result.all_routes.length} routes evaluated</span>}
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="flex items-center gap-2"><span className="w-6 h-1 rounded-full bg-slate-900" /> Recommended — solid navy</span>
            <span className="flex items-center gap-2"><span className="w-6 h-1 rounded-full bg-slate-400" style={{ background: 'repeating-linear-gradient(90deg, #64748B 0 6px, transparent 6px 10px)' }} /> Alternative — dashed</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow" /> 🟢 {labels.origin}</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow" /> 🔴 {labels.destination}</span>
          </div>
        </div>

        <div className="hidden xl:flex pointer-events-auto ml-auto bg-slate-900 text-white rounded-2xl shadow-elevated px-4 py-3 items-center gap-4 min-w-[320px]">
          <div className="text-xs leading-none">
            <div className="text-slate-400 font-medium tracking-wide uppercase text-[11px]">Map Center</div>
            <div className="font-mono font-medium mt-1">{center[0].toFixed(4)} , {center[1].toFixed(4)}</div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-xs leading-none">
            <div className="text-slate-400 font-medium tracking-wide uppercase text-[11px]">Scale</div>
            <div className="font-medium mt-1">2 km • OSRM</div>
          </div>
          <div className="ml-auto w-8 h-8 rounded-xl bg-white/10 grid place-items-center">
            <MapPinned className="w-4 h-4 text-white/80" />
          </div>
        </div>
      </div>

      {/* Empty state overlay when no result */}
      {!result && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] pointer-events-none hidden lg:block">
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-elevated border border-slate-200 px-5 py-4 text-center min-w-[360px]">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white grid place-items-center mx-auto mb-2">
              <MapPinned className="w-5 h-5" />
            </div>
            <div className="text-sm font-semibold text-slate-900">Ready to dispatch</div>
            <div className="text-xs text-slate-500 mt-1 leading-relaxed">Configure the incident and vehicle, then press <span className="font-semibold text-slate-700">Dispatch Optimal Route</span>.<br />Alternatives appear as dashed lines.</div>
          </div>
        </div>
      )}
    </div>
  )
}

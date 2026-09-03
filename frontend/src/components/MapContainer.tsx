import { useState } from 'react'
import { MapContainer as LeafletMap, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { GPSPosition, OptimizedResult } from '../types'

interface Props {
  origin: GPSPosition
  destination: GPSPosition
  result: OptimizedResult | null
  onMapClick: (type: 'origin' | 'destination', pos: GPSPosition) => void
}

const createIcon = (color: string) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
})

const originIcon = createIcon('#16A34A')
const destIcon = createIcon('#DC2626')
const vehicleIcon = createIcon('#2563EB')

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

export function MapContainer({ origin, destination, result, onMapClick }: Props) {
  const [selectionMode, setSelectionMode] = useState<'origin' | 'destination'>('destination')

  const center: [number, number] = [
    (origin.latitude + destination.latitude) / 2,
    (origin.longitude + destination.longitude) / 2,
  ]

  const routeColors = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626']

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

  return (
    <div className="h-full w-full relative">
      <LeafletMap center={center} zoom={13} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

        <MapClickHandler onMapClick={onMapClick} selectionMode={selectionMode} />

        <Marker position={[origin.latitude, origin.longitude]} icon={originIcon}>
        <Popup>
          <div className="text-sm">
            <strong className="text-green-700">Origin</strong><br />
            {origin.latitude.toFixed(4)}, {origin.longitude.toFixed(4)}
          </div>
        </Popup>
        </Marker>

        <Marker position={[destination.latitude, destination.longitude]} icon={destIcon}>
        <Popup>
          <div className="text-sm">
            <strong className="text-red-700">Destination</strong><br />
            {destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)}
          </div>
        </Popup>
        </Marker>

        {result && (
        <>
          <Polyline
            positions={getRoutePositions(result.best_route)}
            color={routeColors[0]}
            weight={5}
            opacity={0.9}
          />

          {result.all_routes.slice(1).map((route, idx) => (
            <Polyline
              key={route.route_id}
              positions={getRoutePositions(route)}
              color={routeColors[(idx + 1) % routeColors.length]}
              weight={3}
              opacity={0.5}
              dashArray="8 8"
            />
          ))}
        </>
        )}
      </LeafletMap>

      <div
        className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold text-gray-700 mb-2">Click map to set:</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSelectionMode('origin')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              selectionMode === 'origin'
                ? 'bg-green-600 text-white'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            Origin
          </button>
          <button
            type="button"
            onClick={() => setSelectionMode('destination')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              selectionMode === 'destination'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Destination
          </button>
        </div>
      </div>
    </div>
  )
}

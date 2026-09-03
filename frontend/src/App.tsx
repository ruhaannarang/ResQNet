import { useState, useCallback } from 'react'
import { MapContainer } from './components/MapContainer'
import { EmergencyForm } from './components/EmergencyForm'
import { RoutePanel } from './components/RoutePanel'
import { CommandCenter } from './components/CommandCenter'
import { apiClient } from './services/api'
import { EmergencyRequest, OptimizedResult, GPSPosition } from './types'

function App() {
  const [result, setResult] = useState<OptimizedResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Default example route in New Delhi, India. Both points can be changed
  // using the Origin/Destination controls on the map.
  const [origin, setOrigin] = useState<GPSPosition>({ latitude: 28.6139, longitude: 77.2090 })
  const [destination, setDestination] = useState<GPSPosition>({ latitude: 28.6304, longitude: 77.2177 })

  const handleEmergencySubmit = useCallback(async (request: EmergencyRequest) => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.computeRoute(request)
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compute route')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleMapClick = useCallback((type: 'origin' | 'destination', pos: GPSPosition) => {
    if (type === 'origin') setOrigin(pos)
    else setDestination(pos)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="bg-emergency-red text-white px-6 py-3 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-emergency-red font-bold text-lg">+</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">ResQNet</h1>
          <span className="text-red-200 text-sm">Emergency Route Optimization</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            System Online
          </span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-96 bg-white shadow-lg overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-800 mb-3">New Emergency Request</h2>
            <EmergencyForm
              onSubmit={handleEmergencySubmit}
              loading={loading}
              origin={origin}
              destination={destination}
            />
          </div>

          {result && (
            <div className="p-4">
              <RoutePanel result={result} />
            </div>
          )}

          {error && (
            <div className="p-4 mx-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </aside>

        <main className="flex-1 relative">
          <MapContainer
            origin={origin}
            destination={destination}
            result={result}
            onMapClick={handleMapClick}
          />
        </main>

        {result && (
          <aside className="w-80 bg-white shadow-lg overflow-y-auto flex-shrink-0">
            <CommandCenter result={result} />
          </aside>
        )}
      </div>
    </div>
  )
}

export default App

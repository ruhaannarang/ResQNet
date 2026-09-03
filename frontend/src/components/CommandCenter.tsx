import { OptimizedResult } from '../types'

interface Props {
  result: OptimizedResult
}

export function CommandCenter({ result }: Props) {
  const { best_route, explanation, scores } = result

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60)
    return `${min} min`
  }

  return (
    <div className="p-4 space-y-4">
      <div className="border-b pb-3">
        <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
          <span className="w-2 h-2 bg-emergency-blue rounded-full"></span>
          Command Center
        </h2>
      </div>

      <div className="space-y-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Active Route Status</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm font-medium text-green-700">En Route</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-700">
              {formatTime(best_route.total_duration_seconds)}
            </div>
            <div className="text-xs text-blue-600">ETA</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-700">
              {best_route.total_distance_km.toFixed(1)}
            </div>
            <div className="text-xs text-green-600">km Remaining</div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-2">Confidence Score</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div
              className="h-2 rounded-full bg-emergency-blue"
              style={{ width: `${explanation.confidence_score * 100}%` }}
            />
          </div>
          <div className="text-right text-xs text-gray-600">
            {(explanation.confidence_score * 100).toFixed(0)}%
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-gray-600 mb-2">Recommendation Summary</h3>
          <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-2 rounded">
            {explanation.summary}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-medium text-gray-600 mb-2">Route Factors</h3>
          <div className="space-y-1.5">
            {scores[0] && (
              <>
                <FactorRow label="Traffic" value={scores[0].traffic_score} />
                <FactorRow label="Road Quality" value={scores[0].road_quality_score} />
                <FactorRow label="Weather" value={scores[0].weather_score} />
                <FactorRow label="Constraints" value={scores[0].constraint_penalties} isPenalty />
              </>
            )}
          </div>
        </div>

        <div className="border-t pt-3">
          <h3 className="text-xs font-medium text-gray-600 mb-2">System Metrics</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-gray-600">
              <span className="block text-gray-400">Routes Evaluated</span>
              <span className="font-medium">{result.all_routes.length}</span>
            </div>
            <div className="text-gray-600">
              <span className="block text-gray-400">Best Score</span>
              <span className="font-medium">{best_route.total_score.toFixed(3)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FactorRow({ label, value, isPenalty = false }: { label: string; value: number; isPenalty?: boolean }) {
  const color = isPenalty ? 'bg-red-500' : value < 3 ? 'bg-green-500' : value < 6 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-600 w-24">{label}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-1">
        <div className={`h-1 rounded-full ${color}`} style={{ width: `${Math.min(value * 10, 100)}%` }} />
      </div>
      <span className="text-gray-500 w-8 text-right">{value.toFixed(1)}</span>
    </div>
  )
}

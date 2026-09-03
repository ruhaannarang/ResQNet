import { OptimizedResult, RouteScore } from '../types'

interface Props {
  result: OptimizedResult
}

export function RoutePanel({ result }: Props) {
  const { best_route, scores, explanation, all_routes } = result
  const bestScore = scores[0]

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60)
    const sec = Math.round(seconds % 60)
    return min > 0 ? `${min}m ${sec}s` : `${sec}s`
  }

  const scoreBar = (value: number, max: number, color: string) => (
    <div className="w-full bg-gray-200 rounded-full h-1.5">
      <div
        className={`h-1.5 rounded-full ${color}`}
        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      />
    </div>
  )

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-800 text-sm mb-2">Recommended Route</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono text-blue-600">#{best_route.route_id}</span>
            <span className="badge-high">Score: {best_route.total_score.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500 text-xs">Distance</span>
              <p className="font-medium">{best_route.total_distance_km.toFixed(1)} km</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">ETA</span>
              <p className="font-medium">{formatTime(best_route.total_duration_seconds)}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-800 text-sm mb-2">Score Breakdown</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">Time</span>
            <div className="w-32">{scoreBar(bestScore.time_score, 10, 'bg-blue-500')}</div>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">Traffic</span>
            <div className="w-32">{scoreBar(bestScore.traffic_score, 10, 'bg-orange-500')}</div>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">Road Quality</span>
            <div className="w-32">{scoreBar(bestScore.road_quality_score, 10, 'bg-green-500')}</div>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">Comfort</span>
            <div className="w-32">{scoreBar(bestScore.incident_comfort_score, 10, 'bg-purple-500')}</div>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">Vehicle Fit</span>
            <div className="w-32">{scoreBar(bestScore.vehicle_suitability_score, 10, 'bg-teal-500')}</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-800 text-sm mb-2">Why This Route?</h3>
        <div className="space-y-1.5">
          {explanation.reasons.map((reason, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="text-green-500 mt-0.5">&#10003;</span>
              <span className="text-gray-700">{reason}</span>
            </div>
          ))}
          {explanation.warnings.map((warn, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="text-yellow-500 mt-0.5">&#9888;</span>
              <span className="text-gray-600">{warn}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Confidence: {(explanation.confidence_score * 100).toFixed(0)}%
        </div>
      </div>

      {all_routes.length > 1 && (
        <div>
          <h3 className="font-semibold text-gray-800 text-sm mb-2">
            Alternative Routes ({all_routes.length - 1})
          </h3>
          <div className="space-y-2">
            {all_routes.slice(1).map((route, idx) => {
              const score = scores[idx + 1]
              return (
                <div key={route.route_id} className="bg-gray-50 rounded-lg p-2 text-xs border">
                  <div className="flex justify-between mb-1">
                    <span className="font-mono text-gray-500">#{route.route_id}</span>
                    <span className="text-gray-500">Score: {score?.total_score.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-3 text-gray-600">
                    <span>{route.total_distance_km.toFixed(1)} km</span>
                    <span>{formatTime(route.total_duration_seconds)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

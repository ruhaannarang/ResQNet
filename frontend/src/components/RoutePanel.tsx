import { OptimizedResult } from '../types'
import { Award, Clock3, Route, ShieldCheck, AlertTriangle, CheckCircle2, TrendingUp, ArrowUpRight, Gauge } from 'lucide-react'

interface Props {
  result: OptimizedResult
}

export function RoutePanel({ result }: Props) {
  const { best_route, scores, explanation, all_routes } = result
  const bestScore = scores[0]

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return m > 0 ? `${m}m ${s.toString().padStart(2,'0')}s` : `${s}s`
  }

  const scoreItems = [
    { label: 'Time Efficiency', value: bestScore.time_score, color: 'bg-slate-900' },
    { label: 'Traffic Flow', value: bestScore.traffic_score, color: 'bg-amber-500' },
    { label: 'Road Quality', value: bestScore.road_quality_score, color: 'bg-emerald-500' },
    { label: 'Patient Comfort', value: bestScore.incident_comfort_score, color: 'bg-violet-500' },
    { label: 'Vehicle Fit', value: bestScore.vehicle_suitability_score, color: 'bg-sky-500' },
  ]

  return (
    <div className="space-y-4">
      {/* Recommended header */}
      <div className="panel-card overflow-hidden">
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 grid place-items-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold tracking-widest uppercase text-white/80">Recommended Route</div>
              <div className="text-sm font-bold leading-none">Primary Dispatch — #{best_route.route_id.slice(0,8)}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] tracking-widest uppercase font-semibold text-white/60">Confidence</div>
            <div className="text-sm font-mono font-bold">{(explanation.confidence_score*100).toFixed(0)}%</div>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-slate-500"><Route className="w-3 h-3" /> Distance</div>
              <div className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">{best_route.total_distance_km.toFixed(2)}<span className="text-sm font-semibold text-slate-500 ml-1">km</span></div>
              <div className="text-xs text-slate-500 mt-0.5">{best_route.segments.length} segments</div>
            </div>
            <div className="bg-slate-900 text-white rounded-xl p-3 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
              <div className="relative">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-white/60"><Clock3 className="w-3 h-3" /> ETA</div>
                <div className="text-xl font-extrabold tracking-tight mt-1">{formatTime(best_route.total_duration_seconds)}</div>
                <div className="text-xs text-white/60 mt-0.5">OSRM live traffic</div>
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-emerald-700"><Gauge className="w-3 h-3" /> Score</div>
              <div className="text-xl font-extrabold tracking-tight text-emerald-800 mt-1">{best_route.total_score.toFixed(2)}</div>
              <div className="text-xs text-emerald-700/70 mt-0.5 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Best of {all_routes.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="panel-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-bold tracking-widest uppercase text-slate-900">Score Breakdown</h3>
          <span className="ml-auto text-xs font-mono text-slate-500">Total {bestScore.total_score.toFixed(2)}</span>
        </div>
        <div className="space-y-3">
          {scoreItems.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-600 w-28">{s.label}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${s.color} transition-all`} style={{ width: `${Math.min(s.value*10,100)}%` }} />
              </div>
              <span className="text-xs font-mono font-semibold text-slate-700 w-10 text-right">{s.value.toFixed(1)}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <span className="text-xs font-medium text-slate-600 w-28">Penalties</span>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(bestScore.constraint_penalties*10,100)}%` }} />
            </div>
            <span className="text-xs font-mono font-semibold text-red-600 w-10 text-right">{bestScore.constraint_penalties.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="panel-card p-4">
        <h3 className="text-xs font-bold tracking-widest uppercase text-slate-900 mb-3">Why This Route?</h3>
        <p className="text-sm leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3">
          {explanation.summary}
        </p>
        <div className="space-y-2">
          {explanation.reasons.map((r, i) => (
            <div key={i} className="flex gap-2.5 text-sm leading-snug">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span className="text-slate-700">{r}</span>
            </div>
          ))}
          {explanation.warnings.map((w, i) => (
            <div key={i} className="flex gap-2.5 text-sm leading-snug bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <span className="text-amber-900">{w}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alternatives */}
      {all_routes.length > 1 && (
        <div className="panel-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Route className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold tracking-widest uppercase text-slate-900">Alternative Routes</h3>
            <span className="ml-auto bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-full">{all_routes.length - 1} options</span>
          </div>
          <div className="space-y-2">
            {all_routes.slice(1).map((route, idx) => {
              const sc = scores[idx+1]
              return (
                <div key={route.route_id} className="group flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 grid place-items-center text-xs font-mono font-bold text-slate-600">
                    {idx+2}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-700">#{route.route_id.slice(0,8)}</span>
                      <span className="hidden sm:inline text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-600">{route.total_distance_km.toFixed(1)} km • {formatTime(route.total_duration_seconds)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[140px]">
                        <div className="h-full bg-slate-400" style={{ width: `${Math.min(((sc?.total_score||0)/ (bestScore.total_score||1))*100,100)}%` }} />
                      </div>
                      <span className="text-xs font-mono text-slate-500">{sc?.total_score.toFixed(2)}</span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

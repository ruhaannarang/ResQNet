import { OptimizedResult } from '../types'
import { Radio, Activity, Timer, Navigation2, ShieldAlert, BarChart3, Clock, Satellite, Zap, CheckCircle } from 'lucide-react'

interface Props {
  result: OptimizedResult | null
  isUsingCurrentLocation?: boolean
}

export function CommandCenter({ result, isUsingCurrentLocation }: Props) {
  if (!result) {
    return (
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white grid place-items-center"><Radio className="w-4 h-4" /></div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900">Command Center</h2>
            <p className="text-xs text-slate-500">Live telemetry • standby</p>
          </div>
          <span className="ml-auto w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        </div>

        <div className="panel-card p-4 bg-slate-50 border-dashed">
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 grid place-items-center mx-auto mb-3 shadow-sm"><Activity className="w-6 h-6 text-slate-400" /></div>
            <div className="text-sm font-semibold text-slate-700">Awaiting dispatch</div>
            <div className="text-xs text-slate-500 mt-1 leading-relaxed">Run an optimization to populate<br />telemetry, confidence & system health.</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-slate-500"><BarChart3 className="w-3.5 h-3.5" /> System Health</div>
          {[
            { k: 'OSRM Router', v: 'Operational', c: 'emerald' },
            { k: 'Feasibility Engine', v: 'Armed', c: 'emerald' },
            { k: 'Explanation Module', v: 'Ready', c: 'slate' },
            { k: 'Feedback Loop', v: 'Listening', c: 'slate' },
          ].map((row) => (
            <div key={row.k} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
              <span className="text-xs font-medium text-slate-600">{row.k}</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${row.c === 'emerald' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>{row.v}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-slate-900 text-white p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
          <div className="relative flex gap-3">
            <Satellite className="w-5 h-5 text-white/70 mt-0.5" />
            <div className="text-xs leading-relaxed text-white/80">
              <div className="font-semibold text-white">
                {isUsingCurrentLocation ? 'Live GPS Dispatch Sector' : 'Demo Dispatch Sector (Delhi)'}
              </div>
              {isUsingCurrentLocation
                ? 'Origin calibrated to your real-time GPS position.'
                : 'Demo sample area (Rajpath • Connaught • Karol Bagh). Click map or "Use Current Location" to relocate.'}
              <br />Avg. response target: &lt; 6 min
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { best_route, explanation, scores } = result
  const fmt = (s: number) => `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white grid place-items-center shadow-sm"><Radio className="w-4 h-4" /></div>
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900">Command Center</h2>
          <p className="text-xs text-emerald-700 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live • En Route</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-900 text-white px-2.5 py-1 rounded-full"><Zap className="w-3 h-3" /> Active</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-900 text-white p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-white/60"><Timer className="w-3 h-3" /> ETA</div>
            <div className="text-2xl font-extrabold tracking-tight mt-1">{fmt(best_route.total_duration_seconds)}<span className="text-sm font-semibold text-white/60 ml-1">min</span></div>
            <div className="text-xs text-white/60 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> OSRM live</div>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-slate-500"><Navigation2 className="w-3 h-3" /> Distance</div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-900 mt-1">{best_route.total_distance_km.toFixed(2)}<span className="text-sm font-semibold text-slate-500 ml-1">km</span></div>
          <div className="text-xs text-slate-500 mt-1">{best_route.segments.length} segments • avg {(best_route.total_distance_km/best_route.segments.length).toFixed(2)} km</div>
        </div>
      </div>

      <div className="panel-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold tracking-widest uppercase text-slate-700">Confidence Score</span>
          <span className="text-xs font-mono font-bold bg-slate-900 text-white px-2 py-1 rounded-full">{(explanation.confidence_score*100).toFixed(0)}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-slate-900 rounded-full transition-all" style={{ width: `${explanation.confidence_score*100}%` }} />
        </div>
        <div className="flex justify-between text-[11px] font-medium text-slate-500 mt-1.5">
          <span>Low</span><span>High reliability</span>
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-slate-600 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
          <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <span>{explanation.reasons[0] || 'Optimal corridor selected for minimal delay.'}</span>
        </div>
      </div>

      <div className="panel-card p-4">
        <h3 className="text-xs font-bold tracking-widest uppercase text-slate-900 mb-2 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-slate-500" /> Route Factors</h3>
        <div className="space-y-2.5">
          <Factor label="Traffic" value={scores[0].traffic_score} />
          <Factor label="Road Quality" value={scores[0].road_quality_score} />
          <Factor label="Weather" value={scores[0].weather_score} />
          <Factor label="Constraints" value={scores[0].constraint_penalties} isPenalty />
        </div>
      </div>

      <div className="panel-card p-4">
        <h3 className="text-xs font-bold tracking-widest uppercase text-slate-900 mb-3">Recommendation</h3>
        <p className="text-sm leading-relaxed text-slate-700">{explanation.summary}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            <div className="text-slate-500 font-medium uppercase tracking-wide text-[11px]">Evaluated</div>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{result.all_routes.length} routes</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            <div className="text-slate-500 font-medium uppercase tracking-wide text-[11px]">Best Score</div>
            <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{best_route.total_score.toFixed(3)}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-400 justify-center">
        <Satellite className="w-3.5 h-3.5" /> Synced • {new Date().toLocaleTimeString()} IST
      </div>
    </div>
  )
}

function Factor({ label, value, isPenalty = false }: { label: string; value: number; isPenalty?: boolean }) {
  const pct = Math.min(value * 10, 100)
  const color = isPenalty ? 'bg-red-500' : value < 3 ? 'bg-emerald-500' : value < 6 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-slate-600 w-24">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono font-semibold w-10 text-right text-slate-700">{value.toFixed(1)}</span>
    </div>
  )
}

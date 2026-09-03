import { OptimizedResult } from '../types'
import { LocationLabels } from '../utils/locationLabels'
import { Radio, Activity, Timer, Navigation2, ShieldAlert, Clock, Satellite, Zap, CheckCircle, AlertTriangle, Ban, Eye, MapPin, Route, ShieldCheck, Info } from 'lucide-react'

interface Props {
  result: OptimizedResult | null
  isUsingCurrentLocation?: boolean
  userCity?: string
  labels?: LocationLabels
}

export function CommandCenter({ result, isUsingCurrentLocation, userCity, labels }: Props) {
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

        <div className="panel-card p-3.5 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Staging Readiness</div>
          {[
            { k: labels?.origin || 'Origin Unit', v: 'Standby / Calibrated', c: 'emerald' },
            { k: 'Telemetry Link', v: 'Active (HTTP/2)', c: 'emerald' },
            { k: 'Routing Engine', v: 'OSRM Live Routing', c: 'emerald' },
          ].map((row) => (
            <div key={row.k} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
              <span className="text-slate-600 font-medium">{row.k}</span>
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
                {userCity ? `${userCity} Emergency Sector` : isUsingCurrentLocation ? 'Live GPS Dispatch Sector' : 'Local Dispatch Sector'}
              </div>
              <div>
                Route: <span className="font-semibold text-white">{labels?.origin || 'Origin'}</span> → <span className="font-semibold text-white">{labels?.destination || 'Destination'}</span>
              </div>
              <div className="text-slate-400 mt-0.5">
                Avg. response target: &lt; 6 min • Active incident corridor
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { best_route, explanation, scores, data_quality, provider, is_simulated, confidence } = result
  const fmt = (s: number) => `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`
  const overallConfidence = confidence ?? explanation.confidence_score

  const feasColor = best_route.feasibility === 'compatible' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : best_route.feasibility === 'risky' ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-red-50 text-red-700 border-red-300'
  const confColor = overallConfidence > 0.75 ? 'bg-emerald-600' : overallConfidence > 0.5 ? 'bg-amber-500' : 'bg-red-500'

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

      {is_simulated && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex gap-2">
          <Ban className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs text-red-800"><b>Simulated mode</b> — not real roads. Confidence {(overallConfidence*100).toFixed(0)}% (capped).</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-900 text-white p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-white/60"><Timer className="w-3 h-3" /> ETA</div>
            <div className="text-2xl font-extrabold tracking-tight mt-1">{fmt(best_route.total_duration_seconds)}<span className="text-sm font-semibold text-white/60 ml-1">min</span></div>
            <div className="text-xs text-white/60 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {provider} • {scores[0].eta_score?.toFixed(1) ?? scores[0].time_score.toFixed(1)}</div>
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
          <span className={`text-xs font-mono font-bold px-2 py-1 rounded-full border ${overallConfidence>0.75?'bg-emerald-50 text-emerald-700 border-emerald-200': overallConfidence>0.5?'bg-amber-50 text-amber-800 border-amber-200':'bg-red-50 text-red-700 border-red-200'}`}>{(overallConfidence*100).toFixed(0)}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${confColor}`} style={{ width: `${overallConfidence*100}%` }} />
        </div>
        <div className="flex justify-between text-[11px] font-medium text-slate-500 mt-1.5">
          <span>Low</span><span>High reliability</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
          <div className={`rounded-lg border p-2 text-center ${data_quality?.road_geometry==='provider' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            <div className="flex items-center justify-center gap-1 font-semibold"><MapPin className="w-3 h-3" /> Geometry</div>
            <div className="font-mono font-bold">{data_quality?.road_geometry || 'provider'}</div>
            <div>{((data_quality?.geometry_confidence||0.92)*100).toFixed(0)}%</div>
          </div>
          <div className={`rounded-lg border p-2 text-center ${data_quality?.traffic==='provider' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : data_quality?.traffic==='simulated' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            <div className="flex items-center justify-center gap-1 font-semibold"><Activity className="w-3 h-3" /> Traffic</div>
            <div className="font-mono font-bold">{data_quality?.traffic || 'estimated'}</div>
            <div>{((data_quality?.traffic_confidence||0.55)*100).toFixed(0)}%</div>
          </div>
          <div className={`rounded-lg border p-2 text-center ${data_quality?.weather==='provider' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : data_quality?.weather==='unavailable' ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            <div className="flex items-center justify-center gap-1 font-semibold"><Eye className="w-3 h-3" /> Weather</div>
            <div className="font-mono font-bold">{data_quality?.weather || 'estimated'}</div>
            <div>{((data_quality?.weather_confidence||0.5)*100).toFixed(0)}%</div>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-slate-600 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
          <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <span>{explanation.recommendation_reasons?.[0] || explanation.reasons[0] || 'Optimal corridor selected for minimal delay.'}</span>
        </div>
      </div>

      <div className="panel-card p-4">
        <h3 className="text-xs font-bold tracking-widest uppercase text-slate-900 mb-2 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-slate-500" /> Vehicle Compatibility</h3>
        <div className={`flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl border ${feasColor}`}>
          <ShieldCheck className="w-4 h-4" />
          <span className="capitalize">{best_route.feasibility}</span>
          <span className="ml-auto text-xs font-mono">Score {best_route.total_score.toFixed(2)}</span>
        </div>
        {best_route.warnings && best_route.warnings.length>0 && (
          <div className="mt-2 text-xs bg-amber-50 border border-amber-200 rounded-xl p-2">
            {best_route.warnings.slice(0,2).map((w,i)=><div key={i} className="flex gap-1.5"><AlertTriangle className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" /><span className="text-amber-900 leading-snug">{w}</span></div>)}
          </div>
        )}
        {best_route.feasibility_reasons && best_route.feasibility_reasons.length>0 && (
          <div className="mt-2 text-xs bg-red-50 border border-red-200 rounded-xl p-2">
            {best_route.feasibility_reasons.slice(0,2).map((r,i)=><div key={i} className="flex gap-1.5"><Ban className="w-3 h-3 text-red-600 mt-0.5 shrink-0" /><span className="text-red-800 leading-snug">{r}</span></div>)}
          </div>
        )}
        <div className="mt-3 space-y-2.5">
          <Factor label="Traffic" value={scores[0].traffic_score} source={data_quality?.traffic} />
          <Factor label="Road Quality" value={scores[0].road_quality_score} />
          <Factor label="Weather" value={scores[0].weather_score} source={data_quality?.weather} />
          <Factor label="Reliability" value={scores[0].reliability_score ?? scores[0].road_quality_score} />
        </div>
      </div>

      <div className="panel-card p-4">
        <h3 className="text-xs font-bold tracking-widest uppercase text-slate-900 mb-3">Recommendation</h3>
        <p className="text-sm leading-relaxed text-slate-700">{explanation.summary}</p>
        {explanation.tradeoffs && explanation.tradeoffs.length>0 && (
          <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            <div className="text-[11px] font-bold tracking-widest uppercase text-slate-600 mb-1 flex items-center gap-1"><Info className="w-3 h-3" /> Tradeoffs</div>
            <ul className="text-xs text-slate-600 list-disc pl-4 leading-relaxed">
              {explanation.tradeoffs.map((t,i)=><li key={i}>{t}</li>)}
            </ul>
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            <div className="text-slate-500 font-medium uppercase tracking-wide text-[11px] flex items-center gap-1"><Route className="w-3 h-3" /> Evaluated</div>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{result.all_routes.length} routes</div>
            <div className="text-[11px] text-slate-500">Provider {provider}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            <div className="text-slate-500 font-medium uppercase tracking-wide text-[11px]">Best Score</div>
            <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{best_route.total_score.toFixed(3)}</div>
            <div className="text-[11px] text-slate-500">Conf {(overallConfidence*100).toFixed(0)}%</div>
          </div>
        </div>
        {explanation.rejected_routes && explanation.rejected_routes.length>0 && (
          <div className="mt-3">
            <div className="text-[11px] font-bold tracking-widest uppercase text-red-700 mb-1 flex items-center gap-1"><Ban className="w-3 h-3" /> Rejected ({explanation.rejected_routes.length})</div>
            <div className="space-y-1">
              {explanation.rejected_routes.slice(0,2).map((r,i)=>(
                <div key={i} className="text-xs bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                  <div className="font-mono font-semibold text-red-700">#{r.route_id.slice(0,6)} • {r.feasibility}</div>
                  <div className="text-red-800 leading-snug truncate">{r.reason}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="panel-card p-3">
        <div className="text-[11px] font-bold tracking-widest uppercase text-slate-700 mb-1 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Rerouting Status</div>
        <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          Hysteresis thresholds: improve <b>{'>'}15%</b> • degrade <b>{'>'}12%</b> • min interval <b>60s</b>. Route auto-evaluates GPS, congestion, weather, feasibility. No constant switching.
        </div>
        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-2 justify-center">
          <Satellite className="w-3.5 h-3.5" /> Synced • {new Date().toLocaleTimeString()} IST • ID {result.request_id || result.best_route.route_id.slice(0,6)}
        </div>
      </div>
    </div>
  )
}

function Factor({ label, value, source, isPenalty = false }: { label: string; value: number; source?: string; isPenalty?: boolean }) {
  const pct = Math.min(value * 10, 100)
  const color = isPenalty ? 'bg-red-500' : value < 3 ? 'bg-emerald-500' : value < 6 ? 'bg-amber-500' : 'bg-red-500'
  const sourceColor = source === 'provider' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : source === 'estimated' ? 'bg-amber-50 text-amber-700 border-amber-200' : source === 'simulated' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200'
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-slate-600 w-24">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono font-semibold w-10 text-right text-slate-700">{value.toFixed(1)}</span>
      {source && <span className={`hidden sm:inline text-[10px] px-1.5 py-0.5 rounded-full border font-medium capitalize ${sourceColor}`}>{source}</span>}
    </div>
  )
}

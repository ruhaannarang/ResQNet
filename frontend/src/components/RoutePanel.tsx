import { OptimizedResult } from '../types'
import { Award, Clock3, Route, ShieldCheck, AlertTriangle, CheckCircle2, TrendingUp, ArrowUpRight, Gauge, Activity, Eye, Ban, Info, MapPin, Navigation } from 'lucide-react'

interface Props {
  result: OptimizedResult
}

export function RoutePanel({ result }: Props) {
  const { best_route, scores, explanation, all_routes, provider, is_simulated, data_quality, confidence } = result
  const bestScore = scores[0]

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return m > 0 ? `${m}m ${s.toString().padStart(2,'0')}s` : `${s}s`
  }

  const scoreItems = [
    { label: 'Time Efficiency', value: bestScore.time_score, color: 'bg-slate-900', note: 'ETA' },
    { label: 'Traffic Flow', value: bestScore.traffic_score, color: 'bg-amber-500', note: data_quality?.traffic || 'estimated' },
    { label: 'Road Quality', value: bestScore.road_quality_score, color: 'bg-emerald-500', note: 'surface' },
    { label: 'Patient Comfort', value: bestScore.incident_comfort_score, color: 'bg-violet-500', note: 'comfort' },
    { label: 'Vehicle Fit', value: bestScore.vehicle_suitability_score, color: 'bg-sky-500', note: best_route.feasibility || 'compatible' },
    { label: 'Weather Risk', value: bestScore.weather_score, color: 'bg-blue-600', note: data_quality?.weather || 'estimated' },
  ]

  const getFeasibilityBadge = (feasibility?: string) => {
    if (feasibility === 'compatible') return { label: 'Compatible', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' }
    if (feasibility === 'risky') return { label: 'Risky', cls: 'bg-amber-50 text-amber-800 border-amber-300', dot: 'bg-amber-500' }
    if (feasibility === 'impossible') return { label: 'Impossible', cls: 'bg-red-50 text-red-700 border-red-300', dot: 'bg-red-500' }
    return { label: 'Unknown', cls: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' }
  }

  const feas = getFeasibilityBadge(best_route.feasibility)

  const dqTrafficColor = data_quality?.traffic === 'provider' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : data_quality?.traffic === 'simulated' ? 'text-red-700 bg-red-50 border-red-200' : 'text-amber-700 bg-amber-50 border-amber-200'
  const dqWeatherColor = data_quality?.weather === 'provider' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : data_quality?.weather === 'unavailable' ? 'text-slate-600 bg-slate-100 border-slate-200' : 'text-amber-700 bg-amber-50 border-amber-200'
  const dqGeomColor = data_quality?.road_geometry === 'provider' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : data_quality?.road_geometry === 'simulated' ? 'text-red-700 bg-red-50 border-red-200' : 'text-amber-700 bg-amber-50 border-amber-200'

  return (
    <div className="space-y-4">
      {/* Simulated warning */}
      {is_simulated && (
        <div className="bg-red-50 border border-red-300 rounded-2xl p-3 flex gap-3">
          <Ban className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-red-800">Simulated Geometry — Demo Mode</div>
            <div className="text-xs text-red-700 leading-relaxed">These are NOT real roads. Enable real routing by keeping <span className="font-mono font-semibold">OSRM</span> reachable and <span className="font-mono">ALLOW_SIMULATED_ROUTES=false</span>. Confidence capped at 55%.</div>
          </div>
        </div>
      )}

      {/* Recommended header */}
      <div className="panel-card overflow-hidden">
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 grid place-items-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold tracking-widest uppercase text-white/80">Recommended Route</div>
              <div className="text-sm font-bold leading-none">Primary Dispatch — Route 1</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] tracking-widest uppercase font-semibold text-white/60">Confidence</div>
            <div className="text-sm font-mono font-bold">{(explanation.confidence_score*100).toFixed(0)}% • {(confidence ?? explanation.confidence_score*100).toFixed(0)}%</div>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-slate-500"><Route className="w-3 h-3" /> Distance</div>
              <div className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">{best_route.total_distance_km.toFixed(2)}<span className="text-sm font-semibold text-slate-500 ml-1">km</span></div>
              <div className="text-xs text-slate-500 mt-0.5">{best_route.segments.length} segments • {best_route.provider || provider || 'osrm'}</div>
            </div>
            <div className="bg-slate-900 text-white rounded-xl p-3 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
              <div className="relative">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-white/60"><Clock3 className="w-3 h-3" /> ETA</div>
                <div className="text-xl font-extrabold tracking-tight mt-1">{formatTime(best_route.total_duration_seconds)}</div>
                <div className="text-xs text-white/60 mt-0.5 flex items-center gap-1"><Activity className="w-3 h-3" /> Efficiency {bestScore.eta_score?.toFixed(1) ?? bestScore.time_score.toFixed(1)}</div>
              </div>
            </div>
            <div className={`rounded-xl p-3 border ${best_route.feasibility === 'compatible' ? 'bg-emerald-50 border-emerald-200' : best_route.feasibility === 'risky' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
              <div className={`flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase ${best_route.feasibility === 'compatible' ? 'text-emerald-700' : best_route.feasibility==='risky'?'text-amber-700':'text-red-700'}`}><ShieldCheck className="w-3 h-3" /> Vehicle</div>
              <div className={`text-sm font-extrabold tracking-tight mt-1 flex items-center gap-1.5 ${best_route.feasibility === 'compatible' ? 'text-emerald-800' : best_route.feasibility==='risky'?'text-amber-800':'text-red-800'}`}>
                <span className={`w-2 h-2 rounded-full ${feas.dot}`} /> {feas.label}
              </div>
              <div className="text-xs mt-0.5 truncate" style={{color: best_route.feasibility==='compatible'?'#065f46': best_route.feasibility==='risky'?'#92400e':'#991b1b'}}>
                Score {best_route.total_score.toFixed(2)} • Best of {all_routes.length}
              </div>
            </div>
          </div>

          {/* Data quality indicators */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className={`rounded-xl border px-2.5 py-2 text-xs ${dqGeomColor}`}>
              <div className="font-semibold tracking-wide uppercase text-[10px] opacity-70">Geometry</div>
              <div className="font-semibold capitalize flex items-center gap-1"><MapPin className="w-3 h-3" /> {data_quality?.road_geometry || 'provider'} • {(data_quality?.geometry_confidence ? (data_quality.geometry_confidence*100).toFixed(0)+'%' : '92%')}</div>
              <div className="text-[11px] opacity-80">{provider} {is_simulated?'simulated':'live'}</div>
            </div>
            <div className={`rounded-xl border px-2.5 py-2 text-xs ${dqTrafficColor}`}>
              <div className="font-semibold tracking-wide uppercase text-[10px] opacity-70">Traffic</div>
              <div className="font-semibold capitalize flex items-center gap-1"><Activity className="w-3 h-3" /> {data_quality?.traffic || 'estimated'}</div>
              <div className="text-[11px] opacity-80">{data_quality?.traffic_confidence ? (data_quality.traffic_confidence*100).toFixed(0)+'% conf' : bestScore.traffic_score <3 ? 'Low':'Moderate'}</div>
            </div>
            <div className={`rounded-xl border px-2.5 py-2 text-xs ${dqWeatherColor}`}>
              <div className="font-semibold tracking-wide uppercase text-[10px] opacity-70">Weather</div>
              <div className="font-semibold capitalize flex items-center gap-1"><Eye className="w-3 h-3" /> {data_quality?.weather || 'estimated'}</div>
              <div className="text-[11px] opacity-80">{data_quality?.weather_confidence ? (data_quality.weather_confidence*100).toFixed(0)+'% conf' : `Risk ${bestScore.weather_score.toFixed(1)}`}</div>
            </div>
          </div>

          {/* ETA comparison if alternatives */}
          {all_routes.length > 1 && (
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-[11px] font-bold tracking-widest uppercase text-slate-700 mb-2 flex items-center gap-1.5"><Clock3 className="w-3 h-3" /> ETA Comparison</div>
              <div className="space-y-1.5">
                {all_routes.map((r, i) => {
                  const s = scores[i]
                  const isBest = r.route_id === best_route.route_id
                  return (
                    <div key={r.route_id} className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border ${isBest ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold' : 'bg-white border-slate-200 text-slate-600'}`}>
                      <span className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold ${isBest ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{i+1}</span>
                      <span className="font-medium">Route {i+1}</span>
                      <span className="hidden sm:inline">• {r.total_distance_km.toFixed(1)}km</span>
                      <span className="ml-auto font-mono font-bold">{formatTime(r.total_duration_seconds)}</span>
                      <span className={`hidden sm:inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border ${r.feasibility==='compatible'?'bg-emerald-50 text-emerald-700 border-emerald-200': r.feasibility==='risky'?'bg-amber-50 text-amber-700 border-amber-200':'bg-red-50 text-red-700 border-red-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${r.feasibility==='compatible'?'bg-emerald-500':r.feasibility==='risky'?'bg-amber-500':'bg-red-500'}`}/>{r.feasibility}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">{s.total_score.toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Score breakdown */}
      <div className="panel-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-bold tracking-widest uppercase text-slate-900">Score Breakdown</h3>
          <span className="ml-auto text-xs font-mono text-slate-500">Total {bestScore.total_score.toFixed(2)} • Rel {bestScore.reliability_score?.toFixed(1) ?? '-'}</span>
        </div>
        <div className="space-y-3">
          {scoreItems.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-600 w-28">{s.label}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${s.color} transition-all`} style={{ width: `${Math.min(s.value*8,100)}%` }} />
              </div>
              <span className="text-xs font-mono font-semibold text-slate-700 w-10 text-right">{s.value.toFixed(1)}</span>
              <span className={`hidden sm:inline text-[10px] px-1.5 py-0.5 rounded-full border font-medium capitalize ${s.note==='provider' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : s.note==='estimated' ? 'bg-amber-50 text-amber-700 border-amber-200' : s.note==='compatible'? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{s.note}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <span className="text-xs font-medium text-slate-600 w-28">Penalties</span>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(bestScore.constraint_penalties*20,100)}%` }} />
            </div>
            <span className="text-xs font-mono font-semibold text-red-600 w-10 text-right">{bestScore.constraint_penalties.toFixed(1)}</span>
          </div>
        </div>
        {best_route.warnings && best_route.warnings.length>0 && (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-2.5">
            <div className="text-xs font-semibold text-amber-800 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Vehicle Warnings</div>
            <ul className="text-xs text-amber-900 leading-relaxed mt-1 list-disc pl-4">
              {best_route.warnings.map((w,i)=><li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Explanation */}
      <div className="panel-card p-4">
        <h3 className="text-xs font-bold tracking-widest uppercase text-slate-900 mb-3 flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-slate-400" /> Why This Route?</h3>
        <p className="text-sm leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3">
          {explanation.summary}
        </p>
        {explanation.recommendation_reasons && explanation.recommendation_reasons.length>0 && (
          <div className="mb-3">
            <div className="text-[11px] font-bold tracking-widest uppercase text-emerald-700 mb-2">Recommendation Reasons</div>
            <div className="space-y-2">
              {explanation.recommendation_reasons.map((r,i)=>(
                <div key={i} className="flex gap-2.5 text-sm leading-snug bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span className="text-emerald-900">{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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
        {explanation.tradeoffs && explanation.tradeoffs.length>0 && (
          <div className="mt-3">
            <div className="text-[11px] font-bold tracking-widest uppercase text-slate-600 mb-1">Tradeoffs</div>
            <ul className="text-xs text-slate-600 leading-relaxed list-disc pl-4">
              {explanation.tradeoffs.map((t,i)=><li key={i}>{t}</li>)}
            </ul>
          </div>
        )}
        {explanation.rejected_routes && explanation.rejected_routes.length>0 && (
          <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3">
            <div className="text-xs font-bold text-red-800 flex items-center gap-1"><Ban className="w-3.5 h-3.5" /> Rejected Routes</div>
            <div className="space-y-1.5 mt-2">
              {explanation.rejected_routes.map((rej, i)=>(
                <div key={i} className="text-xs bg-white border border-red-200 rounded-lg px-2.5 py-1.5">
                  <div className="font-semibold text-red-700">Route {all_routes.length + i + 1} • {rej.feasibility || 'rejected'}</div>
                  <div className="text-red-900 leading-snug">{rej.reason}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Alternatives with traffic + compatibility */}
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
              const trafficLevel = route.segments.reduce((acc,s)=>acc+s.traffic_level,0)/route.segments.length
              const trafficColor = trafficLevel <0.3 ? 'bg-emerald-500' : trafficLevel<0.6 ? 'bg-amber-500' : 'bg-red-500'
              const trafficLabel = trafficLevel <0.3 ? 'Low' : trafficLevel<0.6 ? 'Moderate' : 'High'
              return (
                <div key={route.route_id} className="group flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 grid place-items-center text-xs font-mono font-bold text-slate-600">
                    {idx+2}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-900">Route {idx+2}</span>
                      <span className="text-xs text-slate-600">{route.total_distance_km.toFixed(1)} km • {formatTime(route.total_duration_seconds)}</span>
                      <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border ${route.feasibility==='compatible'?'bg-emerald-50 text-emerald-700 border-emerald-200': route.feasibility==='risky'?'bg-amber-50 text-amber-700 border-amber-200':'bg-red-50 text-red-700 border-red-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${route.feasibility==='compatible'?'bg-emerald-500':route.feasibility==='risky'?'bg-amber-500':'bg-red-500'}`}/>{route.feasibility}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Navigation className="w-3 h-3 text-slate-400" />
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${trafficColor}`} style={{ width: `${trafficLevel*100}%` }} />
                        </div>
                        <span className="text-slate-500 font-medium">{trafficLabel}</span>
                      </div>
                      <span className="text-xs font-mono text-slate-500 ml-auto">{sc?.total_score.toFixed(2)}</span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Confidence footer */}
      <div className="panel-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold tracking-widest uppercase text-slate-700">Overall Confidence</span>
          <span className={`text-xs font-mono font-bold px-2 py-1 rounded-full border ${ (confidence ?? explanation.confidence_score) >0.75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (confidence ?? explanation.confidence_score) >0.5 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{((confidence ?? explanation.confidence_score)*100).toFixed(0)}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${ (confidence ?? explanation.confidence_score) >0.75 ? 'bg-emerald-600' : (confidence ?? explanation.confidence_score) >0.5 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${(confidence ?? explanation.confidence_score)*100}%` }} />
        </div>
        <div className="flex justify-between text-[11px] font-medium text-slate-500 mt-1.5">
          <span>Low</span><span>High reliability</span>
        </div>
        <div className="mt-3 text-xs leading-relaxed text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          Data quality: Geometry <b>{data_quality?.road_geometry}</b> ({((data_quality?.geometry_confidence||0)*100).toFixed(0)}%), Traffic <b>{data_quality?.traffic}</b> ({((data_quality?.traffic_confidence||0)*100).toFixed(0)}%), Weather <b>{data_quality?.weather}</b> ({((data_quality?.weather_confidence||0)*100).toFixed(0)}%). Provider: <b>{provider}</b>{is_simulated?' (simulated)':''}.
        </div>
      </div>
    </div>
  )
}

import { Shield, Route, Cpu, Database, Map, CloudSun, GitBranch, Layers, CheckCircle2, AlertTriangle, Clock, Truck, Activity } from 'lucide-react'

export function Architecture() {
  return (
    <div className="max-w-[1100px] mx-auto w-full px-4 lg:px-6 py-8 space-y-8">
      {/* Hero */}
      <div className="panel-card overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 grid place-items-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">ResQNet Architecture</h1>
              <p className="text-sm text-white/70 leading-relaxed mt-1 max-w-3xl">
                Production-grade emergency routing pipeline — only components that are actually used in this deployment are shown. No mock services, no placeholder integrations.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-1">Request → Response</div>
              <div className="font-mono text-xs leading-relaxed text-slate-700">
                EmergencyRequest<br />
                <span className="text-slate-400">↓</span> Provider (OSRM / Google / Mock)<br />
                <span className="text-slate-400">↓</span> Feasibility (hard)<br />
                <span className="text-slate-400">↓</span> Strategy scoring<br />
                <span className="text-slate-400">↓</span> Confidence + Explanation<br />
                <span className="text-slate-400">↓</span> Dashboard
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="text-[11px] font-bold tracking-widest uppercase text-emerald-700 mb-1">Live Data</div>
              <ul className="text-xs leading-relaxed text-emerald-900 space-y-1">
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" /> OSRM public — real OSM geometry (no key)</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" /> Google Directions — optional live traffic (key)</li>
                <li className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" /> Open-Meteo — live weather (no key)</li>
                <li className="flex gap-1.5 text-slate-600"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> Mock — only when ALLOW_SIMULATED_ROUTES=true</li>
              </ul>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-1">Guarantees</div>
              <ul className="text-xs leading-relaxed text-slate-700 space-y-1">
                <li>• No silently faked routes — simulated clearly marked</li>
                <li>• Every metric has source + confidence</li>
                <li>• Hard constraints → impossible / risky / compatible</li>
                <li>• Hysteresis prevents flapping reroutes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Frontend / Backend */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="panel-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white grid place-items-center"><Layers className="w-4 h-4" /></div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900">Frontend — Actually Used</h2>
            <span className="ml-auto text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full">React 18</span>
          </div>
          <div className="space-y-3 text-xs leading-relaxed">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="font-semibold text-slate-900">React + Vite + TypeScript</div>
                <div className="text-slate-500">SPA, proxy /api → :8000</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="font-semibold text-slate-900">Leaflet + react-leaflet</div>
                <div className="text-slate-500">OSM tiles, markers, polylines</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="font-semibold text-slate-900">Tailwind CSS</div>
                <div className="text-slate-500">Formal card system</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="font-semibold text-slate-900">Axios</div>
                <div className="text-slate-500">/routes/optimize, /providers/status</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="badge bg-slate-900 text-white">lucide-react</span>
              <span className="badge bg-white border border-slate-200 text-slate-600">leaflet 1.9.4</span>
            </div>
          </div>
        </div>

        <div className="panel-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white grid place-items-center"><Cpu className="w-4 h-4" /></div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900">Backend — Actually Used</h2>
            <span className="ml-auto text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full">FastAPI</span>
          </div>
          <div className="space-y-3 text-xs leading-relaxed">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="font-semibold text-slate-900">FastAPI + Uvicorn</div>
                <div className="text-slate-500">Python 3.12, Pydantic v2, httpx</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="font-semibold text-slate-900">Routing providers</div>
                <div className="text-slate-500">OSRM / Google / Mock (factory)</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="font-semibold text-slate-900">Weather</div>
                <div className="text-slate-500">Open-Meteo (no key)</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="font-semibold text-slate-900">Tests</div>
                <div className="text-slate-500">pytest 56, mocked OSRM</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="badge bg-slate-900 text-white">pydantic-settings</span>
              <span className="badge bg-white border border-slate-200 text-slate-600">python-dotenv</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="panel-card p-5">
        <h2 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2 mb-4"><Route className="w-4 h-4 text-slate-500" /> End-to-End Pipeline</h2>
        <div className="grid md:grid-cols-7 gap-2 text-xs">
          {[
            { title: 'Emergency', desc: 'Origin/dest, category, priority, subtype, vehicle', icon: Shield },
            { title: 'Provider', desc: 'OSRM real geometry; Google if key; Mock only if flag', icon: Map },
            { title: 'Weather', desc: 'Open-Meteo current + hourly, risk 0-10', icon: CloudSun },
            { title: 'Feasibility', desc: 'Width/height/paved/weight → impossible/risky/compatible', icon: Truck },
            { title: 'Scoring', desc: 'Strategy weights (cardiac/spinal/fire…) + turns/major/narrow', icon: Cpu },
            { title: 'Confidence', desc: 'Source+confidence per metric, provider blend', icon: Activity },
            { title: 'Explain', desc: 'ETA vs second, road/turns, rejected, tradeoffs', icon: GitBranch },
          ].map((step) => (
            <div key={step.title} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <step.icon className="w-4 h-4 text-slate-700 mb-1.5" />
              <div className="font-semibold text-slate-900">{step.title}</div>
              <div className="text-slate-500 leading-snug mt-1">{step.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-slate-900 text-white rounded-xl p-4 text-xs leading-relaxed">
          <div className="font-semibold mb-1">Scoring example — synthetic 3 routes A (14m heavy poor 10 turns) / B (16m low excellent 2) / C (20m moderate wide 90% major)</div>
          <div className="text-white/70">Cardiac (time 0.72) → A fastest wins despite heavy traffic. Spinal (road 0.28/comfort 0.30) → B wins even though 2m slower, fewer turns. Fire (vehicle 0.62) → C wins wide major despite longest ETA.</div>
        </div>
      </div>

      {/* Scoring detail */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="panel-card p-5">
          <h3 className="text-xs font-bold tracking-widest uppercase text-slate-700 mb-3 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> Strategy Weights (normalized)</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"><span className="font-medium">CARDIAC</span><span className="font-mono">time 0.72 / traffic 0.11 / road 0.03</span></div>
            <div className="flex justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"><span className="font-medium">SPINAL</span><span className="font-mono">road 0.28 / comfort 0.30 / time 0.20</span></div>
            <div className="flex justify-between bg-white border border-slate-200 rounded-lg px-3 py-2"><span className="font-medium">FIRE</span><span className="font-mono">vehicle 0.62 / time 0.11</span></div>
            <div className="flex justify-between bg-white border border-slate-200 rounded-lg px-3 py-2"><span className="font-medium">POLICE</span><span className="font-mono">time 0.68 / traffic 0.18</span></div>
            <div className="flex justify-between bg-white border border-slate-200 rounded-lg px-3 py-2"><span className="font-medium">DISASTER</span><span className="font-mono">vehicle 0.32 / road 0.24</span></div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">Turns: `turn_score = min(10, turns/segments*12)`; `major_road_score = (1-major%)*8`; spinal penalty `(1-quality)*10 + turn_factor*6`.</p>
        </div>
        <div className="panel-card p-5">
          <h3 className="text-xs font-bold tracking-widest uppercase text-slate-700 mb-3 flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> What’s NOT Used</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800"><AlertTriangle className="w-4 h-4" /> Mapbox / HERE / TomTom — defined in config but not wired; OSRM covers.</div>
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800"><AlertTriangle className="w-4 h-4" /> PostgreSQL/PostGIS models exist but routing is stateless (not persisted).</div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600"><Clock className="w-4 h-4" /> No ML — weighted scoring, not XGBoost (planned).</div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500">Env: `ROUTING_PROVIDER`, `OSRM_BASE_URL`, `ALLOW_SIMULATED_ROUTES`, `WEATHER_PROVIDER`, `REROUTE_*`. No paid key required for default run.</div>
        </div>
      </div>

      <div className="text-xs text-slate-500 text-center">
        Endpoints: <span className="font-mono font-medium text-slate-700">POST /api/v1/routes/optimize</span> • <span className="font-mono">GET /health</span> • <span className="font-mono">GET /providers/status</span> • Tiles © OpenStreetMap
      </div>
    </div>
  )
}

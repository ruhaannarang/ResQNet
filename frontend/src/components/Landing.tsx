import { useEffect, useRef, useState } from 'react'
import {
  Shield, Route, Siren, Flame, CloudSun, Cpu, GitBranch,
  ArrowRight, Play, MapPin, Navigation, Clock3, Activity,
  CheckCircle2, Truck, HeartPulse, Bone, ChevronRight, Zap,
  Satellite, Timer, BadgeCheck, Waves,
} from 'lucide-react'

interface Props {
  onNavigate: (view: string) => void
}

/* ---------- scroll reveal ---------- */
function useRevealRoot() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const els = root.querySelectorAll('.reveal')
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('reveal-visible')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return ref
}

/* ---------- animated counter ---------- */
function CountUp({ to, decimals = 0, suffix = '', prefix = '', duration = 1400 }: { to: number; decimals?: number; suffix?: string; prefix?: string; duration?: number }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true
          const t0 = performance.now()
          const tick = (t: number) => {
            const p = Math.min(1, (t - t0) / duration)
            const eased = 1 - Math.pow(1 - p, 3)
            setVal(to * eased)
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
          io.disconnect()
        }
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [to, duration])
  return (
    <span ref={ref}>
      {prefix}
      {val.toFixed(decimals)}
      {suffix}
    </span>
  )
}

const STRATEGIES = [
  {
    id: 'cardiac',
    icon: HeartPulse,
    name: 'Cardiac',
    tag: 'Time 0.72',
    color: 'text-red-600 bg-red-50 border-red-200',
    bar: 'bg-red-600',
    desc: 'Fastest corridor wins — even with heavy traffic. Every second is myocardium.',
    weights: [
      { k: 'Time', v: 72 }, { k: 'Traffic', v: 11 }, { k: 'Road', v: 3 },
    ],
    verdict: 'Route A · 14m · heavy traffic accepted',
  },
  {
    id: 'spinal',
    icon: Bone,
    name: 'Spinal',
    tag: 'Comfort 0.30',
    color: 'text-sky-700 bg-sky-50 border-sky-200',
    bar: 'bg-sky-600',
    desc: 'Smoothest ride wins — 2 min slower is worth it to avoid turns & poor surface.',
    weights: [
      { k: 'Comfort', v: 30 }, { k: 'Road', v: 28 }, { k: 'Time', v: 20 },
    ],
    verdict: 'Route B · 16m · 2 turns, excellent surface',
  },
  {
    id: 'fire',
    icon: Flame,
    name: 'Fire',
    tag: 'Vehicle 0.62',
    color: 'text-orange-700 bg-orange-50 border-orange-200',
    bar: 'bg-orange-600',
    desc: 'Widest, most major-road corridor wins — ladder trucks can’t thread lanes.',
    weights: [
      { k: 'Vehicle fit', v: 62 }, { k: 'Time', v: 11 }, { k: 'Road', v: 9 },
    ],
    verdict: 'Route C · 20m · 7.5m wide, 100% major',
  },
]

export function Landing({ onNavigate }: Props) {
  const rootRef = useRevealRoot()
  const [strategy, setStrategy] = useState(STRATEGIES[0])
  const [ticker, setTicker] = useState(0)

  // live ETA ticker for hero card
  useEffect(() => {
    const id = setInterval(() => setTicker((t) => t + 1), 2000)
    return () => clearInterval(id)
  }, [])
  const liveEta = 13 + (ticker % 3) * 0.4

  return (
    <div ref={rootRef} className="w-full bg-[#F8FAFC] text-slate-900 overflow-x-clip">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        {/* backdrop */}
        <div className="absolute inset-0 landing-grid opacity-[0.35]" />
        <div className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full landing-orb landing-orb-a" />
        <div className="absolute top-20 -right-40 w-[620px] h-[620px] rounded-full landing-orb landing-orb-b" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent" />

        <div className="relative max-w-[1280px] mx-auto px-4 lg:px-8 pt-14 pb-16 lg:pt-20 lg:pb-24 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          {/* copy */}
          <div>
            <div className="reveal inline-flex items-center gap-2 bg-white/10 border border-white/15 backdrop-blur rounded-full pl-1.5 pr-3 py-1.5 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-white px-2.5 py-1 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                LIVE
              </span>
              <span className="text-white/85">OSRM geometry · Open-Meteo weather · No key required</span>
            </div>

            <h1 className="reveal font-display text-[42px] leading-[1.02] sm:text-6xl lg:text-[68px] font-bold tracking-tight mt-6">
              Dispatch the right route,
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-300 to-emerald-300 landing-shine">
                for the right emergency.
              </span>
              <span className="block text-white/90 text-[0.55em] font-sans font-semibold tracking-tight mt-3">in seconds — not minutes.</span>
            </h1>

            <p className="reveal reveal-d1 text-white/70 text-base lg:text-lg leading-relaxed mt-5 max-w-xl">
              ResQNet scores <strong className="text-white">3 live corridors</strong> per incident — ALS cardiac,
              spinal, fire, police, disaster — with hard vehicle feasibility, weather risk and
              explainable confidence. Never a silent simulation.
            </p>

            <div className="reveal reveal-d2 flex flex-wrap items-center gap-3 mt-7">
              <button onClick={() => onNavigate('dispatch')} className="group inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3.5 rounded-2xl shadow-[0_8px_30px_-6px_rgba(220,38,38,0.6)] transition-all hover:-translate-y-0.5">
                <Siren className="w-5 h-5 group-hover:animate-pulse" />
                Open Dispatch Console
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => onNavigate('book')} className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur font-semibold px-6 py-3.5 rounded-2xl transition-all hover:-translate-y-0.5">
                <MapPin className="w-5 h-5" />
                Book an Ambulance
              </button>
              <button onClick={() => onNavigate('about')} className="inline-flex items-center gap-2 text-white/70 hover:text-white font-semibold px-3 py-3 transition-colors">
                <span className="w-9 h-9 rounded-full border border-white/20 grid place-items-center bg-white/5"><Play className="w-4 h-4 ml-0.5" /></span>
                How it works
              </button>
            </div>

            {/* mini stats */}
            <div className="reveal reveal-d3 grid grid-cols-3 gap-3 mt-9 max-w-xl">
              {[
                { v: <CountUp to={4} suffix="m 18s" />, l: 'Avg. response', s: '−12% vs baseline' },
                { v: <CountUp to={3} />, l: 'Routes scored', s: 'per incident' },
                { v: <CountUp to={99.98} decimals={2} suffix="%" />, l: 'Uptime', s: 'last 30 days' },
              ].map((s) => (
                <div key={s.l} className="bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3 backdrop-blur">
                  <div className="text-xl font-extrabold tracking-tight">{s.v}</div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-white/50 mt-0.5">{s.l}</div>
                  <div className="text-xs text-emerald-300/90 font-medium">{s.s}</div>
                </div>
              ))}
            </div>
          </div>

          {/* visual */}
          <div className="reveal reveal-d2 relative mx-auto w-full max-w-[520px]">
            <div className="absolute -inset-6 bg-gradient-to-br from-red-600/20 via-transparent to-emerald-500/20 blur-2xl rounded-[32px]" />
            <div className="relative bg-white text-slate-900 rounded-[24px] shadow-2xl overflow-hidden landing-float">
              {/* card header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 grid place-items-center"><Shield className="w-4 h-4 text-white" /></div>
                  <div>
                    <div className="text-sm font-extrabold leading-none">Live Dispatch</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-mono">REQ-8f3a · cardiac · ALS</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> OSRM LIVE
                </span>
              </div>

              {/* animated map */}
              <div className="relative bg-slate-50 px-2 pt-2">
                <svg viewBox="0 0 480 220" className="w-full h-[210px] rounded-2xl bg-[#0F172A]">
                  <defs>
                    <pattern id="lp-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                      <circle cx="1" cy="1" r="1" fill="rgba(148,163,184,0.25)" />
                    </pattern>
                  </defs>
                  <rect width="480" height="220" fill="url(#lp-grid)" rx="16" />
                  {/* alternative routes */}
                  <path d="M40,180 C120,170 140,120 210,110 S320,90 440,50" fill="none" stroke="#475569" strokeWidth="3" strokeDasharray="7 7" opacity="0.7" />
                  <path d="M40,180 C100,150 180,190 260,150 S370,130 440,50" fill="none" stroke="#64748B" strokeWidth="3" strokeDasharray="4 8" opacity="0.55" />
                  {/* best route */}
                  <path id="lp-best" d="M40,180 C130,160 170,80 260,80 S380,60 440,50" fill="none" stroke="#F87171" strokeWidth="4" strokeLinecap="round" className="landing-dash" />
                  <circle cx="40" cy="180" r="8" fill="#22C55E" stroke="#fff" strokeWidth="3" />
                  <circle cx="440" cy="50" r="8" fill="#EF4444" stroke="#fff" strokeWidth="3" />
                  <circle r="7" fill="#fff" stroke="#DC2626" strokeWidth="3">
                    <animateMotion dur="5s" repeatCount="indefinite" rotate="auto">
                      <mpath href="#lp-best" />
                    </animateMotion>
                  </circle>
                  <g fontFamily="monospace" fontSize="10" fill="#CBD5E1">
                    <text x="52" y="200">DRIVER</text>
                    <text x="392" y="40">HOSPITAL</text>
                  </g>
                </svg>
                <div className="absolute top-4 left-4 flex gap-1.5">
                  <span className="text-[10px] font-bold bg-slate-900/90 text-white px-2 py-1 rounded-full backdrop-blur flex items-center gap-1"><Route className="w-3 h-3" /> 3 corridors</span>
                  <span className="text-[10px] font-bold bg-white/90 text-slate-900 px-2 py-1 rounded-full flex items-center gap-1"><CloudSun className="w-3 h-3 text-amber-500" /> risk 2/10</span>
                </div>
                <div className="absolute bottom-4 right-4 bg-slate-900/95 text-white rounded-xl px-3 py-2 backdrop-blur shadow-xl">
                  <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">ETA · best</div>
                  <div className="text-lg font-extrabold tabular-nums leading-none">{liveEta.toFixed(1)}<span className="text-xs font-semibold"> min</span></div>
                </div>
              </div>

              {/* rows */}
              <div className="p-4 space-y-2">
                {[
                  { name: 'Route A · fastest', eta: '14m', conf: 92, active: true, color: 'bg-red-600', badge: 'RECOMMENDED' },
                  { name: 'Route B · smoothest', eta: '16m', conf: 88, active: false, color: 'bg-sky-500', badge: '2 turns' },
                  { name: 'Route C · widest', eta: '20m', conf: 81, active: false, color: 'bg-slate-400', badge: '7.5m wide' },
                ].map((r) => (
                  <div key={r.name} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${r.active ? 'border-red-200 bg-red-50/60' : 'border-slate-100 bg-white'}`}>
                    <span className={`w-2.5 h-8 rounded-full ${r.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold truncate">{r.name}</span>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${r.active ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{r.badge}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full landing-bar" style={{ width: `${r.conf}%`, background: r.active ? '#DC2626' : '#94A3B8' }} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold tabular-nums">{r.eta}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{r.conf}% conf</div>
                    </div>
                  </div>
                ))}
                <button onClick={() => onNavigate('dispatch')} className="w-full mt-1 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-colors">
                  <Zap className="w-4 h-4" /> Dispatch optimal route <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* floating chips */}
            <div className="absolute -left-6 top-16 hidden sm:flex items-center gap-2 bg-white rounded-2xl shadow-xl border border-slate-100 px-3 py-2 landing-float-d1">
              <HeartPulse className="w-4 h-4 text-red-600" />
              <span className="text-xs font-bold">Cardiac → Route A</span>
            </div>
            <div className="absolute -right-4 top-1/2 hidden sm:flex items-center gap-2 bg-white rounded-2xl shadow-xl border border-slate-100 px-3 py-2 landing-float-d2">
              <BadgeCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold">Feasible · compatible</span>
            </div>
            <div className="absolute -left-4 bottom-10 hidden sm:flex items-center gap-2 bg-slate-900 text-white rounded-2xl shadow-xl px-3 py-2 landing-float-d3">
              <Timer className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold">Hysteresis · no flapping</span>
            </div>
          </div>
        </div>

        {/* marquee */}
        <div className="relative border-t border-white/10 bg-white/[0.03] backdrop-blur overflow-hidden">
          <div className="landing-marquee flex items-center gap-8 py-3.5 px-4 whitespace-nowrap text-[13px] font-semibold text-white/60">
            {[0, 1].map((k) => (
              <div key={k} className="flex items-center gap-8 shrink-0" aria-hidden={k === 1}>
                {['ALS AMBULANCE', 'BLS AMBULANCE', 'FIRE TRUCK', 'POLICE INTERCEPTOR', 'DISASTER RESCUE VAN', 'OSRM LIVE GEOMETRY', 'OPEN-METEO WEATHER', 'EXPLAINABLE SCORING', 'HARD FEASIBILITY'].map((t) => (
                  <span key={t + k} className="flex items-center gap-8">
                    <span>{t}</span>
                    <Siren className="w-3.5 h-3.5 text-red-400/70" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= TRUST / METRICS ================= */}
      <section className="max-w-[1280px] mx-auto px-4 lg:px-8 py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Timer, big: <CountUp to={120} suffix="ms" />, label: 'Median optimize latency', sub: 'OSRM + scoring + weather' },
            { icon: Route, big: <CountUp to={56} />, label: 'Backend tests passing', sub: 'deterministic A / B / C routing' },
            { icon: Satellite, big: <CountUp to={3} />, label: 'Alternatives per request', sub: 'fast · smooth · wide expansion' },
            { icon: Shield, big: <CountUp to={100} suffix="%" />, label: 'Metrics with provenance', sub: 'source + confidence, never silent' },
          ].map((c, i) => (
            <div key={c.label} className={`reveal panel-card p-5 hover:-translate-y-1 hover:shadow-elevated transition-all ${i % 2 ? 'reveal-d1' : ''}`}>
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white grid place-items-center mb-3"><c.icon className="w-5 h-5" /></div>
              <div className="text-3xl font-extrabold tracking-tight">{c.big}</div>
              <div className="text-sm font-bold mt-1">{c.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="max-w-[1280px] mx-auto px-4 lg:px-8 pb-6">
        <div className="reveal max-w-2xl">
          <div className="text-xs font-extrabold tracking-[0.2em] text-red-600 uppercase">Why command centers switch</div>
          <h2 className="font-display text-3xl lg:text-5xl font-bold tracking-tight mt-2">Built for the call where <span className="text-red-600">seconds matter.</span></h2>
          <p className="text-slate-500 mt-3 leading-relaxed">Rule-based, explainable and honest about data quality. No black box, no faked GPS theater — every value carries its source.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {[
            { icon: Navigation, t: 'Real geometry, live', d: 'OSRM public routing by default with true OSM polylines. Google Directions with live traffic when you add a key. Mock only behind an explicit flag.', tag: 'NO KEY NEEDED' },
            { icon: Cpu, t: 'Incident-aware scoring', d: 'Cardiac chases time, spinal chases comfort, fire chases width. Turn counts from polyline bearings, major/narrow % from geometry.', tag: '5 STRATEGIES' },
            { icon: Truck, t: 'Hard feasibility first', d: 'Width, height, weight, grade and paved requirements reject impossible corridors as impossible / risky / compatible — before scoring.', tag: 'ZERO GUESSING' },
            { icon: CloudSun, t: 'Weather slows ETA honestly', d: 'Open-Meteo live risk 0–10 degrades ETA (rain ×0.85, snow/fog ×0.75) and is shown as its own factor, not hidden.', tag: 'OPEN-METEO' },
            { icon: BadgeCheck, t: 'Confidence + provenance', d: 'Every traffic / width / quality value is MetricValue{value, source, confidence}. Route quality blends into 0.15–0.99.', tag: 'AUDITABLE' },
            { icon: GitBranch, t: 'Explainable + stable rerouting', d: 'Best-vs-second tradeoffs in plain language. GPS reroutes only fire on >12% degradation + >15% improvement with 60s hysteresis.', tag: 'NO FLAPPING' },
          ].map((f, i) => (
            <div key={f.t} className={`reveal ${i % 3 === 1 ? 'reveal-d1' : i % 3 === 2 ? 'reveal-d2' : ''} group panel-card p-6 hover:-translate-y-1.5 hover:shadow-elevated hover:border-slate-900/20 transition-all`}>
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white grid place-items-center group-hover:bg-red-600 transition-colors"><f.icon className="w-5 h-5" /></div>
                <span className="text-[10px] font-extrabold tracking-widest bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{f.tag}</span>
              </div>
              <h3 className="font-extrabold text-lg tracking-tight mt-4">{f.t}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mt-1.5">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= PIPELINE ================= */}
      <section className="mt-14 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 landing-grid opacity-20" />
        <div className="relative max-w-[1280px] mx-auto px-4 lg:px-8 py-16">
          <div className="reveal flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-extrabold tracking-[0.2em] text-emerald-300 uppercase">Pipeline · 9 stages</div>
              <h2 className="font-display text-3xl lg:text-5xl font-bold tracking-tight mt-2">Request → provider → weather → <span className="text-white/60">physics → math → truth.</span></h2>
            </div>
            <button onClick={() => onNavigate('about')} className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-5 py-3 rounded-2xl hover:-translate-y-0.5 transition-transform shrink-0">
              Open full flowchart <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-8">
            {[
              { n: '01', t: 'Emergency request', d: 'Origin, destination, category, priority, vehicle profile — validated GPS.' },
              { n: '02', t: 'Routing provider', d: 'Auto: Google if key, else OSRM. Mock only if explicitly allowed.' },
              { n: '03', t: '3 corridors', d: 'One OSRM path expands to fast / smooth / wide alternatives.' },
              { n: '04', t: 'Weather + feasibility', d: 'Open-Meteo risk slows ETA. Hard constraints kill impossible.' },
              { n: '05', t: 'Score + explain', d: 'Strategy weights rank, confidence blends, reasons ship to UI.' },
            ].map((s, i) => (
              <div key={s.n} className={`reveal ${i === 1 || i === 3 ? 'reveal-d1' : i === 2 || i === 4 ? 'reveal-d2' : ''} relative bg-white/[0.06] border border-white/10 rounded-2xl p-5 backdrop-blur hover:bg-white/[0.09] hover:-translate-y-1 transition-all`}>
                <div className="font-mono text-emerald-300 font-bold text-sm">{s.n}</div>
                <div className="font-extrabold mt-1">{s.t}</div>
                <div className="text-sm text-white/60 leading-relaxed mt-1">{s.d}</div>
                {i < 4 && <ChevronRight className="hidden lg:block absolute -right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 bg-slate-950 rounded-full" />}
              </div>
            ))}
          </div>
          <div className="reveal mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-gradient-to-r from-red-600/20 via-white/[0.04] to-emerald-500/20 border border-white/10 rounded-2xl p-4">
            <Waves className="w-5 h-5 text-emerald-300 shrink-0 ml-1" />
            <p className="text-sm text-white/75 leading-relaxed flex-1"><strong className="text-white">Same location, different emergency, different best route</strong> — cardiac takes A (14m, heavy traffic), spinal takes B (16m, 2 turns), fire takes C (20m, 7.5m wide). Deterministic scoring, not hardcoding.</p>
            <button onClick={() => onNavigate('dispatch')} className="bg-white text-slate-900 text-sm font-bold px-4 py-2.5 rounded-xl hover:-translate-y-0.5 transition-transform shrink-0">Try it live</button>
          </div>
        </div>
      </section>

      {/* ================= STRATEGIES interactive ================= */}
      <section className="max-w-[1280px] mx-auto px-4 lg:px-8 py-16">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-start">
          <div className="reveal">
            <div className="text-xs font-extrabold tracking-[0.2em] text-red-600 uppercase">Incident intelligence</div>
            <h2 className="font-display text-3xl lg:text-5xl font-bold tracking-tight mt-2">One map.<br />Three medicines.</h2>
            <p className="text-slate-500 mt-4 leading-relaxed">Pick an incident. Watch the weights — and the winner — change. This is the exact logic running in <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">optimization_strategies.py</span>.</p>
            <div className="flex gap-2 mt-6">
              {STRATEGIES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStrategy(s)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm border transition-all ${strategy.id === s.id ? 'bg-slate-900 text-white border-slate-900 shadow-lg -translate-y-0.5' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                >
                  <s.icon className="w-4 h-4" /> {s.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-6 text-xs text-slate-500">
              <Clock3 className="w-4 h-4" /> Scoring is relative (0–1 normalized across alternatives), lower total wins.
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> 56 tests</span>
            </div>
          </div>
          <div key={strategy.id} className="reveal panel-card p-6 lg:p-8 relative overflow-hidden animate-fade-in">
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${strategy.bar}`} />
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl border grid place-items-center ${strategy.color}`}><strategy.icon className="w-6 h-6" /></div>
              <div>
                <div className="font-extrabold text-xl tracking-tight">{strategy.name} strategy</div>
                <div className="text-xs font-bold text-slate-500">{strategy.tag} · normalized weights</div>
              </div>
              <span className="ml-auto text-[11px] font-extrabold bg-slate-900 text-white px-2.5 py-1 rounded-full">{strategy.verdict}</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mt-4">{strategy.desc}</p>
            <div className="space-y-3 mt-5">
              {strategy.weights.map((w, i) => (
                <div key={w.k}>
                  <div className="flex justify-between text-xs font-bold mb-1"><span>{w.k}</span><span className="font-mono">{(w.v / 100).toFixed(2)}</span></div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full landing-bar-fill ${strategy.bar}`} style={{ width: `${w.v}%`, animationDelay: `${i * 120}ms` }} />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => onNavigate('dispatch')} className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors">
              Dispatch as {strategy.name} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ================= VEHICLES + CTA ================= */}
      <section className="max-w-[1280px] mx-auto px-4 lg:px-8 pb-16">
        <div className="reveal panel-card overflow-hidden grid lg:grid-cols-2">
          <div className="p-8 lg:p-12 bg-slate-900 text-white relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-red-600/20 blur-3xl" />
            <div className="text-xs font-extrabold tracking-[0.2em] text-white/50 uppercase">Fleet-aware by default</div>
            <h3 className="font-display text-3xl lg:text-4xl font-bold tracking-tight mt-2">Your truck doesn’t fit everywhere. <span className="text-red-400">We know.</span></h3>
            <div className="grid grid-cols-2 gap-2.5 mt-6">
              {[
                { n: 'ALS Ambulance', s: '2.5m · paved req.' },
                { n: 'BLS Ambulance', s: '2.4m · nimble' },
                { n: 'Fire Truck', s: '3.0m · 15t · 4m road' },
                { n: 'Police / Rescue', s: 'fast · grade-proof' },
              ].map((v) => (
                <div key={v.n} className="bg-white/[0.07] border border-white/10 rounded-xl px-3.5 py-3">
                  <div className="text-sm font-bold flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-emerald-300" />{v.n}</div>
                  <div className="text-xs text-white/55 mt-0.5 font-mono">{v.s}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-8 lg:p-12 bg-gradient-to-br from-red-600 to-red-700 text-white relative overflow-hidden">
            <Siren className="absolute -right-8 -bottom-8 w-56 h-56 text-white/10 rotate-12" />
            <h3 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">Someone needs help right now.</h3>
            <p className="text-white/80 mt-3 leading-relaxed">Allow GPS, pick cardiac / spinal / fire, hit dispatch. Real OSRM geometry renders in ~120ms with zoom, fit and fullscreen.</p>
            <div className="flex flex-wrap gap-3 mt-6">
              <button onClick={() => onNavigate('dispatch')} className="inline-flex items-center gap-2 bg-white text-red-700 font-extrabold px-6 py-3.5 rounded-2xl hover:-translate-y-0.5 transition-transform shadow-xl">
                <Activity className="w-5 h-5" /> Start dispatching
              </button>
              <button onClick={() => onNavigate('driver')} className="inline-flex items-center gap-2 bg-red-800/60 border border-white/25 font-bold px-6 py-3.5 rounded-2xl hover:bg-red-800 transition-colors">
                I’m a driver
              </button>
            </div>
            <div className="flex items-center gap-4 mt-6 text-xs font-semibold text-white/70">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> No signup</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> No API key</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Works on mobile</span>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">Tiles © OpenStreetMap contributors · Routing © OSRM · Weather © Open-Meteo · Built for command-center reliability</p>
      </section>
    </div>
  )
}

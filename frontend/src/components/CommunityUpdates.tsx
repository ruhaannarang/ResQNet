import { useEffect, useMemo, useState } from 'react'
import {
  Megaphone, Construction, AlertTriangle, Droplets, CarFront, Siren,
  MapPin, ThumbsUp, Search, Plus, X, CheckCircle2, Clock3, User,
} from 'lucide-react'
import { CommunityUpdate } from '../types'
import { communityService } from '../services/community'

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'construction', label: 'Construction' },
  { id: 'roadblock', label: 'Roadblock' },
  { id: 'accident', label: 'Accident' },
  { id: 'flooding', label: 'Flooding' },
  { id: 'pothole', label: 'Pothole' },
  { id: 'traffic', label: 'Traffic' },
  { id: 'other', label: 'Other' },
]

const CATEGORY_ICON: Record<string, any> = {
  construction: Construction,
  roadblock: Siren,
  accident: CarFront,
  flooding: Droplets,
  pothole: AlertTriangle,
  traffic: Clock3,
  other: Megaphone,
}

function timeAgo(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  } catch (_) {
    return 'recently'
  }
}

function severityStyle(sev: string) {
  const s = (sev || '').toLowerCase()
  if (s === 'high') return 'bg-red-50 text-red-700 border-red-200'
  if (s === 'medium') return 'bg-amber-50 text-amber-800 border-amber-200'
  return 'bg-emerald-50 text-emerald-700 border-emerald-200'
}

const EMPTY_FORM = {
  road_name: '',
  category: 'construction',
  title: '',
  description: '',
  severity: 'medium',
  area: '',
  reporter_name: '',
}

export function CommunityUpdates({ userCity }: { userCity?: string }) {
  const [updates, setUpdates] = useState<CommunityUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [voted, setVoted] = useState<Set<string>>(new Set())

  useEffect(() => {
    let alive = true
    setLoading(true)
    communityService.list().then((items) => {
      if (alive) { setUpdates(items); setLoading(false) }
    })
    return () => { alive = false }
  }, [])

  const filtered = useMemo(() => {
    return updates.filter((u) => {
      if (filter !== 'all' && u.category !== filter) return false
      if (query) {
        const q = query.toLowerCase()
        return (
          u.title.toLowerCase().includes(q) ||
          u.road_name.toLowerCase().includes(q) ||
          (u.area || '').toLowerCase().includes(q) ||
          (u.description || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [updates, filter, query])

  const handleUpvote = async (id: string) => {
    if (voted.has(id)) return
    setVoted((prev) => new Set(prev).add(id))
    setUpdates((prev) => prev.map((u) => (u.id === id ? { ...u, upvotes: u.upvotes + 1 } : u)))
    await communityService.upvote(id)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.road_name.trim() || !form.title.trim()) {
      setToast('Please add a road name and a short title.')
      return
    }
    setSubmitting(true)
    try {
      const created = await communityService.create({
        ...form,
        road_name: form.road_name.trim(),
        title: form.title.trim(),
        area: form.area.trim() || userCity || '',
        reporter_name: form.reporter_name.trim() || 'Anonymous',
      })
      setUpdates((prev) => [created, ...prev])
      setForm(EMPTY_FORM)
      setShowForm(false)
      setToast('Thanks! Your update is now live on the dashboard feed.')
    } finally {
      setSubmitting(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  return (
    <div className="max-w-[1100px] mx-auto w-full px-4 lg:px-6 py-8 space-y-6">
      {/* Hero */}
      <div className="panel-card overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 grid place-items-center shrink-0">
              <Megaphone className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight">Community Updates</h1>
              <p className="text-sm text-white/70 leading-relaxed mt-1 max-w-3xl">
                Local reports from people on the ground — road construction, closures, waterlogging,
                potholes. Dispatchers see these live on the dashboard feed.
              </p>
            </div>
            <button onClick={() => setShowForm((v) => !v)} className="hidden sm:inline-flex items-center gap-1.5 bg-white text-slate-900 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-100 shrink-0">
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? 'Close' : 'Report update'}
            </button>
          </div>
        </div>
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-white">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search road, area, e.g. Marathahalli, flooding…"
              className="input-field pl-10"
            />
          </div>
          <button onClick={() => setShowForm((v) => !v)} className="sm:hidden btn-primary">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Close' : 'Report update'}
          </button>
        </div>
        {toast && (
          <div className="mx-6 mb-4 flex items-center gap-2 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {toast}
          </div>
        )}
      </div>

      {/* Report form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="panel-card p-6 animate-fade-in">
          <h2 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2 mb-1">
            <span className="w-1.5 h-7 rounded-full bg-red-600" /> Report a road update
          </h2>
          <p className="text-xs text-slate-500 mb-4">Share what you see — it appears instantly on the command-center dashboard.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label-formal">Headline *</label>
              <input className="input-field" placeholder="e.g. Metro work — one lane closed near bridge" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} />
            </div>
            <div>
              <label className="label-formal">Road / landmark *</label>
              <input className="input-field" placeholder="e.g. Outer Ring Road, Marathahalli" value={form.road_name} onChange={(e) => setForm({ ...form, road_name: e.target.value })} maxLength={200} />
            </div>
            <div>
              <label className="label-formal">Area / locality</label>
              <input className="input-field" placeholder={userCity || 'e.g. Whitefield, Bengaluru'} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} maxLength={200} />
            </div>
            <div>
              <label className="label-formal">Category</label>
              <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-formal">Severity</label>
              <select className="input-field" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                <option value="low">Low — minor inconvenience</option>
                <option value="medium">Medium — expect delays</option>
                <option value="high">High — avoid / blocked</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label-formal">Details</label>
              <textarea className="input-field min-h-[90px] resize-y" placeholder="Which lane, how long, alternate route, best time to avoid…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} />
            </div>
            <div>
              <label className="label-formal">Your name (optional)</label>
              <input className="input-field" placeholder="Anonymous" value={form.reporter_name} onChange={(e) => setForm({ ...form, reporter_name: e.target.value })} maxLength={100} />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={submitting} className="btn-danger w-full">
                {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Megaphone className="w-4 h-4" />}
                {submitting ? 'Publishing…' : 'Publish update'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${filter === c.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
          >
            {c.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500 self-center">{filtered.length} report{filtered.length === 1 ? '' : 's'}</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="panel-card p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-2/3" />
              <div className="h-3 bg-slate-100 rounded w-1/2 mt-2" />
              <div className="h-3 bg-slate-100 rounded w-full mt-3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel-card p-10 text-center">
          <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
          <div className="text-sm font-semibold text-slate-700 mt-3">No reports match</div>
          <div className="text-xs text-slate-500 mt-1">Try a different filter — or be the first to report this.</div>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4 mx-auto"><Plus className="w-4 h-4" /> Report update</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((u) => {
            const Icon = CATEGORY_ICON[u.category] || Megaphone
            return (
              <article key={u.id} className="panel-card p-5 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white grid place-items-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 leading-snug">{u.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" /> {u.road_name}{u.area ? ` • ${u.area}` : ''}
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-1 rounded-full border capitalize shrink-0 ${severityStyle(u.severity)}`}>{u.severity}</span>
                </div>
                {u.description && <p className="text-[13px] leading-relaxed text-slate-600">{u.description}</p>}
                <div className="flex items-center gap-2 mt-auto pt-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded-full capitalize">{u.category}</span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1"><User className="w-3 h-3" /> {u.reporter_name || 'Anonymous'}</span>
                  <span className="text-[11px] text-slate-400 ml-auto">{timeAgo(u.created_at)}</span>
                  <button
                    onClick={() => handleUpvote(u.id)}
                    disabled={voted.has(u.id)}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-colors ${voted.has(u.id) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                    title="Confirm this report"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" /> {u.upvotes}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

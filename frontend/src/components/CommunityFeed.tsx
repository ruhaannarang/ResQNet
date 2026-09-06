import { useEffect, useState } from 'react'
import { Megaphone, Construction, AlertTriangle, Droplets, CarFront, Siren, ThumbsUp, MapPin, ArrowRight, Clock3 } from 'lucide-react'
import { CommunityUpdate } from '../types'
import { communityService } from '../services/community'

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

function severityDot(sev: string) {
  const s = (sev || '').toLowerCase()
  if (s === 'high') return 'bg-red-500'
  if (s === 'medium') return 'bg-amber-500'
  return 'bg-emerald-500'
}

export function CommunityFeed({ onViewAll, limit = 4 }: { onViewAll?: () => void; limit?: number }) {
  const [updates, setUpdates] = useState<CommunityUpdate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    communityService.list().then((items) => {
      if (alive) { setUpdates(items.slice(0, limit)); setLoading(false) }
    })
    const t = setInterval(() => {
      communityService.list().then((items) => {
        if (alive) setUpdates(items.slice(0, limit))
      })
    }, 30000)
    return () => { alive = false; clearInterval(t) }
  }, [limit])

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white grid place-items-center">
          <Megaphone className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold tracking-tight text-slate-900">Community Updates</h3>
          <p className="text-xs text-slate-500">Local road reports • live</p>
        </div>
        {onViewAll && (
          <button onClick={onViewAll} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-full">
            View all <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3 animate-pulse">
              <div className="h-3.5 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2 mt-2" />
            </div>
          ))}
        </div>
      ) : updates.length === 0 ? (
        <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-center">
          No community reports yet. Be the first to post one.
        </div>
      ) : (
        <div className="space-y-2">
          {updates.map((u) => {
            const Icon = CATEGORY_ICON[u.category] || Megaphone
            return (
              <div key={u.id} className="bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3 transition-colors">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 grid place-items-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-slate-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityDot(u.severity)}`} />
                      <span className="text-[13px] font-semibold text-slate-900 leading-snug truncate">{u.title}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{u.road_name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full capitalize">{u.category}</span>
                      <span className="text-[11px] text-slate-400">{timeAgo(u.created_at)}</span>
                      <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                        <ThumbsUp className="w-3 h-3" /> {u.upvotes}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {onViewAll && updates.length > 0 && (
        <button onClick={onViewAll} className="w-full mt-3 text-xs font-semibold text-slate-700 bg-slate-900 text-white rounded-xl py-2.5 hover:bg-slate-800 transition-colors">
          Open Community Portal
        </button>
      )}
    </div>
  )
}

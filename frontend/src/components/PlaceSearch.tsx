import { useEffect, useRef, useState } from 'react'
import { Search, MapPin, X, Loader2 } from 'lucide-react'
import { GPSPosition } from '../types'

interface Props {
  label: string
  placeholder?: string
  /** Optional point to bias results around (e.g. user's city/sector). */
  bias?: GPSPosition
  onSelect: (pos: GPSPosition, displayName: string) => void
}

interface Suggestion {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

const shortName = (d: string) => d.split(',').slice(0, 3).join(',').trim()

/** OpenStreetMap place search (no key). Typing ≥3 chars shows a suggestion dropdown. */
export function PlaceSearch({ label, placeholder, bias, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([])
      setOpen(false)
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        let url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query.trim())}`
        if (bias) {
          url += `&viewbox=${bias.longitude - 0.5},${bias.latitude + 0.25},${bias.longitude + 0.5},${bias.latitude - 0.25}`
        }
        const res = await fetch(url)
        const data = await res.json()
        if (Array.isArray(data)) {
          setResults(data)
          setOpen(true)
        }
      } catch (_) {
      } finally {
        setSearching(false)
      }
    }, 450)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = (s: Suggestion) => {
    const pos = { latitude: Number(s.lat), longitude: Number(s.lon) }
    if (!isFinite(pos.latitude) || !isFinite(pos.longitude)) return
    onSelect(pos, s.display_name)
    setQuery(shortName(s.display_name))
    setOpen(false)
  }

  return (
    <div ref={boxRef} className="relative">
      <label className="label-formal">{label}</label>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results.length > 0) {
              e.preventDefault()
              pick(results[0])
            }
            if (e.key === 'Escape') setOpen(false)
          }}
          placeholder={placeholder || 'Search place, hospital, landmark…'}
          className="input-field pl-10 pr-9"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {searching ? (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); setOpen(false) }}
              className="grid place-items-center text-slate-400 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </span>
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-[1002] left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-elevated overflow-hidden max-h-56 overflow-y-auto">
          {results.map((r) => (
            <li key={r.place_id}>
              <button
                type="button"
                onClick={() => pick(r)}
                className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <span className="text-[13px] leading-snug text-slate-700">{shortName(r.display_name)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !searching && query.trim().length >= 3 && results.length === 0 && (
        <div className="absolute z-[1002] left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-elevated px-3 py-2.5 text-xs text-slate-500">
          No places found — try a nearby landmark.
        </div>
      )}
      <div className="text-[10px] text-slate-400 mt-1">Search by OpenStreetMap</div>
    </div>
  )
}

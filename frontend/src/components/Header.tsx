import { Shield, Activity, Radio, Bell, HelpCircle, ChevronDown, Search } from 'lucide-react'

interface Props {
  activeView: string
  onViewChange: (v: string) => void
  isUsingCurrentLocation?: boolean
}

export function Header({ activeView: _activeView, onViewChange, isUsingCurrentLocation }: Props) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Top bar */}
      <div className="h-[64px] flex items-center justify-between px-4 lg:px-6 gap-4">
        {/* Brand */}
        <div className="flex items-center gap-5 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
              <Shield className="w-5 h-5 text-white relative z-10" strokeWidth={2.2} />
              <span className="absolute text-[7px] font-extrabold text-white z-10 mt-[2px]">+</span>
            </div>
            <div className="leading-none">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[18px] font-extrabold tracking-tight text-slate-900">ResQNet</span>
                <span className="hidden sm:inline text-[10px] font-semibold tracking-[0.14em] uppercase text-slate-400 border border-slate-200 rounded-md px-1.5 py-0.5 bg-slate-50">Command</span>
              </div>
              <div className="text-[11px] font-medium tracking-wide text-slate-500 -mt-0.5">Emergency Routing Platform</div>
            </div>
          </div>

          <div className="hidden lg:block h-8 w-px bg-slate-200" />

          <nav className="hidden lg:flex items-center gap-1">
            <button className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold shadow-sm">Dispatch</button>
            <button onClick={() => onViewChange('fleet')} className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">Fleet Overview</button>
            <button onClick={() => onViewChange('analytics')} className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">Analytics</button>
            <button className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-400 cursor-not-allowed flex items-center gap-1.5">Logs <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold">Soon</span></button>
          </nav>
        </div>

        {/* Center search - hidden on mobile */}
        <div className="hidden xl:flex items-center flex-1 max-w-[360px] mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input placeholder="Search incidents, vehicles, routes…" className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-900/[0.04] transition-all" />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 hidden lg:inline-flex text-[11px] font-medium text-slate-400 border border-slate-200 bg-white rounded-md px-1.5 py-1">⌘ K</span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-800 tracking-wide">Operational</span>
            <span className="hidden lg:inline text-xs text-emerald-600">• OSRM Live</span>
          </div>

          <div className="hidden sm:flex items-center gap-1">
            <button className="w-9 h-9 grid place-items-center rounded-xl hover:bg-slate-50 text-slate-600 transition-colors relative">
              <Radio className="w-[18px] h-[18px]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <button className="w-9 h-9 grid place-items-center rounded-xl hover:bg-slate-50 text-slate-600 transition-colors relative">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 grid place-items-center bg-slate-900 text-white text-[10px] font-bold rounded-full">3</span>
            </button>
            <button className="w-9 h-9 grid place-items-center rounded-xl hover:bg-slate-50 text-slate-600 transition-colors">
              <HelpCircle className="w-[18px] h-[18px]" />
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2.5 pl-1">
            <div className="hidden sm:block text-right leading-none">
              <div className="text-sm font-semibold text-slate-900 flex items-center gap-1 justify-end">Command Unit <ChevronDown className="w-3.5 h-3.5 text-slate-400" /></div>
              <div className="text-xs text-slate-500">
                {isUsingCurrentLocation ? 'Live GPS Dispatch' : 'Sector ND • Demo Dispatch'}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white grid place-items-center text-sm font-bold shadow-sm">JD</div>
          </div>
        </div>
      </div>

      {/* Sub header / breadcrumb + status */}
      <div className="h-8 bg-slate-50/80 border-t border-slate-100 backdrop-blur flex items-center justify-between px-4 lg:px-6 text-xs">
        <div className="flex items-center gap-2 text-slate-500">
          <span className="hidden sm:inline font-medium">Operations</span>
          <span className="hidden sm:inline text-slate-300">/</span>
          <span className="font-medium text-slate-700">Active Dispatch</span>
          <span className="text-slate-300">›</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-900">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            {isUsingCurrentLocation ? 'Live GPS Sector' : 'Delhi Demo Sector (Fallback)'}
          </span>
          <span className="hidden md:inline-flex ml-2 items-center gap-1.5 bg-white border border-slate-200 rounded-full px-2.5 py-1 shadow-sm">
            <span className={`w-1.5 h-1.5 rounded-full ${isUsingCurrentLocation ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {isUsingCurrentLocation ? 'Live Coordinates Active' : 'Default Demo Coordinates'}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-3 text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-900" /> OSRM Public • No API Key</span>
          <span className="text-slate-300">|</span>
          <span>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST</span>
        </div>
      </div>
    </header>
  )
}

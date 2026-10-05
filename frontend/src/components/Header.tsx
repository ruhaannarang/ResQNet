import { Shield, Activity, Layers, Megaphone, CalendarPlus, Truck, Home } from 'lucide-react'

interface Props {
  activeView: string
  onViewChange: (v: string) => void
  isUsingCurrentLocation?: boolean
  userCity?: string
}

export function Header({ activeView, onViewChange, isUsingCurrentLocation, userCity }: Props) {
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

          <div className="hidden sm:block h-8 w-px bg-slate-200" />

          <nav className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => onViewChange('home')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${activeView === 'home' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Home className="w-4 h-4" /> Home
            </button>
            <button
              onClick={() => onViewChange('dispatch')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${activeView === 'dispatch' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              Dispatch
            </button>
            <button
              onClick={() => onViewChange('book')}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${activeView === 'book' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <CalendarPlus className="w-4 h-4" /> Book Service
            </button>
            <button
              onClick={() => onViewChange('driver')}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${activeView === 'driver' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Truck className="w-4 h-4" /> Driver
            </button>
            <button
              onClick={() => onViewChange('community')}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${activeView === 'community' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Megaphone className="w-4 h-4" /> Community Updates
            </button>
            <button
              onClick={() => onViewChange('about')}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${activeView === 'about' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Layers className="w-4 h-4" /> About
            </button>
          </nav>
        </div>

        {/* Right — minimal */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-800 tracking-wide">Operational</span>
            <span className="hidden lg:inline text-xs text-emerald-600">• OSRM Live</span>
          </div>
        </div>
      </div>

      {/* Sub header / breadcrumb + status */}
      <div className="h-8 bg-slate-50/80 border-t border-slate-100 backdrop-blur flex items-center justify-between px-4 lg:px-6 text-xs">
        <div className="flex items-center gap-2 text-slate-500">
          <span className="hidden sm:inline font-medium">Operations</span>
          <span className="hidden sm:inline text-slate-300">/</span>
          <span className="font-medium text-slate-700">{activeView === 'home' ? 'Home' : activeView === 'about' ? 'About' : activeView === 'community' ? 'Community Updates' : activeView === 'book' ? 'Book Service' : activeView === 'driver' ? 'Driver Portal' : 'Active Dispatch'}</span>
          <span className="text-slate-300">›</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-900">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            {activeView === 'home' ? 'Emergency routing, explained' : activeView === 'about' ? 'Service Flow & Stack' : activeView === 'community' ? 'Local Road Reports' : activeView === 'book' ? 'Request emergency help' : activeView === 'driver' ? 'Incoming bookings' : userCity ? `${userCity} Sector` : isUsingCurrentLocation ? 'Live GPS Sector' : 'Local Sector'}
          </span>
          {activeView === 'dispatch' && (
            <span className="hidden md:inline-flex ml-2 items-center gap-1.5 bg-white border border-slate-200 rounded-full px-2.5 py-1 shadow-sm">
              <span className={`w-1.5 h-1.5 rounded-full ${isUsingCurrentLocation ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {isUsingCurrentLocation ? 'Live Location Active' : 'Calibrated Sector'}
            </span>
          )}
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

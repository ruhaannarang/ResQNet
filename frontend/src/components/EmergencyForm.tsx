import { useState } from 'react'
import {
  EmergencyRequest, EmergencyCategory, EmergencyPriority,
  MedicalSubType, VehicleClass, GPSPosition
} from '../types'
import { LocationLabels } from '../utils/locationLabels'
import { Activity, Truck, MapPinned, Users, FileText, Navigation, Crosshair, AlertTriangle, Siren, Flame, ShieldCheck, Biohazard, Clock3, Stethoscope } from 'lucide-react'

interface Props {
  onSubmit: (request: EmergencyRequest) => void
  loading: boolean
  origin: GPSPosition
  destination: GPSPosition
  onUseCurrentLocation?: () => void
  isLocating?: boolean
  isUsingCurrentLocation?: boolean
  category: EmergencyCategory
  onCategoryChange: (category: EmergencyCategory) => void
  vehicleClass: VehicleClass
  onVehicleClassChange: (vehicle: VehicleClass) => void
  labels: LocationLabels
}

const CATEGORY_META: Record<EmergencyCategory, { label: string; icon: any; accent: string }> = {
  medical: { label: 'Medical', icon: Stethoscope, accent: 'text-red-600 bg-red-50 border-red-200' },
  fire: { label: 'Fire', icon: Flame, accent: 'text-orange-600 bg-orange-50 border-orange-200' },
  police: { label: 'Police', icon: ShieldCheck, accent: 'text-blue-600 bg-blue-50 border-blue-200' },
  disaster: { label: 'Disaster', icon: Biohazard, accent: 'text-amber-700 bg-amber-50 border-amber-200' },
}

const PRIORITY_META: Record<EmergencyPriority, { label: string; dot: string; ring: string }> = {
  low: { label: 'Low', dot: 'bg-slate-400', ring: 'ring-slate-200' },
  medium: { label: 'Medium', dot: 'bg-amber-500', ring: 'ring-amber-200' },
  high: { label: 'High', dot: 'bg-orange-500', ring: 'ring-orange-200' },
  critical: { label: 'Critical', dot: 'bg-red-600', ring: 'ring-red-200' },
}

export function EmergencyForm({
  onSubmit,
  loading,
  origin,
  destination,
  onUseCurrentLocation,
  isLocating,
  isUsingCurrentLocation,
  category,
  onCategoryChange,
  vehicleClass,
  onVehicleClassChange,
  labels,
}: Props) {
  const [priority, setPriority] = useState<EmergencyPriority>('high')
  const [medicalSubtype, setMedicalSubtype] = useState<MedicalSubType>('cardiac')
  const [description, setDescription] = useState('')
  const [numPatients, setNumPatients] = useState(1)

  const handleCategorySelect = (cat: EmergencyCategory) => {
    onCategoryChange(cat)
    if (cat === 'medical' && !vehicleClass.startsWith('ambulance')) {
      onVehicleClassChange('ambulance_als')
    } else if (cat === 'fire') {
      onVehicleClassChange('fire_truck')
    } else if (cat === 'police') {
      onVehicleClassChange('police_car')
    } else if (cat === 'disaster') {
      onVehicleClassChange('rescue_van')
    }
  }

  const handleVehicleSelect = (vc: VehicleClass) => {
    onVehicleClassChange(vc)
    if (vc === 'fire_truck') {
      onCategoryChange('fire')
    } else if (vc === 'police_car') {
      onCategoryChange('police')
    } else if (vc === 'rescue_van') {
      onCategoryChange('disaster')
    } else if (vc.startsWith('ambulance')) {
      onCategoryChange('medical')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      origin,
      destination,
      incident: {
        category,
        priority,
        medical_subtype: category === 'medical' ? medicalSubtype : undefined,
        description,
        num_patients: numPatients,
        requires_special_equipment: priority === 'critical',
      },
      vehicle: {
        vehicle_class: vehicleClass,
        max_width_meters: vehicleClass === 'fire_truck' ? 3.0 : 2.5,
        max_height_meters: vehicleClass === 'fire_truck' ? 3.5 : 2.8,
        max_weight_tons: vehicleClass === 'fire_truck' ? 15 : 5,
        can_handle_steep_grades: vehicleClass !== 'ambulance_bls',
        min_road_width_meters: vehicleClass === 'fire_truck' ? 4.0 : 3.0,
        requires_paved_road: vehicleClass === 'ambulance_als',
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Incident Profile */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-slate-900 text-white grid place-items-center">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-bold tracking-widest uppercase text-slate-900">Incident Profile</h3>
          <span className="ml-auto text-[11px] font-medium text-slate-400">Step 01</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label-formal">Category</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(CATEGORY_META) as EmergencyCategory[]).map((cat) => {
                const meta = CATEGORY_META[cat]
                const Icon = meta.icon
                const active = category === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={`relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-xs font-semibold transition-all ${active ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-500'}`} />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-formal flex items-center gap-1"><Clock3 className="w-3 h-3" /> Priority</label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as EmergencyPriority)}
                  className="input-field pr-8 appearance-none font-medium"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${PRIORITY_META[priority].dot} ring-4 ${PRIORITY_META[priority].ring}`} />
              </div>
            </div>
            <div>
              <label className="label-formal flex items-center gap-1"><Users className="w-3 h-3" /> Patients</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setNumPatients(Math.max(1, numPatients - 1))} className="w-9 h-[42px] grid place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700">−</button>
                <div className="flex-1 h-[42px] grid place-items-center rounded-xl border border-slate-200 bg-slate-50 font-mono text-sm font-semibold text-slate-900">{numPatients}</div>
                <button type="button" onClick={() => setNumPatients(Math.min(10, numPatients + 1))} className="w-9 h-[42px] grid place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700">+</button>
              </div>
            </div>
          </div>

          {category === 'medical' && (
            <div className="animate-fade-in">
              <label className="label-formal">Medical Subtype</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['cardiac','spinal','ventilator','maternity','trauma','general'] as MedicalSubType[]).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setMedicalSubtype(sub)}
                    className={`px-2 py-2 rounded-xl border text-xs font-medium capitalize transition-colors ${medicalSubtype === sub ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Vehicle */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 grid place-items-center">
            <Truck className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-bold tracking-widest uppercase text-slate-900">Vehicle Assignment</h3>
          <span className="ml-auto text-[11px] font-medium text-slate-400">Step 02</span>
        </div>
        <label className="label-formal">Assigned Unit</label>
        <div className="relative">
          <select
            value={vehicleClass}
            onChange={(e) => handleVehicleSelect(e.target.value as VehicleClass)}
            className="input-field pr-9 font-medium"
          >
            <option value="ambulance_als">Ambulance — ALS (Advanced)</option>
            <option value="ambulance_bls">Ambulance — BLS (Basic)</option>
            <option value="fire_truck">Fire Truck — Heavy Rescue</option>
            <option value="police_car">Police Interceptor</option>
            <option value="rescue_van">Rescue Van — Multi-role</option>
          </select>
          <Truck className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2">
            <div className="text-slate-500 font-medium uppercase tracking-wide">Width</div>
            <div className="font-mono font-semibold text-slate-900">{vehicleClass === 'fire_truck' ? '3.0 m' : '2.5 m'}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2">
            <div className="text-slate-500 font-medium uppercase tracking-wide">Weight</div>
            <div className="font-mono font-semibold text-slate-900">{vehicleClass === 'fire_truck' ? '15.0 t' : '5.0 t'}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2">
            <div className="text-slate-500 font-medium uppercase tracking-wide">Roads</div>
            <div className="font-semibold text-slate-900">Paved {vehicleClass === 'ambulance_als' ? 'Req.' : 'Opt.'}</div>
          </div>
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Coordinates */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 grid place-items-center">
            <MapPinned className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-bold tracking-widest uppercase text-slate-900">Routing Coordinates</h3>
          <span className="ml-auto text-[11px] font-medium text-slate-400">Step 03</span>
        </div>

        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-emerald-800 mb-1 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{labels.origin}</span>
              </div>
              <div className="font-mono text-xs font-medium text-slate-900 leading-tight">{origin.latitude.toFixed(5)}, {origin.longitude.toFixed(5)}</div>
              {isUsingCurrentLocation && <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase bg-emerald-600 text-white px-1.5 py-0.5 rounded-full"><Navigation className="w-3 h-3" /> GPS Live</span>}
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-red-800 mb-1 truncate">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="truncate">{labels.destination}</span>
              </div>
              <div className="font-mono text-xs font-medium text-slate-900 leading-tight">{destination.latitude.toFixed(5)}, {destination.longitude.toFixed(5)}</div>
            </div>
          </div>

          {onUseCurrentLocation && (
            <button
              type="button"
              onClick={onUseCurrentLocation}
              disabled={isLocating}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 disabled:opacity-50 transition-colors"
            >
              <Crosshair className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
              {isLocating ? 'Acquiring GPS fix…' : `Set ${labels.originShort} to My Location`}
            </button>
          )}
          <p className="text-[11px] leading-relaxed text-slate-500 flex gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Click the map to set points. Green = {labels.origin}, Red = {labels.destination}.
          </p>
        </div>
      </div>

      <div>
        <label className="label-formal flex items-center gap-1"><FileText className="w-3 h-3" /> Incident Notes — Optional</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-field min-h-[72px] resize-none"
          rows={2}
          placeholder="e.g., Cardiac arrest, 3rd floor, elevator unavailable, narrow lane access…"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full btn-danger py-3.5 text-[14px] shadow-elevated relative overflow-hidden group disabled:opacity-60"
      >
        <span className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative flex items-center justify-center gap-2">
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Computing Optimal Route…
            </>
          ) : (
            <>
              <Siren className="w-4 h-4" />
              Dispatch Optimal Route
              <span className="hidden sm:inline-flex ml-1 text-white/80 font-medium">↗</span>
            </>
          )}
        </span>
      </button>
      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> OSRM Live Routing Engine • No simulation
      </div>
    </form>
  )
}

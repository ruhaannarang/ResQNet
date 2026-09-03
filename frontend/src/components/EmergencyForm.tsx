import { useState } from 'react'
import {
  EmergencyRequest, EmergencyCategory, EmergencyPriority,
  MedicalSubType, VehicleClass, GPSPosition
} from '../types'

interface Props {
  onSubmit: (request: EmergencyRequest) => void
  loading: boolean
  origin: GPSPosition
  destination: GPSPosition
}

export function EmergencyForm({ onSubmit, loading, origin, destination }: Props) {
  const [category, setCategory] = useState<EmergencyCategory>('medical')
  const [priority, setPriority] = useState<EmergencyPriority>('high')
  const [medicalSubtype, setMedicalSubtype] = useState<MedicalSubType>('cardiac')
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>('ambulance_als')
  const [description, setDescription] = useState('')
  const [numPatients, setNumPatients] = useState(1)

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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as EmergencyCategory)}
            className="input-field text-sm"
          >
            <option value="medical">Medical</option>
            <option value="fire">Fire</option>
            <option value="police">Police</option>
            <option value="disaster">Disaster</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as EmergencyPriority)}
            className="input-field text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {category === 'medical' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Medical Subtype</label>
          <select
            value={medicalSubtype}
            onChange={(e) => setMedicalSubtype(e.target.value as MedicalSubType)}
            className="input-field text-sm"
          >
            <option value="cardiac">Cardiac</option>
            <option value="spinal">Spinal Injury</option>
            <option value="ventilator">Ventilator</option>
            <option value="maternity">Maternity</option>
            <option value="trauma">Trauma</option>
            <option value="general">General</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle</label>
        <select
          value={vehicleClass}
          onChange={(e) => setVehicleClass(e.target.value as VehicleClass)}
          className="input-field text-sm"
        >
          <option value="ambulance_als">Ambulance (ALS)</option>
          <option value="ambulance_bls">Ambulance (BLS)</option>
          <option value="fire_truck">Fire Truck</option>
          <option value="police_car">Police Car</option>
          <option value="rescue_van">Rescue Van</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Patients</label>
          <input
            type="number"
            min={1}
            max={10}
            value={numPatients}
            onChange={(e) => setNumPatients(parseInt(e.target.value))}
            className="input-field text-sm"
          />
        </div>
        <div className="flex items-end">
          <div className="text-xs text-gray-500">
            <div>Origin: {origin.latitude.toFixed(4)}, {origin.longitude.toFixed(4)}</div>
            <div>Dest: {destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)}</div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-field text-sm"
          rows={2}
          placeholder="Additional details..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Computing Optimal Route...
          </span>
        ) : (
          'Dispatch Emergency Route'
        )}
      </button>
    </form>
  )
}

import { EmergencyCategory, VehicleClass } from '../types'

export interface LocationLabels {
  origin: string
  destination: string
  originShort: string
  destinationShort: string
  originDescription: string
  destinationDescription: string
}

export function getLocationLabels(category: EmergencyCategory, vehicleClass: VehicleClass): LocationLabels {
  if (category === 'fire' || vehicleClass === 'fire_truck') {
    return {
      origin: 'Place of Fire Brigade',
      destination: 'Place of Emergency',
      originShort: 'Fire Brigade',
      destinationShort: 'Emergency',
      originDescription: 'Fire Brigade station / origin dispatch point',
      destinationDescription: 'Emergency incident / fire scene destination',
    }
  }

  if (category === 'police' || vehicleClass === 'police_car') {
    return {
      origin: 'Place of Police Unit',
      destination: 'Place of Emergency',
      originShort: 'Police Unit',
      destinationShort: 'Emergency',
      originDescription: 'Police department or patrol unit origin',
      destinationDescription: 'Crime / incident response destination',
    }
  }

  if (category === 'disaster' || vehicleClass === 'rescue_van') {
    return {
      origin: 'Place of Rescue Team',
      destination: 'Place of Emergency',
      originShort: 'Rescue Team',
      destinationShort: 'Emergency',
      originDescription: 'Disaster response team dispatch base',
      destinationDescription: 'Disaster / incident impact zone',
    }
  }

  // Default: Ambulance / Medical
  return {
    origin: 'Place of Victim',
    destination: 'Place of Emergency Visit',
    originShort: 'Victim',
    destinationShort: 'Emergency Visit',
    originDescription: 'Victim / Patient location for ambulance dispatch',
    destinationDescription: 'Hospital / Emergency Care visit destination',
  }
}

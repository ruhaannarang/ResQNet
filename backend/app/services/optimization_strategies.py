from abc import ABC, abstractmethod
from typing import Dict
from ..models.schemas import IncidentProfile, VehicleProfile
from ..models.enums import EmergencyCategory, MedicalSubType, VehicleClass, EmergencyPriority

class OptimizationStrategy(ABC):
    """Defines weight profile for route scoring."""
    name: str = "base"

    @abstractmethod
    def get_weights(self, incident: IncidentProfile, vehicle: VehicleProfile) -> Dict[str, float]:
        pass

    def _base_weights(self) -> Dict[str, float]:
        return {
            "time": 0.35,
            "traffic": 0.20,
            "road_quality": 0.10,
            "incident_comfort": 0.15,
            "vehicle_suitability": 0.10,
            "weather": 0.05,
            "driver_condition": 0.05,
        }

    def _apply_priority_boost(self, weights: Dict[str, float], incident: IncidentProfile):
        priority_time_boost = {
            "low": 0.00, "medium": 0.02, "high": 0.06, "critical": 0.12
        }[incident.priority.value]
        patient_boost = min(max(incident.num_patients - 1, 0) * 0.02, 0.08)
        weights["time"] += priority_time_boost + patient_boost
        weights["traffic"] += (priority_time_boost + patient_boost) * 0.4
        # Wide/heavy vehicles
        if vehicle_class_is_heavy(incident, vehicle_profile := None):
            pass
        return weights

    def _normalize(self, weights: Dict[str, float]) -> Dict[str, float]:
        total = sum(weights.values())
        return {k: v/total for k,v in weights.items()}


def vehicle_class_is_heavy(incident: IncidentProfile, vehicle: VehicleProfile | None) -> bool:
    # placeholder, actual check done in strategy
    return False

class MedicalStrategy(OptimizationStrategy):
    name = "medical"
    def get_weights(self, incident: IncidentProfile, vehicle: VehicleProfile) -> Dict[str, float]:
        weights = self._base_weights()
        # Medical baseline
        weights.update(time=0.38, traffic=0.18, road_quality=0.12,
                       incident_comfort=0.15, vehicle_suitability=0.10,
                       weather=0.04, driver_condition=0.03)
        # Subtype adjustments
        if incident.medical_subtype == MedicalSubType.CARDIAC:
            # Maximum priority to ETA, high traffic avoidance
            weights["time"] += 0.10
            weights["traffic"] += 0.05
            weights["incident_comfort"] -= 0.05
        elif incident.medical_subtype == MedicalSubType.SPINAL:
            weights["road_quality"] += 0.12
            weights["incident_comfort"] += 0.12
            weights["time"] -= 0.08
        elif incident.medical_subtype == MedicalSubType.MATERNITY:
            weights["road_quality"] += 0.08
            weights["incident_comfort"] += 0.08
            weights["time"] -= 0.04
        elif incident.medical_subtype == MedicalSubType.TRAUMA:
            weights["time"] += 0.06
            weights["road_quality"] += 0.04
        # Priority boost
        boost = {"low":0,"medium":0.02,"high":0.06,"critical":0.12}[incident.priority.value]
        patient = min(max(incident.num_patients-1,0)*0.02,0.08)
        weights["time"] += boost + patient
        weights["traffic"] += (boost+patient)*0.4
        if vehicle.vehicle_class in (VehicleClass.FIRE_TRUCK, VehicleClass.RESCUE_VAN):
            weights["vehicle_suitability"] += 0.08
        total = sum(weights.values())
        return {k:v/total for k,v in weights.items()}

class FireStrategy(OptimizationStrategy):
    name = "fire"
    def get_weights(self, incident: IncidentProfile, vehicle: VehicleProfile) -> Dict[str, float]:
        weights = self._base_weights()
        weights.update(time=0.34, traffic=0.18, road_quality=0.10,
                       incident_comfort=0.05, vehicle_suitability=0.25,
                       weather=0.05, driver_condition=0.03)
        boost = {"low":0,"medium":0.02,"high":0.06,"critical":0.12}[incident.priority.value]
        weights["time"] += boost
        weights["traffic"] += boost*0.4
        # Fire heavy
        weights["vehicle_suitability"] += 0.05
        total=sum(weights.values())
        return {k:v/total for k,v in weights.items()}

class PoliceStrategy(OptimizationStrategy):
    name = "police"
    def get_weights(self, incident: IncidentProfile, vehicle: VehicleProfile) -> Dict[str, float]:
        weights = self._base_weights()
        weights.update(time=0.48, traffic=0.24, road_quality=0.06,
                       incident_comfort=0.02, vehicle_suitability=0.12,
                       weather=0.05, driver_condition=0.03)
        boost = {"low":0,"medium":0.02,"high":0.06,"critical":0.12}[incident.priority.value]
        weights["time"] += boost
        weights["traffic"] += boost*0.5
        total=sum(weights.values())
        return {k:v/total for k,v in weights.items()}

class DisasterStrategy(OptimizationStrategy):
    name = "disaster"
    def get_weights(self, incident: IncidentProfile, vehicle: VehicleProfile) -> Dict[str, float]:
        weights = self._base_weights()
        weights.update(time=0.25, traffic=0.12, road_quality=0.22,
                       incident_comfort=0.05, vehicle_suitability=0.25,
                       weather=0.08, driver_condition=0.03)
        # Reliability = road_quality + vehicle
        total=sum(weights.values())
        return {k:v/total for k,v in weights.items()}


STRATEGY_MAP = {
    EmergencyCategory.MEDICAL: MedicalStrategy(),
    EmergencyCategory.FIRE: FireStrategy(),
    EmergencyCategory.POLICE: PoliceStrategy(),
    EmergencyCategory.DISASTER: DisasterStrategy(),
}

# Also expose subtype strategies for detailed naming
CRITICAL_CARDIAC_STRATEGY = MedicalStrategy()
SPINAL_STRATEGY = MedicalStrategy()

def get_strategy(incident: IncidentProfile) -> OptimizationStrategy:
    cat = incident.category
    # If medical cardiac critical, still medical but with cardiac boost inside
    return STRATEGY_MAP.get(cat, MedicalStrategy())

def list_strategies():
    return {k.value: v.name for k,v in STRATEGY_MAP.items()}

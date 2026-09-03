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
        # Subtype adjustments — make distinct per spec, ensure winners emerge
        if incident.medical_subtype == MedicalSubType.CARDIAC:
            # CARDIAC: ETA extremely high, traffic low weight, allow lower comfort/road — time must dominate
            weights.update(time=0.70, traffic=0.08, road_quality=0.03, incident_comfort=0.015, vehicle_suitability=0.06, weather=0.05, driver_condition=0.025)
        elif incident.medical_subtype == MedicalSubType.SPINAL:
            # SPINAL_INJURY: road quality + comfort extremely high, penalize turns/poor surfaces, allow longer ETA
            weights.update(time=0.16, traffic=0.10, road_quality=0.28, incident_comfort=0.32, vehicle_suitability=0.08, weather=0.04, driver_condition=0.02)
        elif incident.medical_subtype == MedicalSubType.MATERNITY:
            # MATERNITY: high comfort, avoid poor roads, moderate ETA
            weights.update(time=0.22, traffic=0.13, road_quality=0.22, incident_comfort=0.29, vehicle_suitability=0.08, weather=0.04, driver_condition=0.02)
        elif incident.medical_subtype == MedicalSubType.TRAUMA:
            weights.update(time=0.40, traffic=0.18, road_quality=0.16, incident_comfort=0.14, vehicle_suitability=0.07, weather=0.03, driver_condition=0.02)
        elif incident.medical_subtype == MedicalSubType.VENTILATOR:
            weights.update(time=0.30, traffic=0.16, road_quality=0.20, incident_comfort=0.20, vehicle_suitability=0.08, weather=0.04, driver_condition=0.02)
        # Priority boost
        boost = {"low":0,"medium":0.02,"high":0.06,"critical":0.12}[incident.priority.value]
        patient = min(max(incident.num_patients-1,0)*0.02,0.08)
        weights["time"] += boost + patient
        weights["traffic"] += (boost+patient)*0.4
        if vehicle.vehicle_class in (VehicleClass.FIRE_TRUCK, VehicleClass.RESCUE_VAN):
            weights["vehicle_suitability"] += 0.05
        total = sum(weights.values())
        w = {k:v/total for k,v in weights.items()}
        # Log for debug
        import logging
        logging.getLogger("resqnet.optimizer").info(f"MedicalStrategy {incident.medical_subtype} weights: {w}")
        return w

class FireStrategy(OptimizationStrategy):
    name = "fire"
    def get_weights(self, incident: IncidentProfile, vehicle: VehicleProfile) -> Dict[str, float]:
        weights = self._base_weights()
        # FIRE_RESPONSE: hard constraints width/height, prefer wide major roads, avoid narrow — vehicle dominates
        weights.update(time=0.10, traffic=0.08, road_quality=0.08,
                       incident_comfort=0.02, vehicle_suitability=0.64,
                       weather=0.05, driver_condition=0.03)
        boost = {"low":0,"medium":0.02,"high":0.06,"critical":0.10}[incident.priority.value]
        weights["time"] += boost * 0.3  # fire time less boosted
        weights["traffic"] += boost*0.2
        total=sum(weights.values())
        w = {k:v/total for k,v in weights.items()}
        import logging
        logging.getLogger("resqnet.optimizer").info(f"FireStrategy weights: {w}")
        return w

class PoliceStrategy(OptimizationStrategy):
    name = "police"
    def get_weights(self, incident: IncidentProfile, vehicle: VehicleProfile) -> Dict[str, float]:
        weights = self._base_weights()
        # POLICE_RESPONSE: very high ETA, high traffic avoidance, fast reliable — ETA dominates but traffic also high
        weights.update(time=0.68, traffic=0.18, road_quality=0.04,
                       incident_comfort=0.01, vehicle_suitability=0.04,
                       weather=0.03, driver_condition=0.02)
        boost = {"low":0,"medium":0.02,"high":0.06,"critical":0.12}[incident.priority.value]
        weights["time"] += boost
        weights["traffic"] += boost*0.4
        total=sum(weights.values())
        w = {k:v/total for k,v in weights.items()}
        import logging
        logging.getLogger("resqnet.optimizer").info(f"PoliceStrategy weights: {w}")
        return w

class DisasterStrategy(OptimizationStrategy):
    name = "disaster"
    def get_weights(self, incident: IncidentProfile, vehicle: VehicleProfile) -> Dict[str, float]:
        weights = self._base_weights()
        # DISASTER_RESPONSE: high reliability + vehicle compatibility, avoid risky/damaged, prefer alternate paths
        weights.update(time=0.18, traffic=0.10, road_quality=0.24,
                       incident_comfort=0.04, vehicle_suitability=0.32,
                       weather=0.09, driver_condition=0.03)
        total=sum(weights.values())
        w = {k:v/total for k,v in weights.items()}
        import logging
        logging.getLogger("resqnet.optimizer").info(f"DisasterStrategy weights: {w}")
        return w


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

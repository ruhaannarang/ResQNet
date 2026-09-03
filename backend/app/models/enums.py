from enum import Enum


class EmergencyCategory(str, Enum):
    MEDICAL = "medical"
    FIRE = "fire"
    POLICE = "police"
    DISASTER = "disaster"


class EmergencyPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class MedicalSubType(str, Enum):
    CARDIAC = "cardiac"
    SPINAL = "spinal"
    VENTILATOR = "ventilator"
    MATERNITY = "maternity"
    TRAUMA = "trauma"
    GENERAL = "general"


class VehicleClass(str, Enum):
    AMBULANCE_BLS = "ambulance_bls"
    AMBULANCE_ALS = "ambulance_als"
    FIRE_TRUCK = "fire_truck"
    POLICE_CAR = "police_car"
    RESCUE_VAN = "rescue_van"

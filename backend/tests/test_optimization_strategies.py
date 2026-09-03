from app.models.schemas import IncidentProfile, VehicleProfile
from app.models.enums import EmergencyCategory, EmergencyPriority, MedicalSubType, VehicleClass
from app.services.optimization_strategies import get_strategy

def test_medical_cardiac_prioritizes_time():
    inc = IncidentProfile(category=EmergencyCategory.MEDICAL, priority=EmergencyPriority.CRITICAL, medical_subtype=MedicalSubType.CARDIAC)
    veh = VehicleProfile(vehicle_class=VehicleClass.AMBULANCE_ALS)
    w = get_strategy(inc).get_weights(inc, veh)
    assert w["time"] > 0.35
    assert w["traffic"] > 0.15

def test_spinal_prioritizes_road_quality():
    inc = IncidentProfile(category=EmergencyCategory.MEDICAL, priority=EmergencyPriority.HIGH, medical_subtype=MedicalSubType.SPINAL)
    veh = VehicleProfile(vehicle_class=VehicleClass.AMBULANCE_ALS)
    w = get_strategy(inc).get_weights(inc, veh)
    inc2 = IncidentProfile(category=EmergencyCategory.MEDICAL, priority=EmergencyPriority.HIGH, medical_subtype=MedicalSubType.CARDIAC)
    w2 = get_strategy(inc2).get_weights(inc2, veh)
    assert w["road_quality"] > w2["road_quality"]

def test_fire_prioritizes_vehicle_access():
    inc = IncidentProfile(category=EmergencyCategory.FIRE, priority=EmergencyPriority.HIGH)
    veh = VehicleProfile(vehicle_class=VehicleClass.FIRE_TRUCK)
    w = get_strategy(inc).get_weights(inc, veh)
    assert w["vehicle_suitability"] > 0.20

def test_police_prioritizes_eta_and_traffic():
    inc = IncidentProfile(category=EmergencyCategory.POLICE, priority=EmergencyPriority.CRITICAL)
    veh = VehicleProfile(vehicle_class=VehicleClass.POLICE_CAR)
    w = get_strategy(inc).get_weights(inc, veh)
    assert w["time"] > 0.40
    assert w["traffic"] > 0.20

def test_disaster_prioritizes_reliability():
    inc = IncidentProfile(category=EmergencyCategory.DISASTER, priority=EmergencyPriority.HIGH)
    veh = VehicleProfile(vehicle_class=VehicleClass.RESCUE_VAN)
    w = get_strategy(inc).get_weights(inc, veh)
    assert w["road_quality"] > 0.18
    assert w["vehicle_suitability"] > 0.20

def test_weights_normalized():
    for cat in [EmergencyCategory.MEDICAL, EmergencyCategory.FIRE, EmergencyCategory.POLICE, EmergencyCategory.DISASTER]:
        inc = IncidentProfile(category=cat, priority=EmergencyPriority.HIGH)
        veh = VehicleProfile(vehicle_class=VehicleClass.AMBULANCE_ALS)
        w = get_strategy(inc).get_weights(inc, veh)
        assert abs(sum(w.values()) - 1.0) < 1e-6

def test_critical_boost():
    inc_low = IncidentProfile(category=EmergencyCategory.MEDICAL, priority=EmergencyPriority.LOW)
    inc_crit = IncidentProfile(category=EmergencyCategory.MEDICAL, priority=EmergencyPriority.CRITICAL)
    veh = VehicleProfile(vehicle_class=VehicleClass.AMBULANCE_ALS)
    w_low = get_strategy(inc_low).get_weights(inc_low, veh)
    w_crit = get_strategy(inc_crit).get_weights(inc_crit, veh)
    assert w_crit["time"] > w_low["time"]

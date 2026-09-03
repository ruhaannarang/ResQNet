from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, JSON, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from geoalchemy2 import Geometry

Base = declarative_base()


class EmergencyRecord(Base):
    __tablename__ = "emergency_records"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String(64), unique=True, index=True)
    category = Column(String(20), nullable=False)
    priority = Column(String(20), nullable=False)
    medical_subtype = Column(String(20), nullable=True)
    origin_lat = Column(Float, nullable=False)
    origin_lng = Column(Float, nullable=False)
    destination_lat = Column(Float, nullable=False)
    destination_lng = Column(Float, nullable=False)
    vehicle_class = Column(String(30), nullable=False)
    requesting_unit_id = Column(String(64), nullable=True)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class RouteRecord(Base):
    __tablename__ = "route_records"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String(64), index=True)
    route_id = Column(String(64), nullable=False)
    total_distance_km = Column(Float)
    total_duration_seconds = Column(Float)
    total_score = Column(Float)
    is_recommended = Column(Boolean, default=False)
    polyline = Column(Text, nullable=True)
    segments_data = Column(JSON, nullable=True)
    explanation_summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class GPSLog(Base):
    __tablename__ = "gps_logs"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(String(64), index=True)
    request_id = Column(String(64), index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed_kmh = Column(Float, default=0)
    heading = Column(Float, default=0)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    location = Column(Geometry("POINT", srid=4326))


class TrafficSnapshot(Base):
    __tablename__ = "traffic_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    road_segment_id = Column(String(64), index=True)
    congestion_level = Column(Float)
    average_speed_kmh = Column(Float)
    free_flow_speed_kmh = Column(Float)
    incident_nearby = Column(Boolean, default=False)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

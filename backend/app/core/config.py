from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "ResQNet"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/resqnet"
    DATABASE_SYNC_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/resqnet"

    GOOGLE_MAPS_API_KEY: str = ""
    MAPBOX_API_KEY: str = ""
    HERE_API_KEY: str = ""
    TOMTOM_API_KEY: str = ""
    OSRM_BASE_URL: str = "https://router.project-osrm.org"
    ROUTING_PROVIDER: str = "auto"  # auto | osrm | google | mock
    ALLOW_SIMULATED_ROUTES: bool = False

    WEATHER_API_KEY: str = ""
    WEATHER_PROVIDER: str = "open-meteo"  # open-meteo | openweathermap

    REROUTE_IMPROVEMENT_THRESHOLD: float = 0.15
    REROUTE_DEGRADATION_THRESHOLD: float = 0.12
    REROUTE_MIN_INTERVAL_SECONDS: int = 60
    ROUTING_TIMEOUT_SECONDS: float = 15.0

    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

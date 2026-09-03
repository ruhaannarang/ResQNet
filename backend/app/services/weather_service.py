import httpx
from typing import Dict, Any, Optional
from ..models.schemas import GPSPosition, DataSource
from ..core.config import get_settings

settings = get_settings()

class WeatherService:
    """
    Real weather integration.
    Uses Open-Meteo (free, no key) as default, falls back to OpenWeatherMap if key provided and configured.
    Weather affects: vehicle safety, expected travel time, route reliability.
    """

    async def get_weather(self, position: GPSPosition) -> Dict[str, Any]:
        # Try Open-Meteo first (no key needed) unless configured to use openweathermap
        if settings.WEATHER_PROVIDER == "openweathermap" and settings.WEATHER_API_KEY:
            try:
                return await self._get_openweathermap(position)
            except Exception:
                # fallback to open-meteo
                pass
        try:
            return await self._get_open_meteo(position)
        except Exception as e:
            # Unavailable - do not silently assume perfect weather
            return {
                "condition": "unknown",
                "source": DataSource.UNAVAILABLE.value,
                "confidence": 0.0,
                "visibility_km": None,
                "precipitation_mm": None,
                "wind_speed_ms": None,
                "temperature_c": None,
                "note": f"Weather unavailable: {e}",
                "raw": None,
            }

    async def _get_open_meteo(self, position: GPSPosition) -> Dict[str, Any]:
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": position.latitude,
            "longitude": position.longitude,
            "current_weather": "true",
            "hourly": "precipitation,windspeed_10m,visibility",
            "forecast_days": 1,
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        current = data.get("current_weather", {})
        # Map weathercode to condition
        code = current.get("weathercode", 0)
        condition = self._meteo_code_to_condition(code)
        # Try to get precipitation from hourly
        precip = 0
        hourly = data.get("hourly", {})
        if hourly.get("precipitation"):
            # take first hour
            precip = hourly["precipitation"][0] or 0
        return {
            "condition": condition,
            "source": DataSource.PROVIDER.value,
            "confidence": 0.85,
            "visibility_km": 10.0,  # Open-Meteo free doesn't give visibility in current; assume
            "precipitation_mm": precip,
            "wind_speed_ms": current.get("windspeed", 0) / 3.6 if current.get("windspeed") else 0,
            "temperature_c": current.get("temperature", 20),
            "weathercode": code,
            "raw": current,
        }

    async def _get_openweathermap(self, position: GPSPosition) -> Dict[str, Any]:
        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            "lat": position.latitude,
            "lon": position.longitude,
            "appid": settings.WEATHER_API_KEY,
            "units": "metric",
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        return {
            "condition": data.get("weather", [{}])[0].get("main", "clear").lower(),
            "source": DataSource.PROVIDER.value,
            "confidence": 0.90,
            "visibility_km": data.get("visibility", 10000) / 1000,
            "precipitation_mm": data.get("rain", {}).get("1h", 0),
            "wind_speed_ms": data.get("wind", {}).get("speed", 0),
            "temperature_c": data.get("main", {}).get("temp", 20),
            "raw": data,
        }

    def _meteo_code_to_condition(self, code: int) -> str:
        # WMO codes
        if code in (0,):
            return "clear"
        if code in (1,2,3):
            return "cloudy"
        if code in (45,48):
            return "fog"
        if code in (51,53,55,56,57):
            return "drizzle"
        if code in (61,63,65,66,67):
            return "rain"
        if code in (71,73,75,77,85,86):
            return "snow"
        if code in (80,81,82):
            return "rain"
        if code in (95,96,99):
            return "storm"
        return "clear"

    def weather_risk_score(self, weather: Dict[str, Any]) -> float:
        """Convert weather condition to 0-10 penalty."""
        cond = (weather.get("condition") or "clear").lower()
        precip = weather.get("precipitation_mm") or 0
        wind = weather.get("wind_speed_ms") or 0
        vis = weather.get("visibility_km")
        score = 0
        if cond in ("rain", "drizzle"):
            # heavy rain
            if precip > 10:
                score += 4
            elif precip > 2:
                score += 2
            else:
                score += 1
        if cond == "snow":
            score += 5
        if cond == "storm":
            score += 7
        if cond == "fog":
            score += 3
            if vis is not None and vis < 1:
                score += 2
        if wind > 15:  # m/s ~ 54 km/h
            score += 2
        if wind > 25:
            score += 3
        if precip > 20:
            score += 3
        return min(10, score)

    def weather_reliability_penalty(self, weather: Dict[str, Any]) -> float:
        """Return 0-1 reliability factor where 1 is fully reliable."""
        score = self.weather_risk_score(weather)
        return max(0.5, 1 - score/15)

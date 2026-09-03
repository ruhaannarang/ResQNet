# ResQNet — Emergency Vehicle Route Optimization

ResQNet is a production-grade, emergency-aware routing system for ambulances, fire trucks, police vehicles, and disaster-response teams. It evaluates candidate routes against incident severity, vehicle constraints, live road geometry, and environmental conditions, then returns the best route with confidence scoring and explainable reasoning via a command-center dashboard.

No ML black-box is claimed — scoring is rule-based with incident-aware strategy weighting, fully inspectable and testable.

## Architecture

```
Emergency Request → Incident & Vehicle Input → Routing Provider (OSRM / Google / Mock)
       → Live Weather (Open-Meteo) → Feasibility Layer (hard constraints)
       → Strategy-Weighted Scoring → Confidence & Data Quality → Explanation → Dashboard
                                      ↕
                               GPS Rerouting (hysteresis) ← Feedback Loop
```

### Layers

1. **Emergency Request Layer** — Origin/destination (validated), incident category/priority/subtype, vehicle profile
2. **Routing Provider Layer** — Pluggable `RoutingProvider` interface. Default: **OSRM** (free, real OSM road geometry). Optional: Google Maps Directions. Mock provider for offline/demo only (explicit flag).
3. **Feasibility Layer** — Hard constraint validation separates `impossible` (reject), `risky` (warn), `compatible` (safe). Checks width, height, weight proxy, grade, paved requirement, narrow-road penalties.
4. **Optimization Layer** — `OptimizationStrategy` subclasses: `MedicalStrategy` (Cardiac/Spinal/Maternity/Trauma boosts), `FireStrategy`, `PoliceStrategy`, `DisasterStrategy`. Weights are normalized and configurable, not hardcoded inline.
5. **Weather & Confidence** — Open-Meteo (free, no key) live weather influences ETA and reliability; `ConfidenceService` downgrades when traffic/weather/geometry is estimated/unavailable or provider is simulated.
6. **Explanation Module** — Structured `{recommendation_reasons, warnings, rejected_routes, tradeoffs, data_quality}` plus human summary. Never presents estimates as live data.
7. **Dashboard** — React + Leaflet command UI: origin/destination markers, alternative routes, ETA comparison, traffic/vehicle/confidence indicators, GREEN/YELLOW/RED feasibility, reroute hysteresis.
8. **Feedback Loop** — GPS updates → remaining-route health → reroute evaluation with configurable hysteresis (`improvement >15%` **and** `degradation >12%`, min 60s interval).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript + Leaflet + Tailwind CSS + Axios |
| Backend | Python 3.10+ + FastAPI + Pydantic v2 + Httpx + Uvicorn |
| Routing | OSRM (`router.project-osrm.org`) / Google Directions (optional) / Mock (demo) |
| Weather | Open-Meteo (default, no key) + OpenWeatherMap (optional) |
| Database | PostgreSQL + PostGIS models defined (not required to run; file-based fallback) |
| Testing | pytest + pytest-asyncio + FastAPI TestClient |

## Project Structure

```
ResQNet/
├── backend/
│   ├── app/
│   │   ├── api/                     # routing.py (new canonical + legacy), router.py
│   │   ├── core/                    # config.py, middleware.py (request ID, logging, CORS)
│   │   ├── models/                  # schemas.py (MetricValue, DataQuality, CandidateRoute...), enums.py
│   │   ├── services/
│   │   │   ├── routing/providers/   # base.py, osrm.py, google.py, mock.py, factory.py
│   │   │   ├── route_optimizer.py   # strategy-aware scoring + sourced metrics
│   │   │   ├── optimization_strategies.py
│   │   │   ├── vehicle_constraints.py
│   │   │   ├── confidence_service.py
│   │   │   ├── weather_service.py
│   │   │   ├── rerouting_service.py
│   │   │   ├── explanation_engine.py
│   │   │   ├── routing_service.py   # orchestrates provider → optimizer → explainer
│   │   │   └── map_data_service.py  # legacy wrapper (delegates to providers)
│   │   ├── database/                # models.py, connection.py
│   │   └── main.py                  # FastAPI app + middleware + exception handlers
│   ├── tests/                       # 48 unit + integration tests (pytest)
│   ├── requirements.txt
│   ├── .env.example
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/  # App.tsx, MapContainer, RoutePanel, CommandCenter, EmergencyForm, Header
│   │   ├── services/api.ts
│   │   ├── types.ts    # includes MetricValue, DataQuality etc.
│   │   └── utils/locationLabels.ts
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js v18+ and npm
- Git
- (Optional) Google Maps API key for live traffic

### Step 1: Backend Setup (FastAPI)

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt

# Windows
copy .env.example .env
# macOS/Linux
cp .env.example .env
# Default uses free OSRM — no key needed. For offline demo only, set ALLOW_SIMULATED_ROUTES=true

python run.py
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
# Health: http://localhost:8000/api/v1/health
# Providers: http://localhost:8000/api/v1/providers/status
```

### Step 2: Frontend Setup (React + Vite)

```bash
cd frontend
npm install
npm run dev
# http://localhost:3000  (proxy to backend /api)
```

Openbrowser to the printed URL; the dashboard auto-acquires GPS (with IP fallback) and is ready to dispatch.

## Environment Variables

`.env` (see `.env.example` for template):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://...` | Postgres async DSN (optional to run) |
| `ROUTING_PROVIDER` | `auto` | `auto` (Google if key else OSRM) \| `osrm` \| `google` \| `mock` |
| `OSRM_BASE_URL` | `https://router.project-osrm.org` | OSRM endpoint |
| `ROUTING_TIMEOUT_SECONDS` | `15` | Per-request timeout |
| `GOOGLE_MAPS_API_KEY` | *(empty)* | Enable Google provider + live traffic |
| `MAPBOX_API_KEY` | *(empty)* | Reserved |
| `ALLOW_SIMULATED_ROUTES` | `false` | **Must be true to enable mock fallback/demo**. Never silently in production. |
| `WEATHER_API_KEY` | *(empty)* | Optional for OpenWeatherMap; default uses Open-Meteo (no key) |
| `WEATHER_PROVIDER` | `open-meteo` | `open-meteo` \| `openweathermap` |
| `REROUTE_IMPROVEMENT_THRESHOLD` | `0.15` | Hysteresis: new route must be 15% better |
| `REROUTE_DEGRADATION_THRESHOLD` | `0.12` | Current route must be 12% degraded |
| `REROUTE_MIN_INTERVAL_SECONDS` | `60` | Minimum seconds between reroute triggers |
| `DEBUG` | `true` | Logging verbosity |
| `CORS_ORIGINS` | `localhost:3000,5173` | Allowed origins |

### Simulated vs Production Mode

- **Production (default):** `ALLOW_SIMULATED_ROUTES=false` — real OSRM geometry only. If OSRM/Gooogle unavailable, the API returns `503`/`502` with `{error, provider, request_id}` — never silently fakes roads. Responses are `is_simulated: false`, `data_quality.provider: "osrm"/"google"`.
- **Demo/Offline:** Set `ALLOW_SIMULATED_ROUTES=true` — `MockRoutingProvider` returns deterministic curved lines with `is_simulated: true`, `warning: "Simulated geometry - not real roads"`, confidence capped at 55%, dashboard shows red banner.

## Routing Providers

| Provider | Real Geometry | Live Traffic | Rate Limit Handling | When Used |
|----------|---------------|--------------|---------------------|-----------|
| **OSRM** (default) | Yes (OSM) | Estimated (marked `estimated`, confidence 0.55) | 429 → `ProviderRateLimitError` | Auto when no Google key |
| **Google** | Yes | Yes (`provider`, 0.90) if key set | 429/OVER_QUERY_LIMIT → rate limit | When `GOOGLE_MAPS_API_KEY` set or `ROUTING_PROVIDER=google` |
| **Mock** | **No** — synthetic | Simulated | N/A | Only if `ALLOW_SIMULATED_ROUTES=true` and others fail, or `ROUTING_PROVIDER=mock` |

Selection is configurable via `ROUTING_PROVIDER` and exposed at `GET /api/v1/providers/status`.

Error handling covers: invalid coordinates (422), no route found (404), timeout (504), rate limit (429), invalid API key (403/503), provider down (502).

## Data Provenance & Confidence

Every ancillary attribute carries `source` and `confidence`:

```json
{
  "value": 0.72,
  "source": "provider | openstreetmap | estimated | unavailable | simulated",
  "confidence": 0.85,
  "note": "Estimated from route class"
}
```

- `traffic_level`, `road_quality`, `road_width_meters`, `bridge_clearance_meters` from OSRM are **estimated** (OSRM does not return them) — tagged `estimated` confidence 0.5. Google traffic is `provider`. Mock is `simulated`.
- Weather: `provider` (Open-Meteo live) confidence 0.85; if unavailable → `unavailable` confidence 0.
- Overall `confidence` per route decreases for estimated/unavailable traffic/weather/attributes, risky/impossible feasibility, and simulated geometry. Overall `data_quality` object returned on every response.

Never presents estimates as live data.

## Vehicle Constraints — Feasibility Layer

```
Route → Segment analysis → Hard constraint validation → Route rejected OR allowed → Optimization scoring
```

Checks per segment:
- Width vs `min_road_width_meters` → impossible if `< required`; risky if margin `<0.5m`
- Height vs `bridge_clearance_meters` → impossible if `< vehicle height`; risky if margin `<0.5m`
- Paved requirement vs `road_quality <0.3` → impossible
- Heavy vehicle weight proxy
- Fire truck narrow-road aggregate (>50% <4.5m → risky)

Result: `feasibility: "compatible" | "risky" | "impossible"` with `feasibility_reasons` and `warnings`. Impossible routes are excluded from recommendation; least-bad is returned only if nothing else feasible, with rejected list exposed.

## Optimization Strategies

Weights are not hardcoded inline — they live in `OptimizationStrategy` subclasses:

- **CRITICAL_CARDIAC** (`medical` + `cardiac`): max ETA (time 0.48+), high traffic avoidance
- **SPINAL_INJURY** (`medical` + `spinal`): high road quality (0.22+) and comfort, penalize poor roads
- **FIRE_RESPONSE**: vehicle accessibility critical (0.25+), avoids narrow, checks width/height
- **POLICE_RESPONSE**: prioritizes ETA + congestion avoidance
- **DISASTER_RESPONSE**: reliability + accessibility, weather-aware, tolerates damaged roads

```python
get_strategy(incident).get_weights(incident, vehicle)  # normalized
```

Priority (`low/medium/high/critical`) and `num_patients` boost time/traffic weights.

Scores per route: `eta_score`, `traffic_score`, `road_quality_score`, `comfort_score`, `vehicle_suitability_score`, `weather_score`, `reliability_score`, `constraint_penalties`, `total_score`. Relative normalization across alternatives so long-trip ETA doesn't overwhelm other factors.

## Weather Integration

- Default: **Open-Meteo** (free, no key) at `api.open-meteo.com` — current weather + hourly precipitation. Maps WMO code to `clear/cloudy/fog/drizzle/rain/snow/storm`.
- Fallback optional: OpenWeatherMap if `WEATHER_PROVIDER=openweathermap` and `WEATHER_API_KEY` set.
- Influences: ETA (rain/storm ×0.85, snow/fog ×0.75), `weather_score` 0-10, `reliability_score`, and segment `weather` metric with provenance. If unavailable, marked `unavailable` and confidence lowered — never assumes perfect weather.

## Dynamic Rerouting (with Hysteresis)

Evaluates GPS position against current route:
- Remaining route via closest-segment tracking
- Health: `remaining_time`, `avg_congestion`, `avg_road_quality`, `weather_risk`
- Triggers: high congestion (>75%), ETA blowup (>30 min), constraint violation, blocked road, weather risk >5
- **Hysteresis**: only reroutes if `degradation > 12%` **and** (if new route) `improvement >15%`, plus 60s min interval. Prevents constant switching. Critical infeasible/blocked overrides hysteresis.

Endpoints:
- `POST /api/v1/routes/evaluate-reroute` (canonical, supports `{gps_update, current_route}`)
- `POST /api/v1/emergency/reroute` (legacy)

Response includes `should_reroute`, `reason`, `current_route_health`, `improvement`, `hysteresis_applied`.

## Explainable Routing

```json
{
  "recommendation_reasons": ["CARDIAC protocol: maximum ETA priority", "Low traffic ..."],
  "warnings": ["Traffic is estimated — confidence reduced"],
  "rejected_routes": [{"route_id":"abcd","reason":"Road too narrow 2.5m < 4.0m","feasibility":"impossible"}],
  "tradeoffs": ["Balances speed vs road quality ..."],
  "confidence_score": 0.61,
  "data_quality": {"traffic":"estimated","weather":"provider","road_geometry":"real"}
}
```

Summary example: *"Route B selected because it provides fastest ETA while avoiding heavy congestion and maintaining good road conditions."* Rejected: *"Route A rejected because road width does not meet minimum for fire truck."*

## Frontend Dashboard

- **Emergency request panel** (category, priority, subtype, vehicle)
- **Interactive map** (Leaflet, OSM tiles light/dark, origin/destination markers, click to set, fitBounds)
- **Origin/destination markers** with labels (Victim/Hospital, Fire Brigade, Police Unit, Rescue Team per category)
- **All route alternatives** (solid navy recommended, dashed gray alternatives) — real geometry only when `is_simulated:false`
- **Route comparison** (ETA table, distance, feasibility badge)
- **Traffic indicator** per route (Low/Mod/High color bar + source tag)
- **Vehicle compatibility** badge GREEN (compatible) / YELLOW (risky) / RED (impossible + rejected)
- **Confidence score** (per-route and overall, color-coded)
- **Data quality indicators** (geometry/traffic/weather with source & confidence %)
- **Explanation panel** (reasons, warnings, tradeoffs, rejected)
- **Rerouting status** (hysteresis thresholds, health)

All info comes from backend API; no hardcoded demo data. Simulated banner shown if `is_simulated:true`.

## API Reference

### POST /api/v1/routes/optimize  (canonical)

```bash
curl -X POST http://localhost:8000/api/v1/routes/optimize \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: my-req-123" \
  -d '{
    "origin": {"latitude": 12.9716, "longitude": 77.5946},
    "destination": {"latitude": 12.9866, "longitude": 77.6066},
    "incident": {"category": "medical", "priority": "critical", "medical_subtype": "cardiac", "num_patients": 1, "requires_special_equipment": true},
    "vehicle": {"vehicle_class": "ambulance_als", "max_width_meters": 2.5, "max_height_meters": 2.8, "max_weight_tons": 5, "can_handle_steep_grades": true, "min_road_width_meters": 3.0, "requires_paved_road": true}
  }'
```

Response: `OptimizedRouteResult` with `best_route`, `all_routes`, `scores`, `explanation`, `confidence`, `data_quality`, `provider`, `is_simulated`, `request_id`.

Legacy alias: `POST /api/v1/emergency/route` (identical).

### POST /api/v1/routes/evaluate-reroute

```json
{
  "gps_update": {"vehicle_id":"V1","position":{"latitude":12.97,"longitude":77.59},"speed_kmh":40,"heading":90,"timestamp":"2026-09-03T00:00:00Z"},
  "current_route": { "route_id": "...", "segments": [...] }
}
```

### GET /api/v1/health  /  GET /api/v1/providers/status

```bash
curl http://localhost:8000/api/v1/health
curl http://localhost:8000/api/v1/providers/status
```

### Errors (structured)

```json
{"error":"Origin is at 0,0 — likely unset coordinates","request_id":"abcd1234","detail":[...]}
```
Headers: `X-Request-ID`, `X-Response-Time-ms`. Validation → 422, No route → 404, Rate limit → 429, Timeout → 504, Provider failure → 502.

### Frontend ↔ Backend
Vite proxy (`vite.config.ts`): `/api → http://localhost:8000`. No CORS needed locally. In production set `CORS_ORIGINS`.

## Running Locally (End-to-End)

```bash
# Terminal 1 — backend (OSRM default, no keys needed)
cd backend
python -m venv venv; venv\Scripts\activate  # or source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env   # edit if using Google Maps key
python run.py
# -> http://localhost:8000/docs

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
# -> http://localhost:3000
```

Then: set origin/destination (map click or "Use Current Location"), pick incident/vehicle, press **Dispatch Optimal Route**. Verify: network tab shows `POST /api/v1/routes/optimize` 200, map shows navy recommended + dashed alternatives, panels show confidence/data quality.

Without paid APIs, OSRM public works everywhere; if it is down and `ALLOW_SIMULATED_ROUTES=false`, the API correctly returns 503 — it does **not** fake a route.

## Testing

```bash
cd backend
venv\Scripts\activate
pytest tests -v        # 48 tests: vehicle constraints, strategies, scoring, confidence, rerouting, providers, API
pytest tests/test_api_integration.py -k cardiac -v
```

Frontend:

```bash
cd frontend
npm run build    # typecheck + production build
```

All 48 backend tests pass (unit: scoring, constraints, confidence, rerouting; integration: optimize, providers, error paths, scenarios).

## Known Limitations (Honest)

- Road width/bridge clearance/quality are **estimated per route class** (OSRM does not expose them). We tag `source: estimated` confidence 0.5 and downgrade overall confidence accordingly. To improve, integrate Overpass API or a commercial map provider.
- Traffic from OSRM is estimated (no live feed). Live traffic only with Google provider and key.
- Weather is point-sampled at origin (not per-segment forecast rollup).
- No learned model yet — scoring is deterministic rule-based. We call it "weighted scoring" not AI/ML (XGBoost/RL is planned).
- Database (PostGIS) models exist but are not wired to persistence yet; routes are stateless.
- OSRM public (`router.project-osrm.org`) is rate-limited and not for heavy production; self-host OSRM or use managed Mapbox/HERE for SLA.
- Map tiles are OSM free; for offline use, host your own tile server.

## Changes Made (This Upgrade)

- **Routing**: Introduced `RoutingProvider` abstraction (`OSRMRoutingProvider`, `GoogleRoutingProvider`, `MockRoutingProvider`) with factory, env-configurable selection, timeout/rate-limit/no-route error types, health checks. No silent mock fallback.
- **Sourced metrics**: Added `MetricValue`/`DataQuality` with `source`/`confidence` per segment; all estimates explicitly marked, simulated capped.
- **Vehicle constraints**: New `VehicleConstraints` feasibility layer (impossible/risky/compatible) with narrow/clearance/grade/paved checks.
- **Scoring**: Moved weights into `OptimizationStrategy` subclasses per incident, plus subtype/priority boosts; added ETA/reliability/comfort sub-scores and relative normalization.
- **Confidence**: `ConfidenceService` based on provenance, provider, feasibility, estimate ratio.
- **Weather**: Real Open-Meteo integration affecting ETA & reliability, with unavailable handling.
- **Rerouting**: `ReroutingService` with GPS tracking, remaining-route health, triggers, and hysteresis (improvement vs degradation thresholds).
- **Explanation**: Structured `recommendation_reasons`, `warnings`, `rejected_routes`, `tradeoffs`, `data_quality`.
- **API**: New canonical `POST /api/v1/routes/optimize`, `GET /api/v1/providers/status`, `GET /api/v1/health`, request ID middleware, structured errors, timeout handling, CORS+validation 422. Legacy endpoints preserved.
- **Frontend**: New types, provider-agnostic API client, `RoutePanel` and `CommandCenter` upgraded with GREEN/YELLOW/RED feasibility, ETA comparison, traffic/vehicle/confidence/data-quality panels, simulated banner, rejected breakdown.
- **Tests**: 48 pytest cases covering all new layers.
- **Docs/Config**: Updated `.env.example`, `requirements.txt` (pytest), `config.py` thresholds, `README`.

## How to Run (Summary)

Backend: `cd backend && pip install -r requirements.txt && copy .env.example .env && python run.py`  
Frontend: `cd frontend && npm install && npm run dev`  
Visit docs `http://localhost:8000/docs` and dashboard `http://localhost:3000`. For simulated demo: `ALLOW_SIMULATED_ROUTES=true`. For Google traffic: set `GOOGLE_MAPS_API_KEY` and `ROUTING_PROVIDER=google`.

## License

MIT — see repo.


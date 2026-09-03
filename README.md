# ResQNet - Emergency Vehicle Route Optimization

ResQNet is a modular, continuously operating decision pipeline for emergency vehicle routing. It accepts emergency requests, evaluates candidate routes considering incident type, vehicle constraints, and live conditions, and returns the best route with an explainable recommendation.

## Architecture

```
Emergency Request → Incident & Vehicle Input → Live Data APIs → AI Route Optimizer → Best Route + Explanation → Live Dashboard
```

### Layers

1. **Emergency Request Layer** - Origin/destination, incident category, priority, medical subtype
2. **Live Data Layer** - Google Maps, Mapbox/OSRM, HERE/TomTom integration
3. **Route Feasibility Layer** - Hard constraints (road width, bridge clearance) and soft penalties
4. **AI Route Optimizer** - Weighted scoring with incident-aware reweighting
5. **Explanation Module** - Human-readable reasoning for route selection
6. **Dashboard Layer** - Driver and command-center interfaces
7. **Feedback Loop** - GPS updates trigger dynamic rerouting

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Leaflet + TypeScript + Tailwind CSS |
| Backend | Python + FastAPI |
| Database | PostgreSQL + PostGIS |
| Mapping | Google Maps / Mapbox + OpenStreetMap |
| AI/ML | Weighted scoring (XGBoost/RL planned) |

## Project Structure

```
ResQNet/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI endpoints
│   │   ├── core/         # Configuration
│   │   ├── database/     # SQLAlchemy models & connection
│   │   ├── models/       # Pydantic schemas & enums
│   │   ├── services/     # Business logic
│   │   └── main.py       # App entry point
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API client
│   │   ├── types.ts      # TypeScript types
│   │   ├── App.tsx       # Main app
│   │   └── main.tsx      # Entry point
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Getting Started

### Prerequisites

Ensure you have the following installed:
- **Python 3.10+**
- **Node.js (v18+)** and **npm**
- **Git**

---

### Step 1: Backend Setup (FastAPI)

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - **Windows (Command Prompt / PowerShell):**
     ```bash
     python -m venv venv
     venv\Scripts\activate
     ```
   - **macOS / Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your local environment configuration:
   - **Windows:**
     ```cmd
     copy .env.example .env
     ```
   - **macOS / Linux:**
     ```bash
     cp .env.example .env
     ```
   *(By default, ResQNet uses the free public OSRM router. If you want to test offline without external calls, set `ALLOW_SIMULATED_ROUTES=true` in `.env`.)*

5. Start the backend server:
   ```bash
   python run.py
   ```
   - Backend API: `http://localhost:8000`
   - Interactive Swagger API Docs: `http://localhost:8000/docs`

---

### Step 2: Frontend Setup (React + Vite)

1. Open a **second terminal window** and navigate to `frontend`:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```

4. Open your browser and go to:
   - `http://localhost:3000` (or the URL printed in the terminal)

### API Usage

```bash
curl -X POST http://localhost:8000/api/v1/emergency/route \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"latitude": 40.7128, "longitude": -74.006},
    "destination": {"latitude": 40.7580, "longitude": -73.9855},
    "incident": {
      "category": "medical",
      "priority": "critical",
      "medical_subtype": "cardiac",
      "num_patients": 1,
      "requires_special_equipment": true
    },
    "vehicle": {
      "vehicle_class": "ambulance_als",
      "max_width_meters": 2.5,
      "max_height_meters": 2.8,
      "max_weight_tons": 5,
      "can_handle_steep_grades": true,
      "min_road_width_meters": 3.0,
      "requires_paved_road": true
    }
  }'
```

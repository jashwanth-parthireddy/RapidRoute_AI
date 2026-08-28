# RapidRoute AI 🚑

> **AI-Powered Ambulance Emergency Route Clearance System**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Node.js](https://img.shields.io/badge/Node.js-20.x-green)
![Python](https://img.shields.io/badge/Python-3.11-blue)
![React](https://img.shields.io/badge/React-18-cyan)

---

## 🚨 Problem Statement

During medical emergencies, ambulances lose critical minutes because of:
- Heavy traffic and congested junctions
- Poor route selection under time pressure
- Lack of real-time coordination between drivers and traffic authorities
- Delayed awareness at upcoming junctions

Every minute matters. RapidRoute AI is designed to cut that time.

---

## 💡 Solution

When a driver activates **Emergency Mode**, the system:

1. Captures live GPS location of the ambulance
2. Lets the driver select the destination hospital
3. Uses an **AI Route Coordinator Agent** to calculate the optimal path
4. Identifies junctions along the route and scores their delay risk
5. Continuously predicts and updates ETA
6. Sends instant alerts to the Traffic Control Room via WebSocket
7. Notifies traffic officers at upcoming junctions with priority scores
8. Tracks ambulance movement live on an interactive map
9. Detects sudden traffic changes and recommends route changes
10. Notifies the destination hospital about incoming patient + ETA
11. Completes the trip and records analytics (time saved, junctions cleared)

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🤖 AI Route Engine | Scores and recommends optimal route from multiple options |
| 📊 ETA Prediction | Continuously updated based on speed, distance, traffic, junction delays |
| 🚦 Junction Prioritization | AI assigns CRITICAL/HIGH/MEDIUM/LOW priority to upcoming junctions |
| 🗺️ Live Map | Leaflet.js map with ambulance, hospital, route, and junction markers |
| 🔌 Real-time WebSocket | All events broadcast instantly to all connected dashboards |
| 🎮 Demo Simulation Mode | Full end-to-end demo without real GPS or police infrastructure |
| 👥 5 Role Dashboards | Driver, Control Room, Officer, Hospital, Admin |
| 🔒 JWT Auth + RBAC | Secure role-based authentication |
| 📈 Trip Analytics | Time saved, junctions coordinated, route changes per emergency |

---

## 🤖 AI Capabilities

### Emergency Route Coordinator Agent
Located in `ai-service/prediction/coordinator.py`

**Route Recommendation:**
- Scores two route options (normal vs AI-optimized) using a trained RandomForestRegressor
- Considers distance, congestion, junction count, highway availability, time of day
- Returns human-readable reasoning:
  > *"Route B recommended: predicted congestion 40% lower, 2 fewer high-delay junctions. Estimated 6 minutes saved."*

**ETA Prediction:**
- Calculates effective speed from congestion percentage
- Adds junction delay penalties per traffic level
- Updates continuously as ambulance moves

**Junction Prioritization (GradientBoostingRegressor):**
- Trained on synthetic traffic dataset (5,000 samples)
- Predicts delay minutes per junction
- Assigns CRITICAL/HIGH/MEDIUM/LOW priority based on ambulance ETA
- Returns risk scores for each junction

---

## 🏗️ Architecture

```
Browser Clients (React 18 + TypeScript)
         │
         │ HTTP/REST + WebSocket (ws://)
         │
  Express API Gateway (Node.js, Port 4000)
         │
         ├── Auth Module          (/api/auth)
         ├── Ambulance Module     (/api/ambulances)
         ├── Emergency Module     (/api/emergencies)
         ├── Route Module         (/api/routes)
         ├── Traffic Module       (/api/traffic)
         ├── Junction Module      (/api/junctions)
         ├── Alert Module         (/api/alerts)
         ├── Hospital Module      (/api/hospitals)
         ├── Analytics Module     (/api/analytics)
         ├── Simulation Module    (/api/simulation)
         └── Admin Module         (/api/admin)
                  │
         ┌────────┼────────┐
         │        │        │
    PostgreSQL  Redis   AI Service
    (Port 5432) (6379)  FastAPI/Python (8000)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Map | Leaflet.js + OpenStreetMap (free, no API key) |
| Backend | Node.js 20, TypeScript, Express, ws (WebSocket) |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| AI Service | Python 3.11, FastAPI, scikit-learn, NumPy, pandas |
| Auth | JWT, bcryptjs, RBAC |
| Container | Docker + Docker Compose |

---

## 📁 Project Structure

```
rapidroute-ai/
├── frontend/                  # React + Vite + Tailwind
│   └── src/
│       ├── pages/             # Driver, ControlRoom, Officer, Hospital, Admin
│       ├── components/        # Map, Dashboard, AI, Simulation
│       ├── store/             # Zustand state (auth, emergency)
│       ├── hooks/             # useWebSocket
│       └── services/          # api.ts (Axios)
│
├── backend/                   # Node.js + Express + TypeScript
│   └── src/
│       ├── modules/           # auth, ambulance, emergency, route, traffic, ...
│       ├── websocket/         # WebSocket server + broadcast
│       ├── services/          # aiService.ts, notificationService.ts
│       └── config/            # db, redis, config
│
├── ai-service/                # Python + FastAPI + scikit-learn
│   ├── main.py                # FastAPI entry point
│   ├── models/                # route_model.py, junction_model.py
│   ├── prediction/            # coordinator.py (Emergency Agent)
│   └── training/              # synthetic_data.py
│
├── database/
│   ├── migrations/001_init.sql
│   └── seed/seed.sql
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js 20+** — [Download](https://nodejs.org)
- **Python 3.11+** — already installed ✅
- **PostgreSQL 16** — [Download](https://www.postgresql.org/download/) or use Docker
- **Redis 7** — [Download](https://redis.io/download) or use Docker

### Option A — Docker (Recommended, one command)

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Start everything
docker-compose up --build

# Open: http://localhost (frontend) | http://localhost:4000/health (backend)
```

### Option B — Manual Setup

```bash
# 1. Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 2. Create the database
psql -U postgres -c "CREATE DATABASE rapidroute_db;"
psql -U postgres -d rapidroute_db -f database/migrations/001_init.sql
psql -U postgres -d rapidroute_db -f database/seed/seed.sql

# 3. Install & start backend
cd backend
npm install
npm run dev          # Starts on http://localhost:4000

# 4. Install & start AI service (new terminal)
cd ai-service
pip install -r requirements.txt
python main.py       # Starts on http://localhost:8000

# 5. Install & start frontend (new terminal)
cd frontend
npm install
npm run dev          # Starts on http://localhost:5173
```

---

## 🔑 Environment Variables

See [`.env.example`](.env.example) for all variables. Key ones:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens (min 32 chars) |
| `AI_SERVICE_URL` | URL of the Python AI service |
| `REDIS_URL` | Redis connection URL |
| `MAP_PROVIDER` | `osm` (default) \| `mapbox` \| `google` |
| `MAPBOX_TOKEN` | Optional Mapbox token for premium tiles |

---

## 👤 Demo Credentials

All passwords: **`Password123!`**

| Role | Email |
|---|---|
| Admin | `admin@rapidroute.ai` |
| Control Room | `control@rapidroute.ai` |
| Driver | `driver1@rapidroute.ai` |
| Traffic Officer | `officer1@rapidroute.ai` |
| Hospital | `hospital1@rapidroute.ai` |

---

## 🎮 Demo Script (3-5 Minutes)

1. Login as **Control Room** → open Simulation tab
2. Click **"Start Emergency Simulation"**
3. Watch the control room receive 🚨 alert instantly (WebSocket)
4. Switch to AI Insights tab → see route recommendation with reasoning
5. See junction alerts appear in the Alerts tab
6. Click **"Trigger Congestion"** — AI recommends alternate route
7. Click **"Complete Emergency"** → analytics card shows time saved

Simultaneously open in separate tabs:
- **Officer** (`officer1@rapidroute.ai`) — watch alerts appear, click Acknowledge
- **Hospital** (`hospital1@rapidroute.ai`) — watch incoming ambulance ETA update

---

## 📡 API Reference

### Auth
```
POST /api/auth/login       { email, password }
POST /api/auth/register    { name, email, password, role }
GET  /api/auth/me
POST /api/auth/refresh     { refreshToken }
```

### Emergencies
```
GET  /api/emergencies/active
POST /api/emergencies              { ambulance_id, hospital_id, priority }
PATCH /api/emergencies/:id/activate
PATCH /api/emergencies/:id/end
```

### Routes
```
GET  /api/routes/recommended?emergency_id=...
POST /api/routes/recalculate       { emergency_id, reason }
```

### Simulation
```
POST /api/simulation/start
POST /api/simulation/tick          { emergency_id }
POST /api/simulation/congestion    { emergency_id }
POST /api/simulation/complete      { emergency_id }
```

### AI Service (Port 8000)
```
POST /route/recommend     { origin: {lat,lng}, destination: {lat,lng} }
POST /eta/predict         { distance_km, current_speed, junction_count, ... }
POST /junctions/prioritize { junctions: [...], ambulance_eta }
```

---

## 🧪 Testing

```bash
# Backend unit tests (no DB needed)
cd backend
npm test

# AI service tests
cd ai-service
pip install pytest
pytest tests/ -v
```

---

## 🐳 Docker

```bash
# Start all services
docker-compose up --build

# Start specific service
docker-compose up postgres redis

# View logs
docker-compose logs -f backend
```

---

## 🌐 WebSocket Events

| Event | Direction | Payload |
|---|---|---|
| `AMBULANCE_EMERGENCY_STARTED` | Server → All | emergency, ambulance, hospital |
| `AMBULANCE_LOCATION_UPDATED` | Server → All | ambulanceId, lat, lng, speed |
| `ETA_UPDATED` | Server → All | emergencyId, etaMinutes |
| `JUNCTION_ALERT_CREATED` | Server → All | alert, junctionId |
| `JUNCTION_ALERT_ACKNOWLEDGED` | Server → All | alertId |
| `ROUTE_CHANGED` | Server → All | emergencyId, reason |
| `EMERGENCY_COMPLETED` | Server → All | emergencyId, timeSaved |
| `TRAFFIC_UPDATED` | Server → All | junctionId, traffic_level |
| `HOSPITAL_NOTIFIED` | Server → Hospital | hospitalId, etaMinutes |

---

## 📊 Analytics Tracked Per Emergency

- Original ETA vs AI-optimized ETA
- Actual trip duration
- **Estimated time saved**
- Number of junctions alerted / cleared
- Number of route changes triggered
- Average speed during emergency

---

## 🗺️ Seed Data (Hyderabad, India)

- **5 Ambulances**: TS-01-AA-1234 through TS-01-AE-7890
- **3 Hospitals**: KIMS, Yashoda, Apollo (real Hyderabad locations)
- **15 Junctions**: Major Hyderabad intersections with realistic coordinates
- **15 Traffic Officers**: One per junction
- **Traffic Levels**: Pre-seeded with realistic congestion data

---

## 🔮 Future Improvements

- [ ] Real traffic API integration (Google Maps, HERE)
- [ ] Government traffic signal hardware API (when authorized)
- [ ] SMS notifications (Twilio integration)
- [ ] Mobile app (React Native) for drivers and officers
- [ ] ML model trained on real historical traffic data
- [ ] Multi-city support
- [ ] Offline-first mode for areas with poor connectivity
- [ ] Voice alerts for officers

---

## ⚠️ Important Disclaimer

> This prototype **simulates** coordination between ambulances, traffic control rooms, and traffic officers. It does **not** directly control real traffic signals, interact with government police systems, or access any live traffic infrastructure. All location data, officer assignments, and traffic conditions shown are either simulated or entered manually.
>
> The architecture is designed so that authorized government APIs could be integrated in the future through the existing service interfaces.

---

## 📜 License

MIT License — see LICENSE file.

---

*Built for AI Hackathon — Hyderabad, India 🇮🇳*

# Smart Emergency Response System

A real-time ambulance dispatch simulation for Bangalore, built as part of a Design Thinking Lab (DTL) project. The system selects the optimal ambulance and nearest hospital using live road routing, simulates the full dispatch lifecycle with police jurisdiction awareness, and visualizes everything on an interactive map.

## Features

- **Click-to-dispatch** — click anywhere on the Bangalore map to place a patient; the system finds and dispatches the best ambulance automatically
- **Prep-time aware selection** — ambulance selection factors in each unit's preparation time + road travel time, not just geographic proximity
- **Optimal hospital routing** — picks the hospital with the shortest road ETA from the patient's location
- **Live ambulance animation** — the ambulance marker moves along the real road route in real time
- **Dynamic speed simulation** — speed randomizes between 25–60 km/h every 5 seconds to model variable traffic conditions
- **Police jurisdiction detection** — 6 zone overlays (Central, East, South, West, North, North-East) with a ray-casting algorithm; clearance is requested automatically when the ambulance enters a zone
- **Police clearance SLA** — 8-second SLA per zone; dispatchers can manually approve or reject; auto-times out if unacknowledged
- **Phase tracking** — IDLE → PREPARING → TO\_PATIENT → TO\_HOSPITAL → DONE
- **Traffic-aware ETA refresh** — ETA is recalculated from current ambulance position every 2 minutes via the backend
- **Zone timeline + clearance log** — footer panel shows zone transition history and all police clearance outcomes

## Tech Stack

| Layer     | Technology                                         |
|-----------|----------------------------------------------------|
| Frontend  | React 19, Vite, React-Leaflet, OpenStreetMap tiles |
| Backend   | Python 3, Flask, Flask-CORS, Gunicorn              |
| Routing   | Mapbox Directions API (driving profile)            |
| Database  | Firebase Firestore                                 |
| Deploy    | Render (backend), static hosting (frontend)        |

## Project Structure

```
DTL_new/
├── backend/
│   ├── app.py                  # Flask API routes
│   ├── seed_data.py            # Seeds Firestore with ambulances & hospitals
│   ├── requirements.txt
│   ├── Procfile                # Render deploy entry (gunicorn)
│   └── services/
│       ├── firebase.py         # Firestore client init
│       ├── dispatch.py         # Ambulance + hospital selection logic
│       └── routing.py          # Mapbox route fetch
└── ambulance-frontend/
    ├── src/
    │   ├── App.jsx             # Main app, state machine, simulation logic
    │   └── MapView.jsx         # Leaflet map, markers, zone polygons
    └── package.json
```

## Setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:

```
MAPBOX_TOKEN=your_mapbox_token_here
```

Place your Firebase service account JSON at `backend/firebase_key.json`, then seed Firestore:

```bash
python seed_data.py
```

Run the development server:

```bash
python app.py
```

### Frontend

```bash
cd ambulance-frontend
npm install
npm run dev
```

The frontend points to `https://dtl-backend.onrender.com` by default. For local development, change `API_BASE` in `src/App.jsx` to `http://localhost:5000`.

## API Reference

| Method | Endpoint           | Description                                           |
|--------|--------------------|-------------------------------------------------------|
| GET    | `/api/health`      | Health check                                          |
| GET    | `/api/ambulances`  | List all ambulances from Firestore                    |
| GET    | `/api/hospitals`   | List all hospitals from Firestore                     |
| POST   | `/api/dispatch`    | Select ambulance + hospital and compute full route    |
| POST   | `/api/refresh-eta` | Recalculate ETA from the ambulance's current position |

### POST `/api/dispatch`

**Request:**
```json
{ "patientLat": 12.9716, "patientLng": 77.5946 }
```

**Response:**
```json
{
  "ambulance":   { "id": "A7", "lat": 12.96, "lng": 77.63, "prepTime": 1 },
  "hospital":    { "id": "H2", "name": "Apollo Hospital Sheshadripuram", "lat": 12.9896, "lng": 77.5772 },
  "route":       [[12.96, 77.63], ...],
  "distance_km": 4.21,
  "eta":         9.7
}
```

`eta` = ambulance prep time + road travel time to patient + road travel time to hospital (minutes).

## Data

**20 ambulances** distributed across Bangalore neighborhoods (MG Road, Ulsoor, Indiranagar, Whitefield, Hebbal, Kengeri, etc.), each with a `prepTime` of 1–5 minutes.

**15 hospitals** including Manipal, Apollo, Fortis, Narayana Health City, St. John's, Aster CMI, Ramaiah Memorial, Vydehi, and others spread across the city.

**6 police jurisdiction zones** covering central Bangalore, defined as lat/lng polygons and rendered as colored overlays on the map.

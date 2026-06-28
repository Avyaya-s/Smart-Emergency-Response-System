# Technical Report: Smart Emergency Response System

**Design Thinking Lab — Semester 3**
**Segment:** Smart Emergency Response System
**Author:** Avyaya S Yekkar

---

## 1. Problem Statement

Emergency medical response in dense urban environments like Bangalore suffers from two critical inefficiencies:

1. Dispatchers select the geographically closest ambulance, ignoring the time an ambulance needs to prepare before it can depart (crew assembly, equipment checks, etc.).
2. No mechanism exists to proactively coordinate with police across jurisdiction boundaries, causing delays at intersections and in high-traffic corridors.

The result is a systematically suboptimal ETA — the ambulance that *looks* closest on a map is often not the one that arrives first.

---

## 2. Objectives

- Build a dispatch algorithm that minimises total time-to-patient, accounting for both preparation time and real road travel time.
- Integrate police jurisdiction awareness so that clearance requests are raised automatically as the ambulance moves through the city.
- Simulate realistic variable traffic so the system reflects on-road behaviour rather than static estimates.
- Provide a visual, interactive interface so the entire dispatch lifecycle can be observed and demonstrated.

---

## 3. System Architecture

```
Browser (React + Leaflet)
        │
        │  POST /api/dispatch
        │  POST /api/refresh-eta
        ▼
Flask Backend (Render)
        │
        ├── services/dispatch.py   ── Ambulance & hospital selection
        ├── services/routing.py    ── Mapbox Directions API
        └── services/firebase.py   ── Firestore read/write
                │
                ├── Firestore (ambulances, hospitals)
                └── Mapbox Directions API
```

The frontend and backend are fully decoupled. The React app drives the entire dispatch animation and police logic client-side; the backend handles only routing computation and data storage.

---

## 4. Dispatch Algorithm

### 4.1 Ambulance Selection

For every available ambulance, the backend computes:

```
ETA_ambulance = prepTime + road_travel_time(ambulance → patient)
```

`road_travel_time` is fetched from the Mapbox Directions API (driving profile), which accounts for real road topology, one-ways, and distance. The ambulance with the minimum `ETA_ambulance` is selected.

This directly addresses the core problem: an ambulance 3 km away with a 1-minute prep time will be preferred over one 2 km away with a 5-minute prep time if road conditions make the latter slower overall.

### 4.2 Hospital Selection

After fixing the patient location, the backend computes:

```
ETA_hospital = road_travel_time(patient → hospital)
```

for every hospital in Firestore. The hospital with the shortest ETA from the patient is selected. This is computed in the same API call as ambulance selection, and routes are cached so no duplicate Mapbox calls are made.

### 4.3 Route Caching

All Mapbox calls within a single dispatch request share a `route_cache` dictionary keyed by `"start_lat,start_lng->end_lat,end_lng"`. Once a route is fetched for ambulance evaluation, it is reused to build the response — no leg is ever fetched twice.

### 4.4 Total ETA

```
total_ETA = amb_prepTime + travel(ambulance → patient) + travel(patient → hospital)
```

The frontend receives this as a single `eta` value and counts it down in real time.

---

## 5. Frontend Simulation

### 5.1 Phase State Machine

The dispatch lifecycle is modelled as a finite state machine:

| Phase        | Description                                              |
|--------------|----------------------------------------------------------|
| `IDLE`       | Waiting for a patient location to be placed on the map   |
| `PREPARING`  | Ambulance is readying for departure (prepTime countdown) |
| `TO_PATIENT` | Ambulance is en route to patient                         |
| `TO_HOSPITAL`| Ambulance is transporting patient to hospital            |
| `DONE`       | Mission complete                                         |

The frontend transitions between phases automatically based on ambulance position and timers.

### 5.2 Route Animation

The ambulance marker moves along the Mapbox-provided polyline using smooth interpolation:

```
stepKm = speedKmph / 3600   (distance per 1-second tick)
nextPos = moveTowards(currentPos, routeWaypoint, stepKm)
```

`moveTowards` uses the Haversine formula to compute the great-circle distance between two points and then linearly interpolates along that bearing by `stepKm`. This gives smooth sub-waypoint movement rather than jumping directly between route nodes.

Arrival is detected when the ambulance comes within 50 metres of the destination.

### 5.3 Dynamic Speed Simulation

Every 5 seconds, the simulation draws a new speed from the range 25–60 km/h:

```js
const randomSpeed = 25 + Math.random() * 35;
```

This simulates variable urban traffic — the ambulance moves faster on open stretches and slows in congested corridors — without requiring live traffic data. The current speed is displayed in the header and footer telemetry panel.

### 5.4 Traffic-Aware ETA Refresh

Every 2 minutes while the ambulance is in motion, the frontend sends the current ambulance position to `/api/refresh-eta`. The backend calls Mapbox from that position to the current destination and returns a fresh road ETA. This corrects drift that accumulates when simulated speed diverges from actual Mapbox estimates.

---

## 6. Police Jurisdiction System

### 6.1 Zone Definitions

Six police zones cover central Bangalore, defined as lat/lng polygon arrays:

| Zone ID | Name         | Colour |
|---------|--------------|--------|
| PS1     | Central Zone | Red    |
| PS2     | East Zone    | Green  |
| PS3     | South Zone   | Orange |
| PS4     | West Zone    | Blue   |
| PS5     | North Zone   | Purple |
| PS6     | North-East Zone | Teal |

Zones are rendered as semi-transparent polygon overlays on the Leaflet map. Map clicks pass through them (non-interactive) so zone presence does not interfere with patient placement.

### 6.2 Real-Time Zone Detection

On every animation tick, the ambulance's current position is tested against all zone polygons using the **ray-casting algorithm**:

```js
function isPointInPolygon(point, polygon) {
  // Cast a ray along the x-axis from point.
  // Count how many polygon edges it crosses.
  // Odd count = inside, even = outside.
}
```

This is O(n) per polygon (n = number of vertices) and runs comfortably at 1 Hz on the client.

When the ambulance crosses from outside a zone to inside, a clearance request is created and the police coordination panel is activated. When it exits all zones, the active zone is cleared.

### 6.3 Clearance Request & SLA

Each zone entry produces a clearance request object:

```js
{
  id: crypto.randomUUID(),
  zone: zoneName,
  status: "PENDING",      // → ACKED | TIMEOUT
  requestedAt: Date.now(),
  ackAt: null,
  responseSec: null
}
```

The dispatcher sees a floating popup with the zone name, an SLA countdown, and Approve / Reject buttons. The SLA is **8 seconds**. If no action is taken, a `setTimeout` automatically transitions the request to `TIMEOUT`. A `setInterval` running every 300 ms updates the countdown display.

Outcomes are logged in a clearance history panel in the sidebar and in the zone timeline footer. An audio alert fires on zone entry; success/error sounds fire on approval/rejection.

### 6.4 Next-Zone Prediction

As the ambulance moves, the system continuously computes which zone it is most likely to enter next:

```js
policeZones.forEach(zone => {
  const centroid = zoneCentroid(zone.polygon);
  const d = haversineDist(movingPos, centroid);
  // Track closest zone not currently occupied
});
```

The predicted zone is available as state for display; this is groundwork for proactive clearance requests before the ambulance crosses the boundary.

---

## 7. Data

### Ambulances (20 units)

Spread across Bangalore: MG Road, Ulsoor, Rajajinagar, Domlur, Malleshwaram, Jayanagar, Indiranagar, Yeshwanthpur, Hebbal, Yelahanka, BTM Layout, Electronic City, Whitefield, Marathahalli, Banashankari, Peenya, KR Puram, Kengeri, Kanakapura Road, Nelamangala.

Each has a `prepTime` between 1 and 5 minutes assigned to reflect varying station readiness.

### Hospitals (15 units)

Manipal Hospital, Apollo (Sheshadripuram), Fortis (Cunningham Road), Narayana Health City, St. John's Medical College, Columbia Asia Hebbal, Sakra World (Marathahalli), Aster CMI Hebbal, Ramaiah Memorial, Vydehi (Whitefield), BGS Global (Kengeri), People Tree (Yeshwanthpur), Sanjay Gandhi (Jayanagar), Cloudnine (Indiranagar), NIMHANS Emergency Center.

Data is stored in Firebase Firestore and seeded via `seed_data.py`.

---

## 8. API Design

| Method | Endpoint           | Input                                     | Output                                           |
|--------|--------------------|-------------------------------------------|--------------------------------------------------|
| POST   | `/api/dispatch`    | `patientLat`, `patientLng`                | ambulance, hospital, route polyline, eta, distance |
| POST   | `/api/refresh-eta` | `lat`, `lng`, `phase`, `patientLoc`, `hospitalLoc` | updated `eta`                         |
| GET    | `/api/ambulances`  | —                                         | all ambulance records                            |
| GET    | `/api/hospitals`   | —                                         | all hospital records                             |

All responses are JSON. CORS is enabled globally to support local frontend development.

---

## 9. Key Design Decisions

**Why prep time?** Initial brainstorming revealed that ambulances in Indian cities often have significant delays before departure — crew is off-shift, vehicle needs to be brought around, or equipment needs to be loaded. Ignoring this makes the "closest ambulance" heuristic systematically wrong.

**Why Mapbox over straight-line distance?** Bangalore's road network has many one-ways, flyovers, and dead ends. Straight-line distance bears little relation to actual travel time in a dense urban grid.

**Why client-side police logic?** The clearance decision is inherently interactive (a human dispatcher approves or rejects). Keeping the state machine on the frontend avoids round-trips for every zone check and keeps the backend stateless.

**Why random speed rather than live traffic?** The project goal was simulation and demonstration. Randomised speed in a realistic range (25–60 km/h) is sufficient to show that ETA is dynamic and traffic-aware, without requiring a live traffic API subscription.

**Why route caching?** A single dispatch request can evaluate 20 ambulances and 15 hospitals. Without caching, that would be up to 35 sequential Mapbox calls. The cache brings this down to at most 20 + 15 calls per dispatch, with repeated legs served from memory.

---

## 10. Limitations & Future Work

- Police zones are hardcoded polygons; a production system would pull zone boundaries from a geospatial database.
- Ambulance status (`AVAILABLE`) is static in Firestore; a real system would update status as units are dispatched and freed.
- The police clearance system is simulated in the browser; a real deployment would push notifications to actual police dispatch consoles via WebSockets or a messaging queue.
- Speed randomisation does not correlate with known traffic hotspots; integrating a live traffic layer (e.g., Mapbox Traffic API) would make estimates more accurate.
- No authentication is implemented; the backend is fully open.

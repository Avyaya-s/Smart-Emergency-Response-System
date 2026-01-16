import { useEffect, useState } from "react";
import MapView from "./MapView";

const API_BASE = "http://localhost:5000";

function haversineDist(a, b) {
  const R = 6371;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLon = (b[1] - a[1]) * Math.PI / 180;
  const lat1 = a[0] * Math.PI / 180;
  const lat2 = b[0] * Math.PI / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.sqrt(x));
}

function moveTowards(curr, target, stepKm) {
  const dist = haversineDist(curr, target);
  if (dist === 0 || dist < stepKm) return target;

  const ratio = stepKm / dist;

  const lat = curr[0] + (target[0] - curr[0]) * ratio;
  const lng = curr[1] + (target[1] - curr[1]) * ratio;

  return [lat, lng];
}

function ProgressBar({ value }) {
  return (
    <div style={{
      height: "10px",
      background: "#e0e0e0",
      borderRadius: "6px",
      overflow: "hidden",
      marginTop: "6px"
    }}>
      <div style={{
        height: "100%",
        width: `${value}%`,
        background: "#4caf50",
        transition: "width 0.5s"
      }} />
    </div>
  );
}

export default function App() {
  const [patientLoc, setPatientLoc] = useState(null);
  const [route, setRoute] = useState([]);
  const [routeIndex, setRouteIndex] = useState(0);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [eta, setEta] = useState(null);
  const [initialEta, setInitialEta] = useState(null);
  const [movingPos, setMovingPos] = useState(null);
  const [phase, setPhase] = useState("IDLE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 📡 Fetch dispatch from backend
  useEffect(() => {
    if (!patientLoc) return;

    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientLat: patientLoc[0],
        patientLng: patientLoc[1]
      })
    })
      .then(res => res.json())
      .then(data => {
        setSelectedAmbulance(data.ambulance);
        setSelectedHospital(data.hospital);
        setRoute(data.route);
        setRouteIndex(0);
        setMovingPos(data.route[0]);
        setInitialEta(null);
        setEta(null);
        setPhase("TO_PATIENT");
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Backend not reachable");
        setLoading(false);
      });

  }, [patientLoc]);

  // 🚑 Move ambulance along route polyline
  useEffect(() => {
    if (!route || route.length === 0 || routeIndex >= route.length) return;

    const interval = setInterval(() => {
      setMovingPos(prev => {
        const speedKmph = 40;
        const stepKm = speedKmph / 3600;

        const target = route[routeIndex];
        const nextPos = moveTowards(prev, target, stepKm);

        const distToTarget = haversineDist(nextPos, target);

        if (distToTarget < 0.01) {
          setRouteIndex(i => i + 1);
          return target;
        }

        return nextPos;
      });

      // 🔢 ETA calculation based on remaining route
      let remainingKm = 0;
      const curr = movingPos || route[0];

      if (routeIndex < route.length - 1) {
        remainingKm += haversineDist(curr, route[routeIndex]);

        for (let i = routeIndex; i < route.length - 1; i++) {
          remainingKm += haversineDist(route[i], route[i + 1]);
        }
      }

      const speed = 40;
      const remainingMinutes = (remainingKm / speed) * 60;

      setEta(prev => {
        if (initialEta === null && remainingMinutes > 0) {
          setInitialEta(remainingMinutes);
        }
        return Math.max(0, remainingMinutes);
      });

    }, 1000);

    return () => clearInterval(interval);
  }, [route, routeIndex, movingPos, initialEta]);

  const cardStyle = {
    background: "white",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "12px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)"
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", height: "100vh" }}>

      {/* SIDEBAR */}
      <div style={{
        padding: "18px",
        borderRight: "1px solid #ddd",
        background: "#ffffff"
      }}>
        <h2 style={{ marginBottom: "12px" }}>🚑 Smart Dispatch</h2>

        <div style={cardStyle}>
          <b>Patient Location</b>
          <div style={{ fontSize: "13px", color: "#555" }}>
            {patientLoc
              ? `${patientLoc[0].toFixed(4)}, ${patientLoc[1].toFixed(4)}`
              : "Click on map"}
          </div>
        </div>

        <div style={cardStyle}>
          <b>Status</b>
          <div style={{ fontSize: "13px", marginTop: "6px", lineHeight: "1.6" }}>
            <div>{phase !== "IDLE" ? "✓" : "●"} Dispatched</div>
            <div>{phase === "TO_PATIENT" || phase === "TO_HOSPITAL" || phase === "DONE" ? "✓" : "○"} Enroute to Patient</div>
            <div>{phase === "TO_HOSPITAL" || phase === "DONE" ? "✓" : "○"} Enroute to Hospital</div>
            <div>{phase === "DONE" ? "✓" : "○"} Arrived</div>
          </div>
        </div>

        {eta !== null && (
          <div style={cardStyle}>
            <b>ETA</b>
            <div style={{ fontSize: "22px", marginTop: "4px" }}>
              {eta.toFixed(1)} min
            </div>

            {initialEta && (
              <ProgressBar
                value={Math.min(100, ((initialEta - eta) / initialEta) * 100)}
              />
            )}
          </div>
        )}

        {selectedAmbulance && (
          <div style={cardStyle}>
            <b>Ambulance</b>
            <div>ID: {selectedAmbulance.id}</div>
          </div>
        )}

        {selectedHospital && (
          <div style={cardStyle}>
            <b>Hospital</b>
            <div>{selectedHospital.name}</div>
          </div>
        )}

        {loading && <p>⏳ Computing dispatch...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>

      {/* MAP */}
      <MapView
        patientLoc={patientLoc}
        setPatientLoc={setPatientLoc}
        selectedAmbulance={selectedAmbulance}
        selectedHospital={selectedHospital}
        movingPos={movingPos}
        route={route}
      />

    </div>
  );
}

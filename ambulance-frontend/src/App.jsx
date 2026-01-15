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

export default function App() {
  const [patientLoc, setPatientLoc] = useState(null);
  const [route, setRoute] = useState([]);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [eta, setEta] = useState(null);
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
        setMovingPos([data.ambulance.lat, data.ambulance.lng]);
        setPhase("TO_PATIENT");
        setRoute(data.route);
        setEta(null);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Backend not reachable");
        setLoading(false);
      });

  }, [patientLoc]);

  // 🚑 Movement simulation
  useEffect(() => {
    if (!movingPos || !selectedHospital || !patientLoc) return;

    const target =
      phase === "TO_PATIENT"
        ? patientLoc
        : [selectedHospital.lat, selectedHospital.lng];

    const interval = setInterval(() => {
      setMovingPos(prev => {
        const speedKmph = 40;
        const stepKm = speedKmph / 3600;

        const nextPos = moveTowards(prev, target, stepKm);

        const remainingKm = haversineDist(nextPos, target);
        const remainingMinutes = (remainingKm / speedKmph) * 60;
        setEta(Math.max(0, remainingMinutes));

        // Arrival detection
        if (
          Math.abs(nextPos[0] - target[0]) < 0.0001 &&
          Math.abs(nextPos[1] - target[1]) < 0.0001
        ) {
          if (phase === "TO_PATIENT") {
            setPhase("TO_HOSPITAL");
          } else {
            setPhase("DONE");
          }
          return target;
        }

        return nextPos;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, selectedHospital, patientLoc, movingPos]);

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
      <div style={{ padding: "16px", borderRight: "1px solid #ddd", background: "#f8f9fa" }}>
        <h2>🚑 Dispatch Dashboard</h2>

        <div style={cardStyle}>
          <h4>Patient</h4>
          {patientLoc
            ? <p>{patientLoc[0].toFixed(4)}, {patientLoc[1].toFixed(4)}</p>
            : <p>Select location on map</p>}
        </div>

        {loading && <p>⏳ Computing dispatch...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

        {eta !== null && !loading && selectedAmbulance && selectedHospital && (
          <>
            <div style={cardStyle}>
              <h4>Ambulance</h4>
              <p>ID: {selectedAmbulance.id}</p>
              <p>Status: {phase === "DONE" ? "Arrived" : "En route"}</p>
            </div>

            <div style={cardStyle}>
              <h4>Hospital</h4>
              <p>{selectedHospital.name}</p>
            </div>

            <div style={cardStyle}>
              <h4>ETA</h4>
              <h3>{eta.toFixed(1)} min</h3>
            </div>
          </>
        )}
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

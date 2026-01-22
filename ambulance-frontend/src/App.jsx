import { useEffect, useState } from "react";
import MapView from "./MapView";

const API_BASE = "http://localhost:5000";

/*
  NOTE:
  haversineDist + moveTowards are used ONLY for
  visual animation between polyline points.
*/

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
  if (!curr) return target;
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
  const [prepRemaining, setPrepRemaining] = useState(0);
  const [speedKmph, setSpeedKmph] = useState(40);


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
        if (!data || !data.route || data.route.length === 0) {
          throw new Error("Invalid dispatch response");
        }

        setSelectedAmbulance(data.ambulance);
        setSelectedHospital(data.hospital);
        setRoute(data.route);
        setRouteIndex(0);
        setMovingPos(data.route[0]);

        const prep = data.ambulance.prepTime || 0;

        setPrepRemaining(prep);
        setInitialEta(data.eta);
        setEta(data.eta);

        if (prep > 0) {
          setPhase("PREPARING");
        } else {
          setPhase("TO_PATIENT");
        }

        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Dispatch failed");
        setLoading(false);
      });

  }, [patientLoc]);

  // ⏳ Preparation countdown
  useEffect(() => {
    if (phase !== "PREPARING" || prepRemaining <= 0) return;

    const timer = setInterval(() => {
      setPrepRemaining(prev => {
        if (prev <= 1) {
          setPhase("TO_PATIENT");
          return 0;
        }
        return prev - 1;
      });

      // ETA decreases during prep
      setEta(prev => (prev > 0 ? prev - 1 : 0));

    }, 60000); // every minute

    return () => clearInterval(timer);
  }, [phase, prepRemaining]);

  // 🚦 Dynamic speed variation
  useEffect(() => {
    if (phase !== "TO_PATIENT" && phase !== "TO_HOSPITAL") return;

    const speedTimer = setInterval(() => {
      const randomSpeed = 25 + Math.random() * 35; // 25–60 km/h
      console.log("🚦 Speed changed:", randomSpeed.toFixed(1), "km/h");

      setSpeedKmph(randomSpeed);
    }, 5000); // update every 5 seconds

    return () => clearInterval(speedTimer);
  }, [phase]); 


  // 🚑 Move ambulance along route (only after prep)
  useEffect(() => {
    if (
      phase !== "TO_PATIENT" &&
      phase !== "TO_HOSPITAL"
    ) return;

    if (!route || route.length === 0 || routeIndex >= route.length) return;

    const interval = setInterval(() => {
      setMovingPos(prev => {
        
        const stepKm = speedKmph / 3600;

        const target = route[routeIndex];
        const nextPos = moveTowards(prev, target, stepKm);

        const distToTarget = haversineDist(nextPos, target);

        if (distToTarget < 0.01) {
          setRouteIndex(i => i + 1);
          return target;
        }
        // 🎯 Arrival detection
        if (phase === "TO_PATIENT") {
          const distToPatient = haversineDist(nextPos, patientLoc);
          if (distToPatient < 0.02) {
            console.log("✅ Patient reached");
            setPhase("TO_HOSPITAL");
          }
        }

        if (phase === "TO_HOSPITAL") {
          const hospPos = [
            selectedHospital.lat,
            selectedHospital.lng
          ];
          const distToHospital = haversineDist(nextPos, hospPos);
          if (distToHospital < 0.02) {
            console.log("🏁 Hospital reached");
            setPhase("DONE");
          }
        }

        return nextPos;
      });

      // ETA countdown while moving
      setEta(prev => (prev > 0 ? prev - (1 / 60) : 0));

    }, 1000);

    return () => clearInterval(interval);
  }, [route, routeIndex, phase]);

  // 🔄 Traffic-aware ETA refresh
  useEffect(() => {
    if (
      phase !== "TO_PATIENT" &&
      phase !== "TO_HOSPITAL"
    ) return;

    if (!movingPos) return;

    const refreshTimer = setInterval(() => {
      fetch(`${API_BASE}/api/refresh-eta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: movingPos[0],
          lng: movingPos[1],
          phase,
          patientLoc,
          hospitalLoc: selectedHospital
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data?.eta) setEta(data.eta);
        })
        .catch(() => console.warn("ETA refresh failed"));
    }, 120000); // every 2 minutes

    return () => clearInterval(refreshTimer);
  }, [phase, movingPos, selectedHospital, patientLoc]);


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
            <div>{phase !== "IDLE" ? "✓" : "○"} Preparing</div>
            <div>{phase === "TO_PATIENT" || phase === "TO_HOSPITAL" || phase === "DONE" ? "✓" : "○"} Enroute to Patient</div>
            <div>{phase === "TO_HOSPITAL" || phase === "DONE" ? "✓" : "○"} Enroute to Hospital</div>
            <div>{phase === "DONE" ? "✓" : "○"} Arrived</div>
          </div>
        </div>

        {phase === "PREPARING" && (
          <div style={cardStyle}>
            <b>Preparing Ambulance</b>
            <div style={{ fontSize: "18px" }}>
              {prepRemaining} min remaining
            </div>
          </div>
        )}

        {eta !== null && (
          <div style={cardStyle}>
            <b>ETA</b>
            {(phase === "TO_PATIENT" || phase === "TO_HOSPITAL") && (
              <div style={cardStyle}>
                <b>Current Speed</b>
                <div style={{ fontSize: "18px" }}>
                  {speedKmph.toFixed(1)} km/h
                </div>
              </div>
            )}

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

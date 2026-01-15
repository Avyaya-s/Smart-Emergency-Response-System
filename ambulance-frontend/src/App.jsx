import { useEffect, useState } from "react";
import MapView from "./MapView";

const dummyAmbulances = [
  { id: "A1", lat: 12.975, lng: 77.59, status: "AVAILABLE" },
  { id: "A2", lat: 12.965, lng: 77.60, status: "PREPARING" },
  { id: "A3", lat: 12.985, lng: 77.58, status: "AVAILABLE" },
];

const dummyHospitals = [
  { id: "H1", name: "City Hospital", lat: 12.972, lng: 77.585 },
  { id: "H2", name: "Metro Hospital", lat: 12.98, lng: 77.605 },
];

function haversine(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.sqrt(x));
}

export default function App() {
  const [patientLoc, setPatientLoc] = useState(null);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [eta, setEta] = useState(null);
  const [movingPos, setMovingPos] = useState(null);
  const [phase, setPhase] = useState("IDLE"); // TO_PATIENT, TO_HOSPITAL

  useEffect(() => {
    if (!patientLoc) return;

    const p = { lat: patientLoc[0], lng: patientLoc[1] };

    let bestAmb = null;
    let minDist = Infinity;

    dummyAmbulances.forEach(a => {
      const d = haversine(p, a);
      if (d < minDist) {
        minDist = d;
        bestAmb = a;
      }
    });

    let bestHosp = null;
    minDist = Infinity;

    dummyHospitals.forEach(h => {
      const d = haversine(p, h);
      if (d < minDist) {
        minDist = d;
        bestHosp = h;
      }
    });

    const speed = 40; // km/h
    const prepTime = 3; // minutes
    const travelTime = (minDist / speed) * 60;

    setSelectedAmbulance(bestAmb);
    setSelectedHospital(bestHosp);
    setEta(prepTime + travelTime);
    setMovingPos([bestAmb.lat, bestAmb.lng]);
    setPhase("TO_PATIENT");

  }, [patientLoc]);

  // 🚑 movement simulation
  useEffect(() => {
    if (!movingPos || !selectedHospital || !patientLoc) return;

    const target =
      phase === "TO_PATIENT"
        ? patientLoc
        : [selectedHospital.lat, selectedHospital.lng];

    const interval = setInterval(() => {
      setMovingPos(prev => {
        const lat = prev[0] + (target[0] - prev[0]) * 0.07;
        const lng = prev[1] + (target[1] - prev[1]) * 0.07;

        if (Math.abs(lat - target[0]) < 0.0003 && Math.abs(lng - target[1]) < 0.0003) {
          if (phase === "TO_PATIENT") setPhase("TO_HOSPITAL");
          else setPhase("DONE");
          return target;
        }

        return [lat, lng];
      });

      setEta(e => (e > 0 ? e - 0.05 : 0));

    }, 1000);

    return () => clearInterval(interval);
  }, [movingPos, phase]);

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

        {eta && (
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
        ambulances={dummyAmbulances}
        hospitals={dummyHospitals}
        selectedAmbulance={selectedAmbulance}
        selectedHospital={selectedHospital}
        movingPos={movingPos}
      />

    </div>
  );
}

import { useEffect, useState } from "react";
import MapView from "./MapView";

const API_BASE = "http://127.0.0.1:5000";

// 🚓 Dummy Police Jurisdictions (polygons)
// 🚓 Dummy Police Jurisdictions (fictional shapes)
// 🚓 Dummy Police Jurisdictions (fictional but realistic)
const policeZones = [
  {
    id: "PS1",
    name: "Central Zone",
    color: "red",
    polygon: [
      [12.9695, 77.5862],
      [12.9768, 77.5885],
      [12.9789, 77.5959],
      [12.9744, 77.6018],
      [12.9682, 77.5996],
      [12.9669, 77.5918]
    ]
  },
  {
    id: "PS2",
    name: "East Zone",
    color: "green",
    polygon: [
      [12.9792, 77.6023],
      [12.9867, 77.6064],
      [12.9911, 77.6138],
      [12.9850, 77.6209],
      [12.9783, 77.6154],
      [12.9765, 77.6081]
    ]
  },
  {
    id: "PS3",
    name: "South Zone",
    color: "orange",
    polygon: [
      [12.9628, 77.5871],
      [12.9692, 77.5938],
      [12.9681, 77.6024],
      [12.9607, 77.6031],
      [12.9568, 77.5950],
      [12.9589, 77.5883]
    ]
  },
  {
    id: "PS4",
    name: "West Zone",
    color: "blue",
    polygon: [
      [12.9711, 77.5752],
      [12.9784, 77.5786],
      [12.9769, 77.5859],
      [12.9702, 77.5884],
      [12.9654, 77.5832],
      [12.9671, 77.5771]
    ]
  },
  {
    id: "PS5",
    name: "North Zone",
    color: "purple",
    polygon: [
      [12.9851, 77.5867],
      [12.9923, 77.5891],
      [12.9958, 77.5968],
      [12.9897, 77.6027],
      [12.9831, 77.5982],
      [12.9822, 77.5903]
    ]
  },
  {
    id: "PS6",
    name: "North-East Zone",
    color: "teal",
    polygon: [
      [12.9902, 77.6049],
      [12.9975, 77.6096],
      [13.0001, 77.6172],
      [12.9943, 77.6224],
      [12.9876, 77.6181],
      [12.9864, 77.6102]
    ]
  }
];




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

function MultiSegmentProgressBar({ prepValue, travelValue }) {
  return (
    <div style={{
      height: "12px",
      background: "#e2e8f0",
      borderRadius: "6px",
      overflow: "hidden",
      marginTop: "8px",
      display: "flex"
    }}>
      {/* Preparation Segment (Orange) */}
      <div style={{
        height: "100%",
        width: `${prepValue}%`,
        background: "#f59e0b",
        transition: "width 0.5s ease"
      }} />
      {/* Travel Segment (Green) */}
      <div style={{
        height: "100%",
        width: `${travelValue}%`,
        background: "#10b981",
        transition: "width 0.5s ease"
      }} />
    </div>
  );
}

// 📐 Point in Polygon check (Ray Casting Algorithm)
function isPointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect =
      ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

function zoneCentroid(polygon) {
  let lat = 0, lng = 0;
  polygon.forEach(p => {
    lat += p[0];
    lng += p[1];
  });
  return [lat / polygon.length, lng / polygon.length];
}

function createClearanceRequest(zoneName) {
  return {
    id: crypto.randomUUID(),
    zone: zoneName,
    status: "PENDING",      // PENDING | ACKED | TIMEOUT
    requestedAt: Date.now(),
    ackAt: null,
    responseSec: null
  };
}

function PolicePopup({ request, onApprove, onReject, slaRemaining }) {
  if (!request) return null;

  return (
    <div style={{
      position: "fixed",
      top: "20px",
      right: "20px",
      width: "280px",
      padding: "14px",
      background: "white",
      borderRadius: "10px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
      zIndex: 9999
    }}>

      <b>🚓 Police Clearance</b>

      <div style={{ fontSize: "13px", marginTop: "6px" }}>
        <div><b>Zone:</b> {request.zone}</div>
        <div><b>Status:</b> {request.status}</div>
      </div>

      {/* ⏱ SLA Countdown */}
      {slaRemaining !== null && request.status === "PENDING" && (
        <div style={{
          marginTop: "8px",
          fontSize: "13px",
          color: slaRemaining < 2 ? "#d32f2f" : "#333"
        }}>
          ⏱ SLA expires in: <b>{slaRemaining.toFixed(1)} sec</b>
        </div>
      )}

      {/* 🎛 Controls */}
      {request.status === "PENDING" && (
        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
          <button
            onClick={onApprove}
            style={{
              flex: 1,
              background: "#4caf50",
              color: "white",
              border: "none",
              padding: "6px",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            ✅ Approve
          </button>

          <button
            onClick={onReject}
            style={{
              flex: 1,
              background: "#f44336",
              color: "white",
              border: "none",
              padding: "6px",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            ❌ Reject
          </button>
        </div>
      )}

      {request.status === "ACKED" && (
        <div style={{ marginTop: "10px", color: "#2e7d32" }}>
          ✅ Clearance granted
        </div>
      )}

      {request.status === "TIMEOUT" && (
        <div style={{ marginTop: "10px", color: "#d32f2f" }}>
          ⚠ Clearance timed out
        </div>
      )}
    </div>
  );
}

function playAlertSound() {
  try {
    const audio = new Audio("/alert.mp3");   // put alert.mp3 inside /public folder
    audio.play();
  } catch (err) {
    console.warn("Audio playback failed:", err);
  }
}

function playSuccessSound() {
  const audio = new Audio("/success.mp3");
  audio.volume = 0.7;
  audio.play().catch(err => {
    console.warn("Success sound failed:", err);
  });
}

function playErrorSound() {
  const audio = new Audio("/error.mp3");
  audio.volume = 0.7;
  audio.play().catch(() => {});
}

function HeaderBar({
  phase,
  eta,
  speedKmph,
  activePoliceZone,
  loading
}) {
  return (
    <div style={{
      height: "56px",
      background: "#0d47a1",
      color: "white",
      display: "flex",
      alignItems: "center",
      padding: "0 18px",
      justifyContent: "space-between",
      fontSize: "14px",
      fontWeight: 500
    }}>
      
      {/* Left */}
      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <div style={{ fontWeight: 600 }}>
          🚑 Smart Emergency Dispatch
        </div>

        <div>
          Status: <b>{phase}</b>
        </div>

        {eta !== null && (
          <div>
            ETA: <b>{eta.toFixed(1)} min</b>
          </div>
        )}

        {(phase === "TO_PATIENT" || phase === "TO_HOSPITAL") && (
          <div>
            Speed: <b>{speedKmph.toFixed(0)} km/h</b>
          </div>
        )}

        {activePoliceZone && (
          <div>
            Zone: <b>{activePoliceZone.name}</b>
          </div>
        )}
      </div>

      {/* Right */}
      <div>
        {loading ? "🟡 Computing..." : "🟢 System Online"}
      </div>
    </div>
  );
}

function FooterPanel({
  zoneTimeline,
  policeHistory,
  speedKmph
}) {
  return (
    <div style={{
      height: "140px",
      background: "#f5f7fa",
      borderTop: "1px solid #ddd",
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: "12px",
      padding: "10px 14px",
      fontSize: "12px"
    }}>

      {/* Zone Timeline */}
      <div>
        <b>🗺 Zone Timeline</b>
        <div style={{ marginTop: "6px" }}>
          {zoneTimeline.slice(-5).reverse().map((z, i) => (
            <div key={i}>
              {z.time} — {z.zone}
            </div>
          ))}
          {zoneTimeline.length === 0 && <div>No zone transitions yet</div>}
        </div>
      </div>

      {/* Police History */}
      <div>
        <b>🚓 Police Clearance</b>
        <div style={{ marginTop: "6px" }}>
          {policeHistory.slice(-5).reverse().map((r, i) => (
            <div key={i}>
              {new Date(r.requestedAt).toLocaleTimeString()} — {r.zone} — {r.status}
            </div>
          ))}
          {policeHistory.length === 0 && <div>No clearance requests yet</div>}
        </div>
      </div>

      {/* Speed */}
      <div>
        <b>🚦 Speed Telemetry</b>
        <div style={{ marginTop: "6px", fontSize: "16px" }}>
          {speedKmph.toFixed(1)} km/h
        </div>
        <div style={{ fontSize: "11px", color: "#555" }}>
          Updated every 5 seconds
        </div>
      </div>

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
  const [activePoliceZone, setActivePoliceZone] = useState(null);
  const [policeAlert, setPoliceAlert] = useState(null);
  const [zoneTimeline, setZoneTimeline] = useState([]);
  const [predictedZone, setPredictedZone] = useState(null);
  const [slaRemaining, setSlaRemaining] = useState(null);
  const cardStyle = {
  background: "#ffffff",
  padding: "16px",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  border: "1px solid #f1f5f9",
};
  // 🚓 Police Clearance Platform
  const POLICE_SLA_SEC = 8;
  // Calculate distance to current destination
  const distToPatient = movingPos && patientLoc ? haversineDist(movingPos, patientLoc) : 0;
  const distToHospital = movingPos && selectedHospital ? haversineDist(movingPos, [selectedHospital.lat, selectedHospital.lng]) : 0;

  // Determine current travel metrics
  const currentDist = phase === "TO_PATIENT" ? distToPatient : (phase === "TO_HOSPITAL" ? distToHospital : 0);
    const [policePlatform, setPolicePlatform] = useState({
      activeRequest: null,   // current clearance request
      history: []            // all past requests
    });
  // Calculate total remaining distance in km
  const remainingDistance = movingPos && (phase === "TO_PATIENT" || phase === "TO_HOSPITAL")
    ? (phase === "TO_PATIENT" 
        ? haversineDist(movingPos, patientLoc) 
        : haversineDist(movingPos, [selectedHospital.lat, selectedHospital.lng]))
    : 0;

  // Calculate progress percentages
  const totalTime = (selectedAmbulance?.prepTime || 0) + (initialEta || 0);
  const prepProgress = totalTime > 0 ? (prepRemaining / totalTime) * 100 : 0;
  const travelProgress = totalTime > 0 ? (eta / totalTime) * 100 : 0;
    // ✅ ADD FUNCTIONS HERE 👇

  function approveClearance() {
    setPolicePlatform(prev => {
      if (!prev.activeRequest) return prev;

      const now = Date.now();
      const responseSec =
        (now - prev.activeRequest.requestedAt) / 1000;

      console.log("✅ Manual APPROVE clicked");
      playSuccessSound();
      return {
        activeRequest: {
          ...prev.activeRequest,
          status: "ACKED",
          ackAt: now,
          responseSec
        },
        history: prev.history.map(r =>
          r.id === prev.activeRequest.id
            ? { ...r, status: "ACKED", ackAt: now, responseSec }
            : r
        )
      };
    });
  }

  function rejectClearance() {
    setPolicePlatform(prev => {
      if (!prev.activeRequest) return prev;

      const now = Date.now();
      const responseSec =
        (now - prev.activeRequest.requestedAt) / 1000;

      console.log("❌ Manual REJECT clicked");
      playErrorSound();
      return {
        activeRequest: {
          ...prev.activeRequest,
          status: "TIMEOUT",
          ackAt: now,
          responseSec
        },
        history: prev.history.map(r =>
          r.id === prev.activeRequest.id
            ? { ...r, status: "TIMEOUT", ackAt: now, responseSec }
            : r
        )
      };
    });
  }

  function handlePatientReached() {
  console.log("🚑 Patient reached → Switching to hospital leg");

  playSuccessSound();

  // Move to hospital phase
  setPhase("TO_HOSPITAL");

  // Reset route index so animation continues cleanly
  setRouteIndex(0);

  // Clear police-related state for next leg
  setActivePoliceZone(null);
  setPoliceAlert(null);
  setZoneTimeline([]);
  setPolicePlatform(prev => ({
    activeRequest: null,
    history: prev.history   // keep history
  }));

  // Optional visual confirmation
  alert("✅ Patient picked up. Proceeding to hospital.");
}

function handleHospitalReached() {
  console.log("🏁 Hospital reached → Mission completed");

  playSuccessSound();

  setPhase("DONE");
  setEta(0);

  // Clear everything
  setActivePoliceZone(null);
  setPoliceAlert(null);
  setZoneTimeline([]);
  setPolicePlatform({ activeRequest: null, history: [] });

  alert("🏥 Patient delivered successfully. Mission completed.");
}

  // 🚓 Police ACK Simulation Engine


  // ⏱️ SLA Auto Timeout Guard
  useEffect(() => {
    const req = policePlatform.activeRequest;
    if (!req || req.status !== "PENDING") return;

    const timer = setTimeout(() => {
      console.warn("⚠ Police SLA breached automatically");

      setPolicePlatform(prev => {
        if (!prev.activeRequest) return prev;

        const now = Date.now();
        const responseSec =
          (now - prev.activeRequest.requestedAt) / 1000;

        return {
          activeRequest: {
            ...prev.activeRequest,
            status: "TIMEOUT",
            ackAt: now,
            responseSec
          },
          history: prev.history.map(r =>
            r.id === prev.activeRequest.id
              ? { ...r, status: "TIMEOUT", ackAt: now, responseSec }
              : r
          )
        };
      });

    }, POLICE_SLA_SEC * 1000);

    return () => clearTimeout(timer);
  }, [policePlatform.activeRequest]);




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
        // 🎯 Arrival detection
// 🎯 Arrival detection (stable)
          if (phase === "TO_PATIENT") {
            const distToPatient = haversineDist(nextPos, patientLoc);

            if (distToPatient <= 0.05) {
              console.log("✅ Patient reached");

              setPhase("TO_HOSPITAL");
              setRouteIndex(0);          // reset index for clean continuation
              return nextPos;           // stop further processing this tick
            }
          }

          if (phase === "TO_HOSPITAL") {
            const hospPos = [
              selectedHospital.lat,
              selectedHospital.lng
            ];

            const distToHospital = haversineDist(nextPos, hospPos);

            if (distToHospital <= 0.05) {
              console.log("🏁 Hospital reached");

              setPhase("DONE");
              return nextPos;
            }
          }



        return nextPos;
      });

      // ETA countdown while moving
      setEta(prev => (prev > 0 ? prev - (1 / 60) : 0));

    }, 1000);

    return () => clearInterval(interval);
  }, [route, routeIndex, phase]);

  // 🚓 Police jurisdiction detection
  useEffect(() => {
    if (!movingPos) return;

    let detectedZone = null;

    for (const zone of policeZones) {
      if (isPointInPolygon(movingPos, zone.polygon)) {
        detectedZone = zone;
        break;
      }
    }

  // Entered new zone
  if (
    detectedZone &&
    (!activePoliceZone || detectedZone.id !== activePoliceZone.id)
  ) {
    console.log("🚨 Entered police jurisdiction:", detectedZone.name);

   setActivePoliceZone(detectedZone);
   // 🚓 Send clearance request
// 🚓 Create new clearance request
  const request = createClearanceRequest(detectedZone.name);

  setPolicePlatform(prev => ({
    activeRequest: request,
    history: [...prev.history, request]
  }));
  playAlertSound();


   setPoliceAlert(`🚓 Entered ${detectedZone.name}. Police notified for clearance.`);

setZoneTimeline(prev => [
  ...prev,
  {
    zone: detectedZone.name,
    time: new Date().toLocaleTimeString()
  }
]);

  }

  // Exited all zones
  if (!detectedZone && activePoliceZone) {
    console.log("➡️ Exited police jurisdiction:", activePoliceZone.name);
    setActivePoliceZone(null);
  }

}, [movingPos]);

// 🔮 Predict next police zone
useEffect(() => {
  if (!movingPos) return;

  let closest = null;
  let bestDist = Infinity;

  policeZones.forEach(zone => {
    if (activePoliceZone && zone.id === activePoliceZone.id) return;

    const centroid = zoneCentroid(zone.polygon);
    const d = haversineDist(movingPos, centroid);

    if (d < bestDist) {
      bestDist = d;
      closest = zone;
    }
  });

  if (closest) {
    setPredictedZone(closest);
  }

}, [movingPos, activePoliceZone]);



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

  useEffect(() => {
  const req = policePlatform.activeRequest;
  if (!req || req.status !== "PENDING") {
    setSlaRemaining(null);
    return;
  }

  const timer = setInterval(() => {
    const elapsed = (Date.now() - req.requestedAt) / 1000;
    const remaining = Math.max(0, POLICE_SLA_SEC - elapsed);
    setSlaRemaining(remaining);
  }, 300);

  return () => clearInterval(timer);
}, [policePlatform.activeRequest]);





 // Paste this inside your App component return
return (
  <div style={{
    height: "100vh",
    display: "grid",
    gridTemplateRows: "70px 1fr 40px",
    backgroundColor: "#f8fafc",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#1e293b",
    overflow: "hidden"
  }}>

    {/* ================= HEADER ================= */}
    <header style={{ 
      zIndex: 100, 
      background: "#ffffff", 
      borderBottom: "1px solid #e2e8f0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)" 
    }}>
      <HeaderBar
        phase={phase}
        eta={eta}
        speedKmph={speedKmph}
        activePoliceZone={activePoliceZone}
        loading={loading}
      />
    </header>

    {/* ================= MAIN CONTENT ================= */}
    <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", overflow: "hidden" }}>

      {/* LEFT SIDEBAR: METRICS & CONTROLS */}
      <aside style={{
        background: "#ffffff",
        borderRight: "1px solid #e2e8f0",
        padding: "20px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        boxShadow: "2px 0 10px rgba(0,0,0,0.02)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ fontSize: "24px" }}>🚑</span>
          <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>Smart Dispatch</h2>
        </div>

        {/* 1. PRIMARY METRICS GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={cardStyle}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Live ETA</div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: "#2563eb" }}>
                {eta ? `${eta.toFixed(1)}m` : "--"}
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                Dist: <b>{remainingDistance.toFixed(2)} km</b>
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Speed</div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a" }}>
                {speedKmph.toFixed(0)} <span style={{ fontSize: "12px", color: "#94a3b8" }}>km/h</span>
              </div>
            </div>
          </div>

  {/* 2. MISSION TIMELINE (Logistics Style) */}
  <div style={{ ...cardStyle, background: "#0f172a", color: "#f8fafc" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
      <b style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>Live Mission Track</b>
      <span style={{ fontSize: "10px", color: "#4ade80", fontWeight: "bold", background: "rgba(74, 222, 128, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
        {phase}
      </span>
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: "24px", position: "relative" }}>
      
      {/* Step 1: Preparation */}
      <div style={{ display: "flex", gap: "16px", position: "relative", zIndex: 2 }}>
        <div style={{ 
          width: "24px", height: "24px", borderRadius: "50%", 
          background: phase === "PREPARING" ? "#f59e0b" : "#4ade80",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", border: "4px solid #0f172a"
        }}>
          {phase === "PREPARING" ? "⏳" : "✓"}
        </div>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 700 }}>Ambulance Prep</div>
          <div style={{ fontSize: "11px", color: phase === "PREPARING" ? "#fbbf24" : "#94a3b8" }}>
            {phase === "PREPARING" ? `Time left: ${prepRemaining}m` : "Ready for dispatch"}
          </div>
        </div>
      </div>

      {/* Step 2: To Patient */}
      <div style={{ display: "flex", gap: "16px", position: "relative", zIndex: 2 }}>
        <div style={{ 
          width: "24px", height: "24px", borderRadius: "50%", 
          background: phase === "TO_PATIENT" ? "#2563eb" : (phase === "TO_HOSPITAL" || phase === "DONE" ? "#4ade80" : "#334155"),
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", border: "4px solid #0f172a"
        }}>
          {phase === "TO_PATIENT" ? "🚑" : (phase === "TO_HOSPITAL" || phase === "DONE" ? "✓" : "•")}
        </div>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 700 }}>To Patient</div>
          {phase === "TO_PATIENT" ? (
            <div style={{ fontSize: "11px", color: "#60a5fa" }}>
              <b>{currentDist.toFixed(2)} km</b> • ETA: <b>{eta?.toFixed(1)}m</b>
            </div>
          ) : (
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              {phase === "PREPARING" ? "Waiting for prep..." : "Arrived at location"}
            </div>
          )}
        </div>
      </div>

      {/* Step 3: To Hospital */}
      <div style={{ display: "flex", gap: "16px", position: "relative", zIndex: 2 }}>
        <div style={{ 
          width: "24px", height: "24px", borderRadius: "50%", 
          background: phase === "TO_HOSPITAL" ? "#8b5cf6" : (phase === "DONE" ? "#4ade80" : "#334155"),
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", border: "4px solid #0f172a"
        }}>
          {phase === "TO_HOSPITAL" ? "🏥" : (phase === "DONE" ? "✓" : "•")}
        </div>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 700 }}>To Hospital</div>
          {phase === "TO_HOSPITAL" ? (
            <div style={{ fontSize: "11px", color: "#a78bfa" }}>
              <b>{currentDist.toFixed(2)} km</b> • ETA: <b>{eta?.toFixed(1)}m</b>
            </div>
          ) : (
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              {phase === "DONE" ? "Mission completed" : "Pending patient pickup"}
            </div>
          )}
        </div>
      </div>

    {/* Vertical Path Line */}
    <div style={{ 
      position: "absolute", left: "11px", top: "10px", bottom: "10px", 
      width: "2px", background: "#1e293b", zIndex: 1 
    }} />
  </div>
</div>

        {/* 3. POLICE COORDINATION (Conditional) */}
        {policeAlert && (
          <div style={{ ...cardStyle, background: "#fff1f2", border: "1px solid #fecaca", color: "#991b1b" }}>
            <b style={{ fontSize: "12px" }}>⚠️ ALERT: POLICE JURISDICTION</b>
            <div style={{ fontSize: "13px", marginTop: "4px" }}>{policeAlert}</div>
          </div>
        )}

        {/* 4. CLEARANCE HISTORY */}
        {policePlatform.history.length > 0 && (
          <div style={cardStyle}>
            <b style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Clearance Log</b>
            <div style={{ fontSize: "11px", marginTop: "8px" }}>
              {policePlatform.history.slice(-3).reverse().map(r => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", padding: "6px 0" }}>
                  <span>{r.zone}</span>
                  <span style={{ color: r.status === "APPROVED" ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. ASSET DETAILS */}
        <div style={{ marginTop: "auto" }}>
          <div style={{ padding: "12px", background: "#f1f5f9", borderRadius: "8px", fontSize: "12px" }}>
            <div style={{ marginBottom: "4px" }}><b>Vehicle:</b> {selectedAmbulance?.id || "N/A"}</div>
            <div><b>Hospital:</b> {selectedHospital?.name || "Assigning..."}</div>
          </div>
        </div>

        {/* 6. LEGEND */}
        <div style={{ padding: "10px 0" }}>
          <b style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase" }}>Jurisdiction Legend</b>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
            {policeZones.map(zone => (
              <div key={zone.id} style={{ display: "flex", alignItems: "center", fontSize: "10px", color: "#64748b" }}>
                <div style={{ width: "8px", height: "8px", background: zone.color, marginRight: "4px", borderRadius: "2px" }} />
                {zone.name}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* RIGHT SIDE: MAP VIEW */}
      <section style={{ position: "relative", overflow: "hidden", background: "#cbd5e1" }}>
        <MapView
          patientLoc={patientLoc}
          setPatientLoc={setPatientLoc}
          selectedAmbulance={selectedAmbulance}
          selectedHospital={selectedHospital}
          movingPos={movingPos}
          route={route}
          policeZones={policeZones}
        />
        
        {/* FLOATING POLICE ACTION POPUP */}
        <div style={{ position: "absolute", top: "20px", right: "20px", zIndex: 1000 }}>
          <PolicePopup
            request={policePlatform.activeRequest}
            onApprove={approveClearance}
            onReject={rejectClearance}
            slaRemaining={slaRemaining}
          />
        </div>

        {loading && (
          <div style={{ position: "absolute", bottom: "20px", left: "20px", background: "white", padding: "8px 16px", borderRadius: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
            <span className="animate-spin">⏳</span> Computing optimal route...
          </div>
        )}
      </section>
    </div>

    {/* ================= FOOTER ================= */}
    <footer style={{
      background: "#0f172a",
      color: "#64748b",
      fontSize: "11px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      borderTop: "1px solid #1e293b"
    }}>
      <div style={{ display: "flex", gap: "20px" }}>
        <span>STATUS: <span style={{ color: "#4ade80" }}>ONLINE</span></span>
        <span>LATENCY: 22ms</span>
      </div>
      <div style={{ letterSpacing: "1px", fontWeight: 600 }}>SMART EMERGENCY RESPONSE SYSTEM • LIVE SIMULATION</div>
      <div>{new Date().toLocaleDateString()}</div>
    </footer>
  </div>
);
}

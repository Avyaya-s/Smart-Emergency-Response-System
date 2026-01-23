import { useEffect, useState } from "react";
import MapView from "./MapView";

const API_BASE = "http://localhost:5000";

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
  
  // 🚓 Police Clearance Platform
  const POLICE_SLA_SEC = 8;

  const [policePlatform, setPolicePlatform] = useState({
    activeRequest: null,   // current clearance request
    history: []            // all past requests
  });


  // 🚓 Police ACK Simulation Engine
useEffect(() => {
  const req = policePlatform.activeRequest;
  if (!req || req.status !== "PENDING") return;

  const delayMs = 2000 + Math.random() * 8000;

  const timer = setTimeout(() => {
    const now = Date.now();
    const responseSec = (now - req.requestedAt) / 1000;

    const finalStatus =
      responseSec > POLICE_SLA_SEC ? "TIMEOUT" : "ACKED";

    setPolicePlatform(prev => ({
      activeRequest: {
        ...req,
        status: finalStatus,
        ackAt: now,
        responseSec
      },
      history: prev.history.map(r =>
        r.id === req.id
          ? { ...r, status: finalStatus, ackAt: now, responseSec }
          : r
      )
    }));
  }, delayMs);

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
        background: "#ffffff",
        height: "100vh",
        overflowY: "auto"
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




            {policeAlert && (
              <div style={{
              ...cardStyle,
              background: "#e3f2fd",
              border: "1px solid #2196f3"
            }}>
              <b>Police Coordination</b>
              <div style={{ fontSize: "14px", marginTop: "6px" }}>
                {policeAlert}
              </div>
            </div>
          )}
        {/* 🔮 Predicted Next Zone */}
        {predictedZone && (
          <div style={cardStyle}>
            <b>Next Likely Jurisdiction</b>
            <div style={{ fontSize: "14px", marginTop: "4px" }}>
              {predictedZone.name}
            </div>
          </div>
        )}

          {/* 🕒 Zone Transition Timeline */}
          {zoneTimeline.length > 0 && (
            <div style={cardStyle}>
              <b>Zone Timeline</b>
              <div style={{ fontSize: "12px", marginTop: "6px" }}>
                {zoneTimeline.slice(-5).map((entry, idx) => (
                  <div key={idx}>
                    {entry.time} — {entry.zone}
                  </div>
                ))}
              </div>
            </div>
          )}
      
                  {/* 🚓 Police Clearance Platform */}
        {policePlatform.activeRequest && (
          <div style={cardStyle}>
            <b>Police Clearance</b>

            <div style={{ fontSize: "13px", marginTop: "6px" }}>
              <div><b>Zone:</b> {policePlatform.activeRequest.zone}</div>
              <div><b>Status:</b> {policePlatform.activeRequest.status}</div>

              {policePlatform.activeRequest.responseSec && (
                <div>
                  <b>Response:</b>{" "}
                  {policePlatform.activeRequest.responseSec.toFixed(1)} sec
                </div>
              )}

              {policePlatform.activeRequest.status === "PENDING" && (
                <div>⏳ Awaiting police clearance...</div>
              )}

              {policePlatform.activeRequest.status === "ACKED" && (
                <div>✅ Clearance granted</div>
              )}

              {policePlatform.activeRequest.status === "TIMEOUT" && (
                <div>⚠ SLA breached</div>
              )}
            </div>
          </div>
        )}

        {/* 📜 Police Clearance History */}
        {policePlatform.history.length > 0 && (
          <div style={cardStyle}>
            <b>Clearance History</b>
            <div style={{ fontSize: "12px", marginTop: "6px" }}>
              {policePlatform.history.slice(-5).map(r => (
                <div key={r.id}>
                  {new Date(r.requestedAt).toLocaleTimeString()} — {r.zone} — {r.status}
                </div>
              ))}
            </div>
          </div>
        )}


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
        {/* 🗺️ Zone Legend */}
        <div style={cardStyle}>
          <b>Police Zones</b>
          <div style={{ marginTop: "8px" }}>
            {policeZones.map(zone => (
              <div
                key={zone.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "6px",
                  fontSize: "13px"
                }}
              >
                <div
                  style={{
                    width: "14px",
                    height: "14px",
                    background: zone.color,
                    marginRight: "8px",
                    borderRadius: "3px"
                  }}
                />
                {zone.name}
              </div>
            ))}
          </div>
        </div> 
      </div>

      {/* MAP */}
      <MapView
        patientLoc={patientLoc}
        setPatientLoc={setPatientLoc}
        selectedAmbulance={selectedAmbulance}
        selectedHospital={selectedHospital}
        movingPos={movingPos}
        route={route}
        policeZones={policeZones}
      />


    </div>
  );
}

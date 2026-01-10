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
    setEta((prepTime + travelTime).toFixed(1));

  }, [patientLoc]);

  return (
    <div>
      <div style={{ position: "absolute", zIndex: 1000, padding: 10, background: "white" }}>
        <h3>Ambulance Dispatch Prototype</h3>
        <p>Click map to select patient location</p>

        {eta && (
          <>
            <p><b>Selected Ambulance:</b> {selectedAmbulance.id}</p>
            <p><b>Hospital:</b> {selectedHospital.name}</p>
            <p><b>Estimated ETA:</b> {eta} mins</p>
          </>
        )}
      </div>

      <MapView
        patientLoc={patientLoc}
        setPatientLoc={setPatientLoc}
        ambulances={dummyAmbulances}
        hospitals={dummyHospitals}
        selectedAmbulance={selectedAmbulance}
        selectedHospital={selectedHospital}
      />
    </div>
  );
}

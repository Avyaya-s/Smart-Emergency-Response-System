import { useState } from "react";
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

export default function App() {
  const [patientLoc, setPatientLoc] = useState(null);

  return (
    <div>
      <div style={{ position: "absolute", zIndex: 1000, padding: 10 }}>
        <h3>Ambulance System Prototype</h3>
        <p>Click on map to select patient location</p>
        {patientLoc && (
          <p>
            Patient: {patientLoc[0].toFixed(4)}, {patientLoc[1].toFixed(4)}
          </p>
        )}
      </div>

      <MapView
        patientLoc={patientLoc}
        setPatientLoc={setPatientLoc}
        ambulances={dummyAmbulances}
        hospitals={dummyHospitals}
      />
    </div>
  );
}

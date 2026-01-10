import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});


const center = [12.9716, 77.5946];

function LocationPicker({ setPatientLoc }) {
  useMapEvents({
    click(e) {
      setPatientLoc([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function MapView({
  patientLoc,
  setPatientLoc,
  ambulances,
  hospitals,
  selectedAmbulance,
  selectedHospital
}) {
  const route = [];

  if (selectedAmbulance && patientLoc && selectedHospital) {
    route.push([selectedAmbulance.lat, selectedAmbulance.lng]);
    route.push(patientLoc);
    route.push([selectedHospital.lat, selectedHospital.lng]);
  }

  return (
    <MapContainer center={center} zoom={13} style={{ height: "100vh" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <LocationPicker setPatientLoc={setPatientLoc} />

      {patientLoc && (
        <Marker position={patientLoc}>
          <Popup>Patient Location</Popup>
        </Marker>
      )}

      {ambulances.map(a => (
        <Marker key={a.id} position={[a.lat, a.lng]}>
          <Popup>
            <b>Ambulance {a.id}</b><br />
            Status: {a.status}
          </Popup>
        </Marker>
      ))}

      {hospitals.map(h => (
        <Marker key={h.id} position={[h.lat, h.lng]}>
          <Popup><b>{h.name}</b></Popup>
        </Marker>
      ))}

      {route.length > 0 && (
        <Polyline positions={route} />
      )}
    </MapContainer>
  );
}

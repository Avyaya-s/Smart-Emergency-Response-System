import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ambulanceIcon = L.divIcon({
  html: "<div style='font-size:37px'>🚑</div>",
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const hospitalIcon = L.divIcon({
  html: "<div style='font-size:37px'>🏥</div>",
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const patientIcon = L.divIcon({
  html: "<div style='font-size:30px'>📍</div>",
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
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
  selectedAmbulance,
  selectedHospital,
  movingPos,
  route               // ✅ NEW PROP
}) {
  return (
    <MapContainer center={center} zoom={13} style={{ height: "100vh", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <LocationPicker setPatientLoc={setPatientLoc} />

      {patientLoc && (
        <Marker position={patientLoc} icon={patientIcon}>

          <Popup>Patient</Popup>
        </Marker>
      )}

      {selectedHospital && (
        <Marker position={[selectedHospital.lat, selectedHospital.lng]} icon={hospitalIcon}>
          <Popup>{selectedHospital.name}</Popup>
        </Marker>
      )}

      {movingPos && (
        <Marker position={movingPos} icon={ambulanceIcon}>

          <Popup>Ambulance</Popup>
        </Marker>
      )}

      {/* ✅ REAL ROUTE FROM BACKEND */}
      {route && route.length > 0 && (
        <Polyline positions={route} />
      )}
    </MapContainer>
  );
}

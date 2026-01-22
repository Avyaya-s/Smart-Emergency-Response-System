import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Polygon,
  useMapEvents
} from "react-leaflet";
import L from "leaflet";

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

const ambulanceIcon = L.divIcon({
  html: "<div style='font-size:37px'>🚑</div>",
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 17]
});

const hospitalIcon = L.divIcon({
  html: "<div style='font-size:37px'>🏥</div>",
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 17]
});

const patientIcon = L.divIcon({
  html: "<div style='font-size:30px'>📍</div>",
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

// Map center (Bangalore)
const center = [12.9716, 77.5946];

function LocationPicker({ setPatientLoc }) {
  useMapEvents({
    click(e) {
      console.log("Clicked:", e.latlng.lat, e.latlng.lng);
      setPatientLoc([e.latlng.lat, e.latlng.lng]);
    }
  });
  return null;
}

export default function MapView({
  patientLoc,
  setPatientLoc,
  selectedAmbulance,
  selectedHospital,
  movingPos,
  route,
  policeZones
}) {
  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <LocationPicker setPatientLoc={setPatientLoc} />

      {/* 🚓 Police Jurisdiction Zones */}
      {policeZones &&
        policeZones.map(zone => (
          <Polygon
            key={zone.id}
            positions={zone.polygon}
            interactive={false}   // ✅ Allows clicks to pass through
            pathOptions={{
              color: zone.color,
              fillColor: zone.color,
              fillOpacity: 0.25,
              weight: 2
            }}
          />

        ))}

      {/* 📍 Patient */}
      {patientLoc && (
        <Marker position={patientLoc} icon={patientIcon}>
          <Popup>Patient</Popup>
        </Marker>
      )}

      {/* 🏥 Hospital */}
      {selectedHospital && (
        <Marker
          position={[selectedHospital.lat, selectedHospital.lng]}
          icon={hospitalIcon}
        >
          <Popup>{selectedHospital.name}</Popup>
        </Marker>
      )}

      {/* 🚑 Ambulance */}
      {movingPos && (
        <Marker position={movingPos} icon={ambulanceIcon}>
          <Popup>Ambulance</Popup>
        </Marker>
      )}

      {/* 🛣️ Route */}
      {route && route.length > 0 && <Polyline positions={route} />}
    </MapContainer>
  );
}

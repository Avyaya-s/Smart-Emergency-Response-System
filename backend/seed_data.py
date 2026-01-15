from services.firebase import db

ambulances = [
    {"id": "A1", "lat": 12.975, "lng": 77.59, "status": "AVAILABLE", "prepTime": 2},
    {"id": "A2", "lat": 12.965, "lng": 77.60, "status": "AVAILABLE", "prepTime": 1},
    {"id": "A3", "lat": 12.985, "lng": 77.58, "status": "PREPARING", "prepTime": 4},
]

hospitals = [
    {"id": "H1", "name": "City Hospital", "lat": 12.972, "lng": 77.585},
    {"id": "H2", "name": "Metro Hospital", "lat": 12.98, "lng": 77.605},
]

for amb in ambulances:
    db.collection("ambulances").document(amb["id"]).set(amb)

for hosp in hospitals:
    db.collection("hospitals").document(hosp["id"]).set(hosp)

print("✅ Firestore seeded successfully.")

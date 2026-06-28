from services.firebase import db

ambulances = [
    {"id": "A1", "lat": 12.9750, "lng": 77.5900, "status": "AVAILABLE", "prepTime": 2},   # MG Road
    {"id": "A2", "lat": 12.9650, "lng": 77.6000, "status": "AVAILABLE", "prepTime": 1},   # Ulsoor
    {"id": "A3", "lat": 12.9850, "lng": 77.5800, "status": "AVAILABLE", "prepTime": 4},   # Rajajinagar
    {"id": "A4", "lat": 12.9550, "lng": 77.6100, "status": "AVAILABLE", "prepTime": 3},   # Domlur
    {"id": "A5", "lat": 12.9900, "lng": 77.5650, "status": "AVAILABLE", "prepTime": 5},   # Malleshwaram
    {"id": "A6", "lat": 12.9450, "lng": 77.5950, "status": "AVAILABLE", "prepTime": 2},   # Jayanagar
    {"id": "A7", "lat": 12.9600, "lng": 77.6300, "status": "AVAILABLE", "prepTime": 1},   # Indiranagar
    {"id": "A8", "lat": 12.9800, "lng": 77.5500, "status": "AVAILABLE", "prepTime": 4},   # Yeshwanthpur
    {"id": "A9", "lat": 13.0350, "lng": 77.5900, "status": "AVAILABLE", "prepTime": 2},   # Hebbal
    {"id": "A10","lat": 13.0850, "lng": 77.5850, "status": "AVAILABLE", "prepTime": 3},   # Yelahanka
    {"id": "A11","lat": 12.9200, "lng": 77.6100, "status": "AVAILABLE", "prepTime": 2},   # BTM
    {"id": "A12","lat": 12.9000, "lng": 77.6400, "status": "AVAILABLE", "prepTime": 4},   # Electronic City
    {"id": "A13","lat": 12.9800, "lng": 77.7200, "status": "AVAILABLE", "prepTime": 3},   # Whitefield
    {"id": "A14","lat": 12.9350, "lng": 77.6950, "status": "AVAILABLE", "prepTime": 2},   # Marathahalli
    {"id": "A15","lat": 12.9150, "lng": 77.5600, "status": "AVAILABLE", "prepTime": 1},   # Banashankari
    {"id": "A16","lat": 12.9950, "lng": 77.5250, "status": "AVAILABLE", "prepTime": 4},   # Peenya
    {"id": "A17","lat": 13.0200, "lng": 77.6400, "status": "AVAILABLE", "prepTime": 3},   # KR Puram
    {"id": "A18","lat": 12.9700, "lng": 77.5050, "status": "AVAILABLE", "prepTime": 2},   # Kengeri
    {"id": "A19","lat": 12.8800, "lng": 77.5800, "status": "AVAILABLE", "prepTime": 5},   # Kanakapura Rd
    {"id": "A20","lat": 13.0600, "lng": 77.5150, "status": "AVAILABLE", "prepTime": 3},   # Nelamangala
]


hospitals = [
    {"id": "H1", "name": "Manipal Hospital Old Airport Road", "lat": 12.9584, "lng": 77.6476},
    {"id": "H2", "name": "Apollo Hospital Sheshadripuram", "lat": 12.9896, "lng": 77.5772},
    {"id": "H3", "name": "Fortis Hospital Cunningham Road", "lat": 12.9896, "lng": 77.5921},
    {"id": "H4", "name": "Narayana Health City", "lat": 12.8913, "lng": 77.5950},
    {"id": "H5", "name": "St Johns Medical College", "lat": 12.9346, "lng": 77.6051},
    {"id": "H6", "name": "Columbia Asia Hebbal", "lat": 13.0352, "lng": 77.5970},
    {"id": "H7", "name": "Sakra World Hospital Marathahalli", "lat": 12.9352, "lng": 77.6970},
    {"id": "H8", "name": "Aster CMI Hebbal", "lat": 13.0560, "lng": 77.5930},
    {"id": "H9", "name": "Ramaiah Memorial Hospital", "lat": 13.0285, "lng": 77.5687},
    {"id": "H10","name": "Vydehi Hospital Whitefield", "lat": 12.9850, "lng": 77.7350},
    {"id": "H11","name": "BGS Global Hospital Kengeri", "lat": 12.9030, "lng": 77.4820},
    {"id": "H12","name": "People Tree Hospital Yeshwanthpur", "lat": 12.9915, "lng": 77.5530},
    {"id": "H13","name": "Sanjay Gandhi Hospital Jayanagar", "lat": 12.9255, "lng": 77.5938},
    {"id": "H14","name": "Cloudnine Hospital Indiranagar", "lat": 12.9718, "lng": 77.6410},
    {"id": "H15","name": "NIMHANS Emergency Center", "lat": 12.9416, "lng": 77.5963},
]


for amb in ambulances:
    db.collection("ambulances").document(amb["id"]).set(amb)

for hosp in hospitals:
    db.collection("hospitals").document(hosp["id"]).set(hosp)

print("✅ Firestore seeded successfully.")

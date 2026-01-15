from flask import Flask, jsonify
from flask_cors import CORS
from services.firebase import db
from flask import request
from services.dispatch import select_best_ambulance, select_nearest_hospital
from services.routing import get_route

app = Flask(__name__)
CORS(app)

@app.route("/api/health")
def health():
    return jsonify({"status": "Backend running"})

@app.route("/api/test-db")
def test_db():
    doc_ref = db.collection("test").document("hello")
    doc_ref.set({"msg": "Firebase connected successfully"})
    return jsonify({"status": "Firestore write successful"})

@app.route("/api/ambulances")
def get_ambulances():
    docs = db.collection("ambulances").stream()
    data = [doc.to_dict() for doc in docs]
    return jsonify(data)

@app.route("/api/hospitals")
def get_hospitals():
    docs = db.collection("hospitals").stream()
    data = [doc.to_dict() for doc in docs]
    return jsonify(data)

@app.route("/api/dispatch", methods=["POST"])
def dispatch():
    data = request.json

    patient = {
        "lat": data["patientLat"],
        "lng": data["patientLng"]
    }

    ambulances = [doc.to_dict() for doc in db.collection("ambulances").stream()]
    hospitals = [doc.to_dict() for doc in db.collection("hospitals").stream()]

    best_amb, _ = select_best_ambulance(patient, ambulances)
    best_hosp = select_nearest_hospital(patient, hospitals)

    # 🚗 Route: Ambulance → Patient
    route1, dist1, dur1 = get_route(best_amb, patient)

    # 🚑 Route: Patient → Hospital
    route2, dist2, dur2 = get_route(patient, best_hosp)

    full_route = route1 + route2
    total_distance = dist1 + dist2
    total_duration = dur1 + dur2

    return jsonify({
        "ambulance": best_amb,
        "hospital": best_hosp,
        "route": full_route,
        "distance_km": round(total_distance, 2),
        "eta": round(total_duration, 2)
    })

    data = request.json

    patient = {
        "lat": data["patientLat"],
        "lng": data["patientLng"]
    }

    ambulances = [doc.to_dict() for doc in db.collection("ambulances").stream()]
    hospitals = [doc.to_dict() for doc in db.collection("hospitals").stream()]

    best_amb, eta = select_best_ambulance(patient, ambulances)
    best_hosp = select_nearest_hospital(patient, hospitals)

    return jsonify({
        "ambulance": best_amb,
        "hospital": best_hosp,
        "eta": eta
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)

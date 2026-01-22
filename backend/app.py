from flask import Flask, jsonify, request
from flask_cors import CORS

from services.firebase import db
from services.dispatch import select_best_ambulance, select_nearest_hospital
from services.routing import get_route

app = Flask(__name__)
CORS(app)


# -------------------------------
# Health Check
# -------------------------------
@app.route("/api/health")
def health():
    return jsonify({"status": "Backend running"})


# -------------------------------
# Firebase Test
# -------------------------------
@app.route("/api/test-db")
def test_db():
    doc_ref = db.collection("test").document("hello")
    doc_ref.set({"msg": "Firebase connected successfully"})
    return jsonify({"status": "Firestore write successful"})


# -------------------------------
# Fetch Ambulances
# -------------------------------
@app.route("/api/ambulances")
def get_ambulances():
    docs = db.collection("ambulances").stream()
    data = [doc.to_dict() for doc in docs]
    return jsonify(data)


# -------------------------------
# Fetch Hospitals
# -------------------------------
@app.route("/api/hospitals")
def get_hospitals():
    docs = db.collection("hospitals").stream()
    data = [doc.to_dict() for doc in docs]
    return jsonify(data)


# -------------------------------
# Dispatch Endpoint
# -------------------------------
@app.route("/api/dispatch", methods=["POST"])
def dispatch():
    try:
        data = request.json

        # -----------------------
        # Patient Location
        # -----------------------
        patient = {
            "lat": float(data["patientLat"]),
            "lng": float(data["patientLng"])
        }

        # -----------------------
        # Fetch Resources
        # -----------------------
        ambulances = [doc.to_dict() for doc in db.collection("ambulances").stream()]
        hospitals = [doc.to_dict() for doc in db.collection("hospitals").stream()]

        if not ambulances:
            return jsonify({"error": "No ambulances available"}), 400

        if not hospitals:
            return jsonify({"error": "No hospitals available"}), 400

        # -----------------------
        # Select Best Ambulance (ROAD ETA)
        # -----------------------
        best_amb, amb_eta, cache = select_best_ambulance(patient, ambulances)

        # -----------------------
        # Select Nearest Hospital (ROAD ETA)
        # -----------------------
        best_hosp, hosp_eta, cache = select_nearest_hospital(
            patient, hospitals, cache
        )

        # -----------------------
        # Build Routes from Cache (NO EXTRA API CALLS)
        # -----------------------
        amb_key = f"{best_amb['lat']},{best_amb['lng']}->{patient['lat']},{patient['lng']}"
        hosp_key = f"{patient['lat']},{patient['lng']}->{best_hosp['lat']},{best_hosp['lng']}"

        route1, dist1, dur1 = cache[amb_key]
        route2, dist2, dur2 = cache[hosp_key]

        full_route = route1 + route2
        total_distance = dist1 + dist2

        # amb_eta already includes prepTime
        total_eta = amb_eta + dur2

        # -----------------------
        # Response
        # -----------------------
        return jsonify({
            "ambulance": best_amb,
            "hospital": best_hosp,
            "route": full_route,
            "distance_km": round(total_distance, 2),
            "eta": round(total_eta, 2)
        })

    except Exception as e:
        print("Dispatch error:", str(e))
        return jsonify({"error": "Dispatch failed", "details": str(e)}), 500

 
@app.route("/api/refresh-eta", methods=["POST"])
def refresh_eta():
    data = request.json

    current = {"lat": data["lat"], "lng": data["lng"]}
    phase = data["phase"]

    if phase == "TO_PATIENT":
        destination = {
            "lat": data["patientLoc"][0],
            "lng": data["patientLoc"][1]
        }
    else:
        destination = {
            "lat": data["hospitalLoc"]["lat"],
            "lng": data["hospitalLoc"]["lng"]
        }

    _, _, duration = get_route(current, destination)

    return jsonify({
        "eta": round(duration, 2)
    })


# -------------------------------
# Run Server
# -------------------------------
if __name__ == "__main__":
    app.run(debug=True, port=5000)

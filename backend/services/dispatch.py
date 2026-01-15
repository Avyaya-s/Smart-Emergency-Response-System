import math

SPEED_KMPH = 40

def haversine(a, b):
    R = 6371
    dlat = math.radians(b["lat"] - a["lat"])
    dlon = math.radians(b["lng"] - a["lng"])
    lat1 = math.radians(a["lat"])
    lat2 = math.radians(b["lat"])

    x = math.sin(dlat/2)**2 + math.sin(dlon/2)**2 * math.cos(lat1) * math.cos(lat2)
    return 2 * R * math.asin(math.sqrt(x))


def select_best_ambulance(patient, ambulances):
    best = None
    best_eta = float("inf")

    for amb in ambulances:
        dist = haversine(patient, amb)
        travel_time = (dist / SPEED_KMPH) * 60
        eta = amb["prepTime"] + travel_time

        if eta < best_eta:
            best_eta = eta
            best = amb

    return best, round(best_eta, 2)


def select_nearest_hospital(patient, hospitals):
    best = None
    best_dist = float("inf")

    for h in hospitals:
        dist = haversine(patient, h)
        if dist < best_dist:
            best_dist = dist
            best = h

    return best

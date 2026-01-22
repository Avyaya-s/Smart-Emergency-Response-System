from services.routing import get_route

def select_best_ambulance(patient, ambulances):
    best = None
    best_eta = float("inf")

    for amb in ambulances:
        if amb.get("status") != "AVAILABLE":
            continue

        try:
            _, _, route_duration = get_route(amb, patient)
        except Exception as e:
            print("Routing failed for ambulance", amb.get("id"), e)
            continue

        eta = amb.get("prepTime", 0) + route_duration

        if eta < best_eta:
            best_eta = eta
            best = amb

    if best is None:
        raise Exception("No available ambulances")

    return best, round(best_eta, 2)


def select_nearest_hospital(patient, hospitals):
    best = None
    best_time = float("inf")

    for hosp in hospitals:
        try:
            _, _, duration = get_route(patient, hosp)
        except Exception as e:
            print("Routing failed for hospital", hosp.get("id"), e)
            continue

        if duration < best_time:
            best_time = duration
            best = hosp

    if best is None:
        raise Exception("No reachable hospitals")

    return best

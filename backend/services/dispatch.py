from services.routing import get_route

def select_best_ambulance(patient, ambulances):
    best = None
    best_eta = float("inf")
    route_cache = {}

    for amb in ambulances:
        if amb.get("status") != "AVAILABLE":
            continue

        key = f"{amb['lat']},{amb['lng']}->{patient['lat']},{patient['lng']}"

        try:
            if key not in route_cache:
                route_cache[key] = get_route(amb, patient)

            _, _, route_duration = route_cache[key]

        except Exception as e:
            print("Routing failed for ambulance", amb.get("id"), e)
            continue

        eta = amb.get("prepTime", 0) + route_duration

        if eta < best_eta:
            best_eta = eta
            best = amb

    if best is None:
        raise Exception("No available ambulances")

    return best, round(best_eta, 2), route_cache


def select_nearest_hospital(patient, hospitals, route_cache):
    best = None
    best_time = float("inf")

    for hosp in hospitals:
        key = f"{patient['lat']},{patient['lng']}->{hosp['lat']},{hosp['lng']}"

        try:
            if key not in route_cache:
                route_cache[key] = get_route(patient, hosp)

            _, _, duration = route_cache[key]

        except Exception as e:
            print("Routing failed for hospital", hosp.get("id"), e)
            continue

        if duration < best_time:
            best_time = duration
            best = hosp

    if best is None:
        raise Exception("No reachable hospitals")

    return best, round(best_time, 2), route_cache

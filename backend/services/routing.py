import os
import requests
from dotenv import load_dotenv

load_dotenv()

MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN")

def get_route(start, end):
    """
    start, end = {"lat": , "lng": }
    returns list of [lat, lng] route points + distance (km) + duration (min)
    """

    url = (
        f"https://api.mapbox.com/directions/v5/mapbox/driving/"
        f"{start['lng']},{start['lat']};{end['lng']},{end['lat']}"
        f"?geometries=geojson&overview=full&access_token={MAPBOX_TOKEN}"
    )

    res = requests.get(url)
    data = res.json()

    route = data["routes"][0]
    coords = route["geometry"]["coordinates"]

    # Mapbox gives [lng, lat] → convert to [lat, lng]
    polyline = [[c[1], c[0]] for c in coords]

    distance_km = route["distance"] / 1000
    duration_min = route["duration"] / 60

    return polyline, distance_km, duration_min

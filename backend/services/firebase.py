import json
import os
import firebase_admin
from firebase_admin import credentials, firestore

if os.path.exists("firebase_key.json"):
    cred = credentials.Certificate("firebase_key.json")
else:
    service_account = json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT"])
    cred = credentials.Certificate(service_account)

firebase_admin.initialize_app(cred)
db = firestore.client()

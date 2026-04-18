from pymongo import MongoClient
import os

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://mongo:27017")
DB_NAME   = os.environ.get("DB_NAME", "cricket_db")

_client = None

def get_db():
    global _client
    if _client is None:
        try:
            _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            _client.server_info()
        except Exception as e:
            raise ConnectionError(f"MongoDB connection failed: {e}")
    return _client[DB_NAME]

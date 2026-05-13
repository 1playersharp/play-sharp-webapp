# backend/tests/test_playsharp_mongodb_srv.py
import os
import pytest
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi

ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env")

uri = os.getenv("MONGO_URL")
db_name = os.getenv("DB_NAME", "playsharp")


@pytest.fixture(scope="session")
def mongo_client():
    client = MongoClient(uri, server_api=ServerApi("1"), serverSelectionTimeoutMS=30000)
    yield client
    client.close()


def test_mongo_url_exists():
    assert uri is not None, "MONGO_URL not found in .env"


def test_atlas_connection(mongo_client):
    result = mongo_client.admin.command("ping")
    assert result.get("ok") == 1.0, "Ping failed"


def test_database_accessible(mongo_client):
    db = mongo_client[db_name]
    collections = db.list_collection_names()
    assert isinstance(collections, list), "Could not list collections"
    print(f"\n📂 Collections: {collections or 'none yet'}")


def test_leaderboard_collection_exists(mongo_client):
    db = mongo_client[db_name]
    collections = db.list_collection_names()
    assert "leaderboard" in collections, "leaderboard collection not found — run seed script first"


def test_leaderboard_has_data(mongo_client):
    db = mongo_client[db_name]
    count = db["leaderboard"].count_documents({})
    assert count > 0, f"leaderboard is empty — run seed script first"
    print(f"\n📊 Total leaderboard documents: {count}")
"""V1.6 backend tests — scanning game type + leaderboard + regression."""

import os
import time
import uuid

import pytest
import requests


BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://playsharp-demo.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

CREATED_TEST_NAMES: list[str] = []


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    yield s
    s.close()


# ---------- Scanning leaderboard ----------

class TestScanningLeaderboard:
    def test_scanning_returns_15_seeded_sorted_desc(self, session):
        r = session.get(f"{API}/leaderboard/scanning")
        assert r.status_code == 200
        data = r.json()
        assert data["gameType"] == "scanning"
        results = data["results"]
        assert len(results) >= 15, f"expected >=15, got {len(results)}"
        # Sorted by score DESC
        scores = [row["score"] for row in results]
        assert scores == sorted(scores, reverse=True), f"not desc: {scores}"
        # Top entry assertions per spec
        top = results[0]
        assert top["name"] == "Noah P."
        assert top["club"] == "South London FC"
        assert top["score"] == 100

    def test_scanning_club_filter(self, session):
        r = session.get(f"{API}/leaderboard/scanning", params={"club": "Elite Academy"})
        assert r.status_code == 200
        data = r.json()
        results = data["results"]
        assert len(results) > 0
        assert all(row["club"] == "Elite Academy" for row in results), [r["club"] for r in results]

    def test_scanning_weekly_period(self, session):
        r = session.get(f"{API}/leaderboard/scanning", params={"period": "weekly"})
        assert r.status_code == 200
        data = r.json()
        assert data["period"] == "weekly"
        # Some seeded rows are 1-14 days old; we just confirm the endpoint is correct
        # and that all returned rows are within 7 days.
        from datetime import datetime, timedelta, timezone
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        for row in data["results"]:
            created = datetime.fromisoformat(row["createdAt"].replace("Z", "+00:00"))
            assert created >= cutoff, f"row created {row['createdAt']} older than 7 days"

    def test_no_mongo_underscore_id_field(self, session):
        r = session.get(f"{API}/leaderboard/scanning")
        for row in r.json()["results"]:
            assert "_id" not in row


# ---------- POST /api/score with scanning ----------

class TestScanningScorePost:
    def test_post_scanning_score_returns_201_and_isnewclub(self, session):
        unique_club = f"TEST_ScanClub_{uuid.uuid4().hex[:6]}"
        name = f"TEST_Scanner_{uuid.uuid4().hex[:6]}"
        CREATED_TEST_NAMES.append(name)
        payload = {
            "name": name,
            "club": unique_club,
            "age": 17,
            "gameType": "scanning",
            "score": 88,
        }
        r = session.post(f"{API}/score", json=payload)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["gameType"] == "scanning"
        assert data["score"] == 88
        assert data["name"] == name
        # canonical_club normalises (Title Case + acronym preservation)
        assert isinstance(data["club"], str) and len(data["club"]) > 0
        assert data["isNewClub"] is True
        assert "id" in data
        assert "_id" not in data

    def test_post_scanning_existing_club_isnewclub_false(self, session):
        # Reuse a seeded canonical club name
        name = f"TEST_ScannerExist_{uuid.uuid4().hex[:6]}"
        CREATED_TEST_NAMES.append(name)
        payload = {
            "name": name,
            "club": "South London FC",
            "age": 17,
            "gameType": "scanning",
            "score": 75,
        }
        r = session.post(f"{API}/score", json=payload)
        assert r.status_code == 201
        assert r.json()["isNewClub"] is False

    def test_post_scanning_persists_to_leaderboard(self, session):
        name = f"TEST_ScannerPersist_{uuid.uuid4().hex[:6]}"
        CREATED_TEST_NAMES.append(name)
        payload = {
            "name": name, "club": "South London FC", "age": 16,
            "gameType": "scanning", "score": 50,
        }
        r = session.post(f"{API}/score", json=payload)
        assert r.status_code == 201

        time.sleep(0.3)
        # Verify in leaderboard with club filter (large limit so we definitely see it)
        r2 = session.get(f"{API}/leaderboard/scanning",
                         params={"club": "South London FC", "limit": 100})
        assert r2.status_code == 200
        names = [row["name"] for row in r2.json()["results"]]
        assert name in names

    def test_post_bogus_gametype_422(self, session):
        payload = {
            "name": "TEST_BogusGT", "club": "TEST_X",
            "gameType": "bogus", "score": 10,
        }
        r = session.post(f"{API}/score", json=payload)
        assert r.status_code == 422, r.text


# ---------- Regression: reaction & decision still work ----------

class TestRegressionV15Refactor:
    def test_reaction_leaderboard_asc(self, session):
        r = session.get(f"{API}/leaderboard/reaction")
        assert r.status_code == 200
        rows = r.json()["results"]
        assert len(rows) >= 15
        rts = [row["reactionTime"] for row in rows]
        assert rts == sorted(rts), "reaction should be ASC by reactionTime"

    def test_decision_leaderboard_desc(self, session):
        r = session.get(f"{API}/leaderboard/decision")
        assert r.status_code == 200
        rows = r.json()["results"]
        assert len(rows) >= 15
        scores = [row["score"] for row in rows]
        assert scores == sorted(scores, reverse=True)

    def test_clubs_endpoint(self, session):
        r = session.get(f"{API}/clubs")
        assert r.status_code == 200
        data = r.json()
        # Accept either a list or dict containing clubs
        clubs = data if isinstance(data, list) else data.get("clubs", data.get("results", []))
        # Canonical clubs from seed must be present
        joined = " ".join(str(c) for c in clubs)
        assert "South London FC" in joined
        assert "Elite Academy" in joined
        assert "Croydon Juniors" in joined

    def test_unknown_gametype_400(self, session):
        r = session.get(f"{API}/leaderboard/sniper")
        assert r.status_code == 400

    def test_post_reaction_score(self, session):
        name = f"TEST_ReactReg_{uuid.uuid4().hex[:6]}"
        CREATED_TEST_NAMES.append(name)
        r = session.post(f"{API}/score", json={
            "name": name, "club": "South London FC", "age": 16,
            "gameType": "reaction", "score": 800, "reactionTime": 250.0,
        })
        assert r.status_code == 201
        assert r.json()["gameType"] == "reaction"

    def test_post_decision_score(self, session):
        name = f"TEST_DecReg_{uuid.uuid4().hex[:6]}"
        CREATED_TEST_NAMES.append(name)
        r = session.post(f"{API}/score", json={
            "name": name, "club": "South London FC", "age": 16,
            "gameType": "decision", "score": 70,
        })
        assert r.status_code == 201
        assert r.json()["gameType"] == "decision"

    def test_post_contact(self, session):
        r = session.post(f"{API}/contact", json={
            "name": "TEST_Contact",
            "email": "test_contact@example.com",
            "message": "Hello from v1.6 regression test",
        })
        assert r.status_code in (200, 201), r.text

    def test_post_club_claim_works(self, session):
        r = session.post(f"{API}/club-claim", json={
            "club": f"TEST_ClaimClub_{uuid.uuid4().hex[:6]}",
            "contactName": "TEST_Claimer",
            "email": "claim@example.com",
            "role": "Coach",
            "squadSize": 22,
        })
        # Should be 200 or 201
        assert r.status_code in (200, 201), r.text


# ---------- Cleanup ----------

def test_zz_cleanup_test_rows():
    """Remove TEST_* rows we created so the leaderboard stays clean."""
    try:
        import asyncio
        from motor.motor_asyncio import AsyncIOMotorClient
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")

        async def _cleanup():
            cli = AsyncIOMotorClient(mongo_url)
            db = cli[db_name]
            res_scores = await db.scores.delete_many({"name": {"$regex": "^TEST_"}})
            res_contacts = await db.contacts.delete_many({"name": {"$regex": "^TEST_"}})
            res_claims = await db.club_claims.delete_many({"contactName": {"$regex": "^TEST_"}})
            cli.close()
            return res_scores.deleted_count, res_contacts.deleted_count, res_claims.deleted_count

        s, c, k = asyncio.run(_cleanup())
        print(f"\n[cleanup] removed {s} score rows, {c} contacts, {k} club_claims")
    except Exception as e:
        print(f"[cleanup] non-fatal: {e}")
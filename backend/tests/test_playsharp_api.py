"""PlaySharp backend API regression tests (V1.1)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("VITE_BACKEND_URL", "") or os.environ.get("REACT_APP_BACKEND_URL", "")
BASE_URL = BASE_URL.rstrip("/")
if not BASE_URL:
    from pathlib import Path
    env = Path("../../frontend/.env").read_text()
    for line in env.splitlines():
        if line.startswith("VITE_BACKEND_URL=") or line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")

API = f"{BASE_URL}/api"
SEEDED_CLUBS = {"South London FC", "Croydon Juniors", "Elite Academy"}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Root + clubs ----------------------------------------------------------
class TestRoot:
    def test_root_info(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data["app"] == "PlaySharp"
        assert "motto" in data and "Think quicker" in data["motto"]
        assert "version" in data

    def test_clubs_includes_seeded(self, session):
        r = session.get(f"{API}/clubs")
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body, list)
        names = {c["name"] for c in body}
        # All entries must have 'name' string
        for c in body:
            assert "name" in c and isinstance(c["name"], str)
        # Seeded clubs should be present (dynamic list but seed persists)
        assert SEEDED_CLUBS.issubset(names), f"Missing seeded clubs. Got: {names}"
        # Sorted alphabetically
        sorted_names = sorted(body, key=lambda c: c["name"])
        assert body == sorted_names, "Clubs should be sorted alphabetically"


# --- Contact ---------------------------------------------------------------
class TestContact:
    def test_contact_create_valid(self, session):
        payload = {
            "name": "TEST_Tester",
            "email": "test_tester@example.com",
            "club": "South London FC",
            "message": "Hello from backend test",
        }
        r = session.post(f"{API}/contact", json=payload)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["name"] == payload["name"]
        assert data["email"] == payload["email"]
        assert "id" in data and isinstance(data["id"], str)
        assert "createdAt" in data
        assert "_id" not in data

    def test_contact_invalid_email_returns_422(self, session):
        r = session.post(f"{API}/contact", json={
            "name": "Bad", "email": "not-an-email", "message": "x"
        })
        assert r.status_code == 422

    def test_contact_persisted_in_list(self, session):
        payload = {
            "name": "TEST_PersistCheck",
            "email": "persist_check@example.com",
            "message": "persistence test",
        }
        r = session.post(f"{API}/contact", json=payload)
        assert r.status_code == 201
        contact_id = r.json()["id"]

        r2 = session.get(f"{API}/contact?limit=200")
        assert r2.status_code == 200
        ids = [c["id"] for c in r2.json()]
        assert contact_id in ids
        for c in r2.json():
            assert "_id" not in c


# --- Score (V1.1) ----------------------------------------------------------
class TestScoreV11:
    def test_score_accepts_arbitrary_club(self, session):
        payload = {
            "name": "TEST_ArbitraryClub",
            "club": "TEST_Some Random Club FC",
            "gameType": "reaction",
            "score": 850,
            "reactionTime": 280.5,
        }
        r = session.post(f"{API}/score", json=payload)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["club"] == "TEST_Some Random Club FC"
        assert data["score"] == 850
        assert "_id" not in data

    def test_score_accepts_club_with_apostrophe(self, session):
        payload = {
            "name": "TEST_Apostrophe",
            "club": "TEST_St. Mary's Academy",
            "gameType": "decision",
            "score": 75,
        }
        r = session.post(f"{API}/score", json=payload)
        assert r.status_code == 201, r.text
        assert r.json()["club"] == "TEST_St. Mary's Academy"

    def test_score_empty_club_returns_400(self, session):
        r = session.post(f"{API}/score", json={
            "name": "TEST_EmptyClub", "club": "",
            "gameType": "reaction", "score": 500, "reactionTime": 300,
        })
        assert r.status_code == 400
        assert "club" in r.text.lower()

    def test_score_whitespace_club_returns_400(self, session):
        r = session.post(f"{API}/score", json={
            "name": "TEST_WS", "club": "   ",
            "gameType": "reaction", "score": 500, "reactionTime": 300,
        })
        assert r.status_code == 400

    def test_score_with_valid_age_stored(self, session):
        payload = {
            "name": "TEST_WithAge",
            "club": "TEST_AgeClub",
            "age": 17,
            "gameType": "reaction",
            "score": 700,
            "reactionTime": 320.0,
        }
        r = session.post(f"{API}/score", json=payload)
        assert r.status_code == 201, r.text
        assert r.json()["age"] == 17

        # Verify via leaderboard persistence
        lb = session.get(f"{API}/leaderboard/reaction",
                         params={"club": "TEST_AgeClub", "limit": 10})
        assert lb.status_code == 200
        rows = lb.json()["results"]
        ages = [row.get("age") for row in rows]
        assert 17 in ages

    def test_score_without_age_still_works(self, session):
        payload = {
            "name": "TEST_NoAge",
            "club": "TEST_NoAgeClub",
            "gameType": "decision",
            "score": 80,
        }
        r = session.post(f"{API}/score", json=payload)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data.get("age") is None

    def test_score_age_too_low_returns_422(self, session):
        r = session.post(f"{API}/score", json={
            "name": "TEST_LowAge", "club": "TEST_LowAgeClub", "age": 5,
            "gameType": "reaction", "score": 500, "reactionTime": 300,
        })
        assert r.status_code == 422

    def test_score_age_too_high_returns_422(self, session):
        r = session.post(f"{API}/score", json={
            "name": "TEST_HighAge", "club": "TEST_HighAgeClub", "age": 100,
            "gameType": "reaction", "score": 500, "reactionTime": 300,
        })
        assert r.status_code == 422

    def test_score_unknown_game_type_422(self, session):
        r = session.post(f"{API}/score", json={
            "name": "TEST_Y", "club": "South London FC",
            "gameType": "snooker", "score": 100,
        })
        assert r.status_code == 422

    def test_new_club_appears_in_clubs_list(self, session):
        unique = "TEST_UniqueClub_Playsharp_V11"
        r = session.post(f"{API}/score", json={
            "name": "TEST_New", "club": unique,
            "gameType": "decision", "score": 90,
        })
        assert r.status_code == 201
        r2 = session.get(f"{API}/clubs")
        assert r2.status_code == 200
        names = {c["name"] for c in r2.json()}
        assert unique in names, f"New club missing from /api/clubs. Got: {names}"


# --- Leaderboard -----------------------------------------------------------
class TestLeaderboard:
    def test_reaction_sorted_ascending(self, session):
        r = session.get(f"{API}/leaderboard/reaction")
        assert r.status_code == 200
        data = r.json()
        assert data["gameType"] == "reaction"
        results = data["results"]
        assert len(results) > 0
        times = [x["reactionTime"] for x in results if x.get("reactionTime") is not None]
        assert times == sorted(times)
        for row in results:
            assert "_id" not in row

    def test_decision_sorted_descending(self, session):
        r = session.get(f"{API}/leaderboard/decision")
        assert r.status_code == 200
        results = r.json()["results"]
        assert len(results) > 0
        scores = [x["score"] for x in results]
        assert scores == sorted(scores, reverse=True)

    def test_leaderboard_seeded_club_filter(self, session):
        r = session.get(f"{API}/leaderboard/reaction",
                        params={"club": "South London FC"})
        assert r.status_code == 200
        for row in r.json()["results"]:
            assert row["club"] == "South London FC"

    def test_leaderboard_arbitrary_club_filter(self, session):
        # First create a score for a new club, then filter
        club = "TEST_FilterClub_XYZ"
        session.post(f"{API}/score", json={
            "name": "TEST_FilterUser", "club": club,
            "gameType": "reaction", "score": 750, "reactionTime": 300,
        })
        r = session.get(f"{API}/leaderboard/reaction",
                        params={"club": club})
        assert r.status_code == 200
        results = r.json()["results"]
        assert len(results) >= 1
        for row in results:
            assert row["club"] == club

    def test_leaderboard_weekly_period(self, session):
        r = session.get(f"{API}/leaderboard/reaction", params={"period": "weekly"})
        assert r.status_code == 200
        data = r.json()
        assert data["period"] == "weekly"
        assert isinstance(data["results"], list)

    def test_leaderboard_unknown_game_type(self, session):
        r = session.get(f"{API}/leaderboard/snooker")
        assert r.status_code == 400

    def test_seed_data_present(self, session):
        r1 = session.get(f"{API}/leaderboard/reaction", params={"limit": 100})
        r2 = session.get(f"{API}/leaderboard/decision", params={"limit": 100})
        total = len(r1.json()["results"]) + len(r2.json()["results"])
        assert total >= 30, f"Expected ~40 seeded scores, found {total}"

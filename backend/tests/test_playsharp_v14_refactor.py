"""V1.4 backend regression — modular routes refactor.

Verifies every endpoint in the review request still works after server.py split into
routes/, models/, services/, core.py. Spaces requests so rate limits don't bite.
"""
import os
import time
import uuid
import pytest
import requests
from pathlib import Path

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    env = Path("/app/frontend/.env").read_text()
    for line in env.splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
API = f"{BASE_URL}/api"

PAUSE = 3.2  # 20/min == 1 every 3s — pause to stay under the limit


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    # Wait long enough for any previous test run's rate-limit window to pass.
    time.sleep(60)
    return sess


# ---------- Meta ----------
class TestMeta:
    def test_root(self, s):
        r = s.get(f"{API}/")
        assert r.status_code == 200
        body = r.json()
        assert body["app"] == "PlaySharp"
        assert "motto" in body and isinstance(body["motto"], str)
        assert "version" in body

    def test_clubs_unique_canonical(self, s):
        r = s.get(f"{API}/clubs")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        names = [c["name"] for c in items]
        # uniqueness + sorted
        assert names == sorted(names)
        assert len(names) == len(set(names))


# ---------- Score with canonicalisation + isNewClub ----------
class TestScoreCanonical:
    def test_lowercase_new_club_canonicalised_and_marked_new(self, s):
        unique = f"new test fc {uuid.uuid4().hex[:6]}"
        time.sleep(PAUSE)
        r = s.post(f"{API}/score", json={
            "name": "TEST_v14_a",
            "club": unique,
            "gameType": "reaction",
            "score": 800,
            "reactionTime": 280.0,
            "age": 16,
        })
        assert r.status_code == 201, r.text
        data = r.json()
        # Canonical: each token first-letter upper, FC stays uppercase
        assert data["club"].endswith("FC")
        assert data["club"].split()[0] == "New"
        assert data["isNewClub"] is True
        return data["club"]

    def test_same_club_lowercase_again_not_new(self, s):
        unique_lower = f"new test fc {uuid.uuid4().hex[:6]}"
        time.sleep(PAUSE)
        first = s.post(f"{API}/score", json={
            "name": "TEST_v14_b1", "club": unique_lower,
            "gameType": "reaction", "score": 700, "reactionTime": 320.0,
        })
        assert first.status_code == 201, first.text
        assert first.json()["isNewClub"] is True

        time.sleep(PAUSE)
        second = s.post(f"{API}/score", json={
            "name": "TEST_v14_b2", "club": unique_lower,  # same lowercase form
            "gameType": "reaction", "score": 720, "reactionTime": 305.0,
        })
        assert second.status_code == 201, second.text
        assert second.json()["isNewClub"] is False
        assert second.json()["club"] == first.json()["club"]


# ---------- Decision + leaderboard sort ----------
class TestDecisionLeaderboard:
    def test_decision_post_appears_in_leaderboard(self, s):
        marker_club = f"TEST v14 Decision {uuid.uuid4().hex[:6]} FC"
        time.sleep(PAUSE)
        r = s.post(f"{API}/score", json={
            "name": "TEST_v14_decision",
            "club": marker_club,
            "gameType": "decision",
            "score": 99,
        })
        assert r.status_code == 201, r.text

        lb = s.get(f"{API}/leaderboard/decision", params={"club": marker_club})
        assert lb.status_code == 200
        results = lb.json()["results"]
        assert any(row["score"] == 99 for row in results)

    def test_decision_sorted_desc(self, s):
        lb = s.get(f"{API}/leaderboard/decision", params={"limit": 20})
        assert lb.status_code == 200
        scores = [row["score"] for row in lb.json()["results"]]
        assert scores == sorted(scores, reverse=True)


# ---------- Leaderboard seeded data + filters ----------
class TestLeaderboardSeed:
    def test_reaction_sorted_asc_min_15(self, s):
        r = s.get(f"{API}/leaderboard/reaction", params={"limit": 50})
        assert r.status_code == 200
        results = r.json()["results"]
        # Seeded data has 15 reaction entries; user runs may add more.
        assert len(results) >= 15
        rts = [row["reactionTime"] for row in results]
        assert rts == sorted(rts)

    def test_filter_elite_academy(self, s):
        r = s.get(f"{API}/leaderboard/reaction", params={"club": "Elite Academy", "limit": 50})
        assert r.status_code == 200
        results = r.json()["results"]
        assert len(results) > 0
        for row in results:
            assert row["club"] == "Elite Academy"

    def test_period_weekly_within_7_days(self, s):
        from datetime import datetime, timedelta, timezone
        r = s.get(f"{API}/leaderboard/reaction", params={"period": "weekly", "limit": 50})
        assert r.status_code == 200
        cutoff = datetime.now(timezone.utc) - timedelta(days=7, hours=1)
        for row in r.json()["results"]:
            ts = datetime.fromisoformat(row["createdAt"].replace("Z", "+00:00"))
            assert ts >= cutoff

    def test_unknown_game_type_returns_400(self, s):
        r = s.get(f"{API}/leaderboard/foo")
        assert r.status_code == 400


# ---------- Contact ----------
class TestContact:
    def test_post_get_contact(self, s):
        marker = f"TEST_v14_contact_{uuid.uuid4().hex[:6]}"
        time.sleep(PAUSE)
        r = s.post(f"{API}/contact", json={
            "name": marker,
            "email": "v14@example.com",
            "message": "hello v14",
        })
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["name"] == marker
        assert "_id" not in body and "id" in body

        lst = s.get(f"{API}/contact")
        assert lst.status_code == 200
        names = [c["name"] for c in lst.json()]
        assert marker in names
        # most recent first → our marker should be early
        assert names.index(marker) < 5


# ---------- Club claim ----------
class TestClubClaim:
    def test_post_get_club_claim_canonical(self, s):
        marker = f"v14 lower club {uuid.uuid4().hex[:6]} fc"
        time.sleep(PAUSE)
        r = s.post(f"{API}/club-claim", json={
            "club": marker,
            "contactName": "TEST_v14_coach",
            "email": "v14coach@example.com",
            "role": "Head Coach",
            "squadSize": 18,
        })
        assert r.status_code == 201, r.text
        d = r.json()
        # canonical form
        assert d["club"].endswith("FC")
        assert d["club"].split()[0] == "V14"
        assert "_id" not in d
        assert d["status"] == "new"

        lst = s.get(f"{API}/club-claim")
        assert lst.status_code == 200
        clubs = [c["club"] for c in lst.json()]
        assert d["club"] in clubs


# ---------- Validation ----------
class TestValidation:
    def test_score_too_high(self, s):
        time.sleep(PAUSE)
        r = s.post(f"{API}/score", json={
            "name": "TEST_v14_validation",
            "club": "TEST_v14_validation_club",
            "gameType": "decision", "score": 99999,
        })
        assert r.status_code == 422, r.text

    def test_score_age_too_low(self, s):
        time.sleep(PAUSE)
        r = s.post(f"{API}/score", json={
            "name": "TEST_v14_validation",
            "club": "TEST_v14_validation_club",
            "gameType": "decision", "score": 50, "age": 4,
        })
        assert r.status_code == 422, r.text

    def test_score_missing_club(self, s):
        time.sleep(PAUSE)
        r = s.post(f"{API}/score", json={
            "name": "TEST_v14_validation",
            "gameType": "decision", "score": 50,
        })
        assert r.status_code == 422, r.text

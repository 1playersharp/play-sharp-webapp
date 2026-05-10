"""PlaySharp V1.3 backend tests — canonical_club, isNewClub, club-claim, rate limiting."""
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


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- canonical_club normalisation ----------
class TestCanonicalClub:
    def test_lowercase_seeded_club_returns_canonical_and_not_new(self, s):
        r = s.post(f"{API}/score", json={
            "name": "TEST_Canon1", "club": "south london fc",
            "gameType": "reaction", "score": 800, "reactionTime": 290.0,
        })
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["club"] == "South London FC"
        assert body["isNewClub"] is False

    def test_age_code_uppercased(self, s):
        r = s.post(f"{API}/score", json={
            "name": "TEST_Canon2",
            "club": "arsenal u-12 academy",
            "gameType": "decision", "score": 72,
        })
        assert r.status_code == 201, r.text
        assert r.json()["club"] == "Arsenal U-12 Academy"

    def test_u18_without_hyphen(self, s):
        r = s.post(f"{API}/score", json={
            "name": "TEST_Canon3", "club": "hackney u18",
            "gameType": "decision", "score": 60,
        })
        assert r.status_code == 201
        assert r.json()["club"] == "Hackney U18"


# ---------- isNewClub flag ----------
class TestIsNewClub:
    @pytest.fixture(scope="class")
    def unique_club(self):
        return f"TEST Tigers {uuid.uuid4().hex[:6]} FC"

    def test_brand_new_club_returns_is_new_true(self, s, unique_club):
        r = s.post(f"{API}/score", json={
            "name": "TEST_New1", "club": unique_club,
            "gameType": "reaction", "score": 700, "reactionTime": 330.0,
        })
        assert r.status_code == 201, r.text
        assert r.json()["isNewClub"] is True

    def test_same_club_different_case_returns_is_new_false(self, s, unique_club):
        r = s.post(f"{API}/score", json={
            "name": "TEST_New2", "club": unique_club.upper(),
            "gameType": "reaction", "score": 750, "reactionTime": 300.0,
        })
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["isNewClub"] is False
        # both rows normalised identically
        assert data["club"].lower() == unique_club.lower()


# ---------- POST /api/club-claim ----------
class TestClubClaim:
    def test_create_valid_claim(self, s):
        payload = {
            "club": f"TEST Claim Club {uuid.uuid4().hex[:6]} FC",
            "contactName": "TEST_Coach",
            "email": "testcoach@example.com",
            "role": "Head Coach",
            "squadSize": 24,
            "message": "Interested in pilot",
        }
        r = s.post(f"{API}/club-claim", json=payload)
        assert r.status_code == 201, r.text
        d = r.json()
        # canonical_club normalises 'TEST' -> 'Test' (only FC/AFC/Un are preserved)
        assert d["club"].endswith("FC")
        assert "Claim Club" in d["club"]
        assert d["contactName"] == "TEST_Coach"
        assert d["status"] == "new"
        assert "id" in d and "_id" not in d

    def test_missing_required_field_returns_422(self, s):
        r = s.post(f"{API}/club-claim", json={
            "club": "TEST_MissingField",
            "contactName": "X",
            # missing email and role
        })
        assert r.status_code == 422

    def test_list_claims_no_id_leak(self, s):
        r = s.get(f"{API}/club-claim")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        for it in items:
            assert "_id" not in it
            assert "id" in it and "club" in it


# ---------- Leaderboard with canonical club filter ----------
class TestLeaderboardCanonical:
    def test_lowercase_filter_finds_canonical_records(self, s):
        r = s.get(f"{API}/leaderboard/reaction", params={"club": "south london fc"})
        assert r.status_code == 200
        data = r.json()
        assert len(data["results"]) > 0
        for row in data["results"]:
            assert row["club"] == "South London FC"


# ---------- Rate limiting ----------
# Run rate-limit tests LAST (they'll burn the budget for this IP). Named with zz_
class TestZZRateLimit:
    def test_club_claim_rate_limit_5_per_min(self, s):
        # 6th request within a minute should 429. Use unique clubs to avoid body dup issues.
        statuses = []
        for i in range(7):
            r = s.post(f"{API}/club-claim", json={
                "club": f"TEST_RL_Claim_{uuid.uuid4().hex[:6]}",
                "contactName": "RL_Tester",
                "email": "rl@example.com",
                "role": "Parent",
            })
            statuses.append(r.status_code)
        assert 429 in statuses, f"Expected 429 within 7 requests, got {statuses}"
        assert statuses.count(201) <= 5

    def test_score_rate_limit_20_per_min(self, s):
        statuses = []
        for i in range(22):
            r = s.post(f"{API}/score", json={
                "name": f"TEST_RL_{i}",
                "club": "TEST_RL_Score_Club",
                "gameType": "reaction", "score": 600, "reactionTime": 350.0,
            })
            statuses.append(r.status_code)
        assert 429 in statuses, f"Expected 429 in 22 rapid requests, got {statuses}"


# ---------- Existing endpoints regression ----------
class TestRegression:
    def test_root(self, s):
        r = s.get(f"{API}/")
        assert r.status_code == 200
        assert r.json()["app"] == "PlaySharp"

    def test_clubs(self, s):
        r = s.get(f"{API}/clubs")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_leaderboard_decision(self, s):
        r = s.get(f"{API}/leaderboard/decision")
        assert r.status_code == 200
        assert r.json()["gameType"] == "decision"

    def test_contact_post(self, s):
        r = s.post(f"{API}/contact", json={
            "name": "TEST_Regression",
            "email": "regression@example.com",
            "message": "regression test",
        })
        assert r.status_code == 201

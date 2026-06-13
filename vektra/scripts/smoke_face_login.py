"""
Smoke test for the face-login backend.

Walks the full happy + unhappy paths the plan calls out:

    1. Signup (fresh user) so we have a known user id to enroll.
    2. POST /v1/users/{id}/face   -> 204
    3. GET  /v1/users/{id}/face   -> {enrolled: true, enrolledAt: ...}
    4. POST /v1/auth/face-login   with the enrolled vector -> 200 + aggregate
    5. POST /v1/auth/face-login   with a different vector  -> 401
    6. DELETE /v1/users/{id}/face -> 204
    7. POST /v1/auth/face-login   with the original vector -> 401 (now unenrolled)

The test uses deterministic seeded vectors so reruns are reproducible.
"""

from __future__ import annotations

import json
import math
import random
import sys
import time
import urllib.error
import urllib.request
import uuid
from typing import Any


BASE = "http://localhost/api/v1"
DIM = 128


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------


def request(method: str, path: str, body: dict | None = None) -> tuple[int, Any]:
    url = f"{BASE}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Content-Type": "application/json"} if data is not None else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read()
            payload = json.loads(raw) if raw else None
            return resp.status, payload
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            payload = json.loads(raw) if raw else None
        except json.JSONDecodeError:
            payload = raw.decode("utf-8", errors="replace")
        return e.code, payload


def normalize(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in vec))
    return [v / norm for v in vec]


def random_unit_vector(seed: int) -> list[float]:
    rng = random.Random(seed)
    return normalize([rng.gauss(0, 1) for _ in range(DIM)])


# ---------------------------------------------------------------------------
# Test
# ---------------------------------------------------------------------------


def step(idx: int, label: str) -> None:
    print(f"\n=== {idx}. {label} ===")


def expect(status: int, want: int, label: str, body: Any) -> None:
    if status == want:
        print(f"  OK  {label} -> {status}")
    else:
        print(f"  FAIL {label} -> {status} (want {want}); body={body!r}")
        sys.exit(1)


def main() -> int:
    suffix = uuid.uuid4().hex[:8]
    email = f"face-{suffix}@example.com"
    password = "Hunter2!Hunter2!"

    step(1, "Signup")
    status, body = request(
        "POST",
        "/users/signup",
        {
            "email": email,
            "password": password,
            "name": "Face",
            "surname": "Tester",
        },
    )
    expect(status, 201, "signup", body)
    user_id = body["user"]["id"]
    print(f"  user id = {user_id}")

    enrolled = random_unit_vector(seed=42)
    other = random_unit_vector(seed=999)

    step(2, "Enroll face")
    status, body = request(
        "POST",
        f"/users/{user_id}/face",
        {"embedding": enrolled},
    )
    expect(status, 204, "enroll", body)

    step(3, "GET face status")
    status, body = request("GET", f"/users/{user_id}/face")
    expect(status, 200, "status", body)
    assert body["enrolled"] is True, body
    print(f"  enrolledAt = {body['enrolledAt']}")

    step(4, "Face login with enrolled vector")
    status, body = request("POST", "/auth/face-login", {"embedding": enrolled})
    expect(status, 200, "login (match)", body)
    assert body["user"]["id"] == user_id, body
    print(f"  matched user id = {body['user']['id']}")

    step(5, "Face login with random vector")
    status, body = request("POST", "/auth/face-login", {"embedding": other})
    expect(status, 401, "login (no match)", body)
    assert body.get("message") == "Face not recognized", body

    step(6, "Delete face")
    status, body = request("DELETE", f"/users/{user_id}/face")
    expect(status, 204, "delete", body)

    step(7, "Face login after delete")
    status, body = request("POST", "/auth/face-login", {"embedding": enrolled})
    expect(status, 401, "login (post-delete)", body)

    step(8, "GET status post-delete")
    status, body = request("GET", f"/users/{user_id}/face")
    expect(status, 200, "status (post-delete)", body)
    assert body["enrolled"] is False, body

    print("\nALL FACE-LOGIN SMOKE STEPS PASSED")
    return 0


if __name__ == "__main__":
    # Wait briefly for the backend to come up if invoked right after `docker compose up`.
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(
                "http://localhost/api/v3/api-docs", timeout=2
            ) as _:
                break
        except Exception:
            time.sleep(2)
    sys.exit(main())

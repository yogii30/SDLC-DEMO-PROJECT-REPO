"""Issue a login token from the simulated identity provider (standing in for Entra ID).

    python mint_token.py                      # alice: group-payments, 1 hour (the platform's maximum)
    python mint_token.py --user bob           # bob: group-readers (project:read only)
    python mint_token.py --user carol         # carol: group-billing (the other project only)
    python mint_token.py --hours 0.5 --user alice

Prints the token alone, so it can be piped or pasted into a Bearer header.
"""

from __future__ import annotations

import argparse
import time
import uuid

import jwt

from demo_common import AUDIENCE, ISSUER, KEY_ID, load_key

USERS = {
    "alice": ["group-payments"],
    "bob": ["group-readers"],
    "carol": ["group-billing"],
}


def mint(user: str, hours: float = 1) -> str:
    now = int(time.time())
    claims = {
        "iss": ISSUER,
        "aud": AUDIENCE,
        "sub": f"{user}-sub",
        "oid": f"{user}-oid",
        "name": user.title(),
        "uti": str(uuid.uuid4()),
        "jti": str(uuid.uuid4()),
        "iat": now,
        "nbf": now,
        "exp": now + int(hours * 3600),
        "scp": "access",
        "azp": "claude-code-demo",
        "groups": USERS[user],
    }
    return jwt.encode(claims, load_key(), algorithm="RS256", headers={"kid": KEY_ID})


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument("--user", choices=sorted(USERS), default="alice")
    parser.add_argument("--hours", type=float, default=1, help="at most 1: spec 005 FR-003 caps token lifetime")
    args = parser.parse_args()
    print(mint(args.user, args.hours))


if __name__ == "__main__":
    main()

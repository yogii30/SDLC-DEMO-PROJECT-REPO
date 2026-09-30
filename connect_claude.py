"""Point Claude Code at the demo gateway, with a fresh login token.

    python connect_claude.py                 # alice, 1 hour (the platform refuses longer tokens)
    python connect_claude.py --user bob      # to show the missing-scope refusal

Writes .mcp.json in this folder (not in any git repository). Open Claude Code in this folder,
approve the "sdlc-platform" server when asked, and check it with /mcp. After switching user,
restart Claude Code (or reconnect in /mcp) so it picks up the new token.
"""

from __future__ import annotations

import argparse
import json

from demo_common import HERE, URL
from mint_token import USERS, mint


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument("--user", choices=sorted(USERS), default="alice")
    parser.add_argument("--hours", type=float, default=1, help="at most 1: spec 005 FR-003 caps token lifetime")
    args = parser.parse_args()
    config = {
        "mcpServers": {
            "sdlc-platform": {
                "type": "http",
                "url": URL,
                "headers": {"Authorization": f"Bearer {mint(args.user, args.hours)}"},
            }
        }
    }
    (HERE / ".mcp.json").write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote .mcp.json: sdlc-platform -> {URL} as {args.user} {USERS[args.user]}, "
          f"valid {args.hours:g} h")


if __name__ == "__main__":
    main()

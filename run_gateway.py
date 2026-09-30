"""Start the real spec 006 MCP gateway with the demo configuration.

    python run_gateway.py
    python run_gateway.py --offline   # skip the GitHub fetch, serve the last fetched skills

Before starting, fetches the skills branch named in skills_source.yaml from GitHub into
cache/skills (the platform itself never fetches: spec 005 FR-020; a managed workspace is spec 010).
Serves MCP at http://127.0.0.1:8765/mcp and health at http://127.0.0.1:8765/healthz.
Every log line (the request and security audit included) passes spec 005's secret redaction.
"""

from __future__ import annotations

import argparse
import logging
import subprocess

import uvicorn
import yaml

from app.mcp import GatewayConfig, build_gateway
from demo_common import (
    GATEWAY_CONFIG,
    HOST,
    PORT,
    SAMPLE_SKILLS_MARKER,
    SKILLS_CACHE,
    SKILLS_SOURCE,
    URL,
    identity_provider_client,
)


def git(*args: str) -> str:
    done = subprocess.run(["git", *args], check=True, capture_output=True, text=True)
    return done.stdout.strip()


def sync_skills(offline: bool) -> None:
    """Make cache/skills an exact copy of the configured branch on GitHub."""
    source = yaml.safe_load(SKILLS_SOURCE.read_text(encoding="utf-8"))
    repository, branch = str(source["repository"]), str(source["branch"])
    cache = str(SKILLS_CACHE)
    try:
        if offline:
            raise RuntimeError("--offline")
        if not (SKILLS_CACHE / ".git").exists():
            print(f"Cloning {repository} @ {branch} ...")
            SKILLS_CACHE.parent.mkdir(exist_ok=True)
            git("clone", "--quiet", "--branch", branch, "--single-branch", repository, cache)
        else:
            git("-C", cache, "remote", "set-url", "origin", repository)
            git("-C", cache, "fetch", "--quiet", "origin", f"+refs/heads/{branch}:refs/remotes/origin/{branch}")
            # The cache is managed by this script: always match GitHub exactly.
            git("-C", cache, "checkout", "--quiet", "--force", "-B", branch, f"origin/{branch}")
            git("-C", cache, "clean", "--quiet", "-fdx")
    except (subprocess.CalledProcessError, RuntimeError) as error:
        if not (SKILLS_CACHE / ".git").exists():
            detail = getattr(error, "stderr", None) or error
            raise SystemExit(f"Could not fetch skills from {repository} @ {branch}: {detail}") from None
        print(f"WARNING: skills not refreshed from GitHub ({str(error).strip()}); using the cached copy.")
    commit = git("-C", cache, "log", "-1", "--format=%h %s")
    print(f"Skills: {repository} @ {branch} -> {commit}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument("--offline", action="store_true", help="skip the GitHub fetch")
    args = parser.parse_args()
    if not GATEWAY_CONFIG.exists():
        raise SystemExit("No demo configuration. Run: python setup_demo.py")
    if not SAMPLE_SKILLS_MARKER.exists():
        sync_skills(args.offline)
    # Handlers first: build_gateway installs the redaction filter on the root logger's handlers.
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-5s %(name)s  %(message)s")
    running = build_gateway(GatewayConfig.load(GATEWAY_CONFIG), http_client=identity_provider_client())
    tools = ", ".join(tool.name for tool in running.gateway.surface.tools)
    print(f"\nSDLC platform gateway (demo) on {URL}\nTools: {tools}\n")
    uvicorn.run(running.app, host=HOST, port=PORT, lifespan="off", log_level="warning")


if __name__ == "__main__":
    main()

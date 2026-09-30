"""Walk through every demo scenario against the running gateway, over real HTTP.

    python run_gateway.py        # in one terminal
    python demo_check.py         # in another

Use it as the dry run before the meeting, and as the fallback if the Claude Code connection fails.
It also shows what Claude Code cannot: a tool call made on behalf of an agent (``_meta.agent``).
"""

from __future__ import annotations

import json
import sys
from typing import Any

import httpx

from demo_common import OTHER_PROJECT, PROJECT, URL
from mint_token import mint

HEALTH = URL.removesuffix("/mcp") + "/healthz"
SESSION_HEADER = "mcp-session-id"
results: list[tuple[str, bool]] = []


class Client:
    def __init__(self, user: str) -> None:
        self.user = user
        self.headers = {"authorization": f"Bearer {mint(user, hours=1)}"}
        self.http = httpx.Client(timeout=60)
        self.ids = iter(range(1, 10_000))
        response = self._post("initialize", {"protocolVersion": "2025-06-18"})
        self.headers[SESSION_HEADER] = response.headers[SESSION_HEADER]

    def _post(self, method: str, params: dict[str, Any] | None = None) -> httpx.Response:
        message: dict[str, Any] = {"jsonrpc": "2.0", "id": next(self.ids), "method": method}
        if params is not None:
            message["params"] = params
        headers = {**self.headers, "accept": "application/json, text/event-stream"}
        response = self.http.post(URL, json=message, headers=headers)
        response.raise_for_status()
        return response

    def rpc(self, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        body = self._post(method, params).json()
        if "error" in body:
            raise RuntimeError(body["error"])
        result: dict[str, Any] = body["result"]
        return result

    def call(self, tool: str, project: str = PROJECT, agent: str | None = None, **args: Any) -> dict[str, Any]:
        params: dict[str, Any] = {"name": tool, "arguments": {"project": project, **args}}
        if agent is not None:
            params["_meta"] = {"agent": agent}
        envelope: dict[str, Any] = self.rpc("tools/call", params)["structuredContent"]
        return envelope


def step(title: str) -> None:
    print(f"\n=== {title}")


def check(label: str, ok: bool, detail: Any = None) -> None:
    results.append((label, ok))
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}")
    if detail is not None:
        text = detail if isinstance(detail, str) else json.dumps(detail, indent=2)[:1500]
        print("        " + text.replace("\n", "\n        "))


def error_of(envelope: dict[str, Any]) -> str:
    error = envelope.get("error") or {}
    return f"{error.get('code')} {error.get('policy') or ''} - {error.get('message', '')}".strip()


def main() -> int:
    step("1. Health: open to anyone, reveals only name and version")
    health = httpx.get(HEALTH, timeout=10)
    check("GET /healthz answers without a login", health.status_code == 200, health.json())

    step("2. No login, no access")
    anonymous = httpx.post(URL, json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"}, timeout=10)
    check(f"a call without a token is refused (HTTP {anonymous.status_code})", anonymous.status_code == 401)

    step("3. Alice (group-payments) connects and lists the tools")
    alice = Client("alice")
    names = sorted(tool["name"] for tool in alice.rpc("tools/list")["tools"])
    check("tools are listed", {"project.get-context", "skill.resolve", "agent.resolve"} <= set(names), ", ".join(names))

    step(f"4. Project context of {PROJECT}, read from PROJECT.yaml at a pinned commit")
    context = alice.call("project.get-context")
    check("project context returned", context["ok"] is True, context.get("data") or error_of(context))

    step("5. Skills for an implementation task: the team's company skill and the project's own skill")
    resolved = alice.call("skill.resolve", task_signals=["implement"])
    names = {s.get("name") for s in (resolved.get("data") or {}).get("skills", [])}
    ok = resolved["ok"] is True and {"frontend-code-generation", "payments-conventions"} <= names
    summary = [
        {key: s.get(key) for key in ("name", "version", "tier")}
        for s in (resolved.get("data") or {}).get("skills", [])
    ] if ok else error_of(resolved)
    check("skills resolved", ok, summary)

    step("6. Secret masking: the project skill payments-conventions contains a planted GitHub token")
    skill = alice.call("skill.get", name="payments-conventions", version="1.0.0")
    text = json.dumps(skill.get("data"))
    masked = skill["ok"] is True and "[REDACTED:" in text and "ghp_" not in text
    check("the token comes back redacted", masked, skill.get("data") or error_of(skill))

    step("7. Agents: which agents may work on this project, with their skills")
    agents = alice.call("agent.resolve", task_signals=["implement"])
    ok = agents["ok"] is True
    names = [c["name"] for c in (agents.get("data") or {}).get("candidates", [])] if ok else error_of(agents)
    check("frontend is offered; security is not authorised by policy", ok and names == ["frontend"], names)

    step("8. Agent tool permissions (a call made on behalf of an agent)")
    refused = alice.call("skill.resolve", agent="qa", task_signals=["implement"])
    check("qa may not call skill.resolve", refused["ok"] is False, error_of(refused))
    allowed = alice.call("project.get-context", agent="qa")
    check("qa may call project.get-context", allowed["ok"] is True, None if allowed["ok"] else error_of(allowed))
    unauthorised = alice.call("project.get-context", agent="security")
    check("the security agent is not allowed on this project", unauthorised["ok"] is False, error_of(unauthorised))

    step(f"9. Alice asks for {OTHER_PROJECT}, a project she is not entitled to")
    other = alice.call("project.get-context", project=OTHER_PROJECT)
    check("refused", other["ok"] is False, error_of(other))

    step("10. Bob (group-readers) has project:read only")
    bob = Client("bob")
    bob_context = bob.call("project.get-context")
    check("bob can read the project context", bob_context["ok"] is True, None if bob_context["ok"] else error_of(bob_context))
    bob_skills = bob.call("skill.list")
    check("bob cannot read skills", bob_skills["ok"] is False, error_of(bob_skills))

    passed = sum(ok for _, ok in results)
    print(f"\n{passed} / {len(results)} checks passed. The gateway's terminal shows the audit log of each call.")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except httpx.ConnectError:
        sys.exit(f"Cannot reach {URL}. Start the gateway first: python run_gateway.py")

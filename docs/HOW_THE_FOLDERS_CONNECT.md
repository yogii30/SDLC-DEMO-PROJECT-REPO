# How the Folders Connect

How the demo folder uses the real platform code and the real skills, and how to prove it live.

- **Checked:** 30 September 2026. Every command output below is real.
- **Companions:** [DEMO_GUIDE.md](DEMO_GUIDE.md) · [TEAM_QA_PREP.md](TEAM_QA_PREP.md)

---

## 1. The three places

| Folder | What it is | Git? | Role in the demo |
|---|---|---|---|
| `D:\office_work\AI-Assisted-SDLC-platform` | **Product repository** (the platform) | Yes, branch `release_candidate-sdd` | Supplies **all the platform code** (`sdlc-agent-platform\app\`) |
| `MsTechmentTechnology/AI-Assisted-Development-Agents` on GitHub | **Skills repository** | Yes, branch `platform-skill-metadata` | Supplies the **real company skills** |
| `D:\office_work\sdlc-platform-demo` | **Demo folder** | No | Adds only **configuration, sample data and start scripts** |

## 2. The picture

```
AI-Assisted-SDLC-platform  (product repo)          ──import──▶   sdlc-platform-demo  (demo folder, no git)
   sdlc-agent-platform\app\  = platform code                       run_gateway.py, config\, repos\ (sample data)
                                                                          ▲
AI-Assisted-Development-Agents  (skills repo, GitHub)  ──fetch on start───┘
   branch platform-skill-metadata                            (skills_source.yaml → cache\skills)
```

**In one sentence:** the code comes from the product repository, the skills come from GitHub,
and the demo folder only adds configuration and sample data.

---

## 3. Connection 1: the platform code (a Python import)

### Where it is

[run_gateway.py](../run_gateway.py), line 21. This is the **only** line that brings in the platform:

```python
from app.mcp import GatewayConfig, build_gateway
```

The `app` package is **not** in the demo folder. Python loads it from the product repository, because
the platform is installed in **editable mode** (`pip install -e`): Python reads the files straight
from that folder, so there's no copy.

```
D:\office_work\sdlc-platform-demo\run_gateway.py
        │   from app.mcp import build_gateway
        ▼
D:\office_work\AI-Assisted-SDLC-platform\sdlc-agent-platform\app\      ← the real platform code
```

### How to prove it live

Run these in a terminal inside `D:\office_work\sdlc-platform-demo`.

**a) Where Python loads the platform from:**

```powershell
python -c "import app; print(app.__file__)"
```

```
D:\office_work\AI-Assisted-SDLC-platform\sdlc-agent-platform\app\__init__.py
```

**b) That it's an editable install of the product repository:**

```powershell
python -m pip show sdlc-agent-platform
```

Look for:

```
Editable project location: D:\office_work\AI-Assisted-SDLC-platform\sdlc-agent-platform
```

**c) Which version of the code is running:**

```powershell
git -C D:\office_work\AI-Assisted-SDLC-platform log --oneline -1
git -C D:\office_work\AI-Assisted-SDLC-platform status --short
```

```
1f8ea00 Merge pull request #22 from MsTechmentTechnology/008-gateway-agent-tools
```

The second command prints **nothing**, meaning there are no local changes.

> **What to say:** "The demo runs exactly this merged commit of the platform, unchanged. The demo
> folder has no platform code of its own."

### What this means in practice

- The demo runs **whatever branch is checked out** in the product repository. That's why you check out
  `release_candidate-sdd` before the demo.
- A new merge, after `git pull`, is picked up the next time you start `run_gateway.py`. Nothing needs
  copying.
- Both Pythons on this machine work: the product's own `.venv` and the demo folder's `.venv` both
  load `app` from the product repository.

---

## 4. What the demo gets from the product repository

When the gateway starts, Python loads **90 modules** from
`D:\office_work\AI-Assisted-SDLC-platform\sdlc-agent-platform\app\`. That is the platform's whole
working code for specs 001–008, used unchanged.

### Package by package

| Package in the product repository | Modules loaded | Spec | What it does in the demo |
|---|---|---|---|
| `app.mcp` | 19 | 006 | **The gateway:** the web server, MCP sessions, the call pipeline (login → permission → tool → masking → audit), the 8 tools, the health page |
| `app.security` | 14 | 005 | **Security:** token checks (signature, issuer, expiry, 1-hour limit, revocation), entitlements (group → projects and scopes), secret masking, audit, log redaction. Includes the **gitleaks rules** file (`rules/gitleaks.toml`). |
| `app.policy.project` | 12 | 002 | **Project context:** reads and validates `PROJECT.yaml`, reads git at an exact commit, infers the stack (TypeScript, React, …), merges company and project policy |
| `app.registries.skills` | 10 | 007 | **Skill registry:** indexes company and project skills, resolves which apply, handles extensions and versions |
| `app.registries.agents` | 10 | 008 | **Agent registry:** indexes agents, resolves authorised agents, enforces each agent's allowed tools |
| `app.registries.metadata` | 9 | 003 | **Metadata rules:** validates the frontmatter of skills and agents (`kind`, `version`, `applies_to`, `status`), version ranges, applicability matching |
| `app.core.conventions` + `app.core.addressing` | 12 | 004 | **Shared conventions:** the standard answer format (`ok`/`error`), the error catalogue (`policy.refused`, …), tool naming, idempotency keys |
| Package roots (`app`, `app.core`, `app.policy`, `app.registries`) | 4 | 001 | Package structure and layer rules |

The result is the 8 tools the team sees: `project.get-context`, `skill.list`, `skill.get`,
`skill.resolve`, `skill.open-proposal`, `agent.list`, `agent.get`, `agent.resolve`.

### What it does *not* get (not built yet)

These packages exist in `app\` but aren't loaded, because their specs are still drafts:

| Package | Future spec |
|---|---|
| `app.connectors` | 010, 011: Jira, Azure DevOps, GitHub, SharePoint |
| `app.context` | 012, 013: indexing, search, context assembly and ranking |
| `app.runtime` | 014: the agent runtime and workflows |
| `app.observability` | 024: dashboards and metrics |

### How to reproduce the count

From the demo folder:

```powershell
python -c "import sys; from app.mcp import GatewayConfig, build_gateway; from demo_common import GATEWAY_CONFIG, identity_provider_client; build_gateway(GatewayConfig.load(GATEWAY_CONFIG), http_client=identity_provider_client()); print(len([m for m in sys.modules if m == 'app' or m.startswith('app.')]))"
```

This prints `90`.

> **What to say:** "The demo borrows the whole platform (specs 001–008, 90 modules) from the
> product repository unchanged, the skills from GitHub, and adds only configuration and sample data."

---

## 5. Connection 2: the skills (a fetch from GitHub)

### Where it is

[skills_source.yaml](../skills_source.yaml), in the demo folder:

```yaml
repository: https://github.com/MsTechmentTechnology/AI-Assisted-Development-Agents
branch: platform-skill-metadata
```

Each time `run_gateway.py` starts, it fetches that branch from GitHub into `cache\skills` and
prints the commit it uses:

```
Skills: https://github.com/MsTechmentTechnology/AI-Assisted-Development-Agents @ platform-skill-metadata -> b69adc7 ...
```

The platform then reads the skills at that commit. The configuration that points the platform at
`cache\skills` is `config\gateway.yaml`:

```yaml
skills:
  repository: https://github.com/MsTechmentTechnology/AI-Assisted-Development-Agents
  working_copy: ../cache/skills
```

### How to prove it live

```powershell
git -C D:\office_work\sdlc-platform-demo\cache\skills log --oneline -1
git -C D:\office_work\sdlc-platform-demo\cache\skills remote get-url origin
```

```
b69adc7 feat: add platform (spec 003) frontmatter to frontend-code-generation
https://github.com/MsTechmentTechnology/AI-Assisted-Development-Agents
```

Then open the same commit on GitHub:
`https://github.com/MsTechmentTechnology/AI-Assisted-Development-Agents/commit/b69adc7`

> **What to say:** "The skills are fetched from our GitHub on every start. It's the same commit you
> see on GitHub, and the platform reports that commit with every skill it returns."

### Why the demo script fetches, not the platform

The platform deliberately **never opens a URL by itself** (security rule, spec 005 FR-020). A
platform-managed copy of repositories is **spec 010**, still in specification. Until then, the demo
script does the fetch.

---

## 6. What the demo folder adds (and nothing more)

| In the demo folder | Purpose |
|---|---|
| `run_gateway.py` | Fetches the skills, then starts the platform (imported from the product repository) |
| `config\` | Gateway, security, entitlements, projects and policy configuration |
| `repos\` | Sample projects (`payments-web`, `billing-portal`) and sample agents |
| `keys\` | The simulated login key (standing in for Entra ID) |
| `cache\skills` | The skills fetched from GitHub; managed by `run_gateway.py`, don't edit it |
| `mint_token.py`, `connect_claude.py` | Create login tokens, and connect Claude Code |
| `demo_check.py` | The 13 automated checks |

---

## 7. Which folder to change for what

| You want to… | Change this | Where |
|---|---|---|
| Just run or practise the demo | **Nothing** | — |
| Show skills from another branch | `branch:` in `skills_source.yaml`, then restart `run_gateway.py` | Demo folder |
| Change a skill's content | `skills\frontend-code-generation\SKILL.md`: commit, push, restart `run_gateway.py` | Skills repository, branch `platform-skill-metadata` (worktree `D:\office_work\AI-Assisted-Development-Agents-platform`) |
| Change who can see what | `config\entitlements.yaml`, then restart `run_gateway.py` | Demo folder |
| Run newer platform code | `git pull` on `release_candidate-sdd`, then restart `run_gateway.py` | Product repository |
| Change the platform itself | Normal spec-driven PR into `release_candidate-sdd` | Product repository, **never for a demo** |

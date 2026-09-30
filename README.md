# SDLC platform – live demo

Runs the **real platform code** from `D:\office_work\AI-Assisted-SDLC-platform\sdlc-agent-platform\app`
(specs 002, 005, 006, 007, 008) with sample data. Nothing in the product repository is changed.

**Company skills come straight from GitHub.** `run_gateway.py` fetches the branch named in
`skills_source.yaml` (now `platform-skill-metadata` of
`MsTechmentTechnology/AI-Assisted-Development-Agents`) into `cache/skills` on every start, and the
platform serves the skills at that commit. Push a skill change, restart the gateway, and the demo
serves it. The fetch is done by this demo script because the platform itself never fetches
(spec 005 FR-020); a platform-managed workspace is spec 010, still in specification.
`python setup_demo.py --sample-skills` uses a local sample instead (no GitHub needed).

## First-time setup (for teammates)

You need Python 3.12+, git, and access to the two private repositories
(`MsTechmentTechnology/AI-Assisted-SDLC-platform` and `MsTechmentTechnology/AI-Assisted-Development-Agents`).

```powershell
# 1. The platform (the demo imports its code; any location works)
git clone https://github.com/MsTechmentTechnology/AI-Assisted-SDLC-platform.git
cd AI-Assisted-SDLC-platform
git checkout release_candidate-sdd
python -m venv .venv
.venv\Scripts\activate
pip install -e ".\sdlc-agent-platform[dev]"

# 2. This demo (same virtual environment)
cd ..
git clone https://github.com/yogii30/SDLC-DEMO-PROJECT-REPO.git sdlc-platform-demo
cd sdlc-platform-demo
pip install -r requirements.txt
python -c "import app; print(app.__file__)"   # must point into AI-Assisted-SDLC-platform

# 3. Your own key, sample repositories and configuration
python setup_demo.py
```

`keys/`, `config/`, `repos/`, `cache/` and `.mcp.json` are **generated on your machine** and never
committed (see `.gitignore`). Each person gets their own login key. The paths below use
`D:\office_work\…` as an example; use wherever you cloned the two repositories.

## Instructions

### Every time you run the demo

```powershell
# Terminal 1: keep it open (this is the audit log)
python run_gateway.py

# Terminal 2
python demo_check.py        # expect: 13 / 13 checks passed
python connect_claude.py    # fresh login token, valid 1 hour
```

Then open Claude Code **in this folder**, approve the `sdlc-platform` server, and check `/mcp`
shows it connected. Always name the project in prompts, e.g. *"Get the project context for
payments-web."*

### Documentation

| Guide | What it covers |
|---|---|
| [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md) | Step-by-step demo: preparation, the 8 demo steps with prompts and talking points, troubleshooting |
| [docs/TEAM_QA_PREP.md](docs/TEAM_QA_PREP.md) | Questions an AI-expert audience will ask, with honest answers; what is and isn't hardcoded |
| [docs/HOW_THE_FOLDERS_CONNECT.md](docs/HOW_THE_FOLDERS_CONNECT.md) | How this folder uses the platform code and the GitHub skills, and how to prove it live |

### Rules for this repository

- **Never commit** `keys/`, `.mcp.json`, `config/`, `repos/` or `cache/`. They're generated and
  personal, and `.gitignore` already excludes them.
- **Never change the platform code for the demo.** The demo imports it unchanged from
  `AI-Assisted-SDLC-platform`. Platform changes go through that repository's spec-driven PRs.
- **To change the skills,** push to the `platform-skill-metadata` branch of
  `AI-Assisted-Development-Agents` and restart `run_gateway.py`. To demo another branch, change
  `skills_source.yaml`.
- **If you cloned before `.gitignore` existed,** run `python setup_demo.py` once. It creates your
  own new login key, so the key in the first commit is no longer used.

## What's in this folder

| File | Purpose |
|---|---|
| `setup_demo.py` | Creates `keys/`, `repos/` (3 small local git repositories: agents, `payments-web`, `billing-portal`) and `config/`. Re-run to reset |
| `skills_source.yaml` | The GitHub repository and **branch** the company skills come from |
| `run_gateway.py` | Fetches the skills branch from GitHub into `cache/skills`, then starts the real MCP gateway on `http://127.0.0.1:8765/mcp`. `--offline` skips the fetch |
| `mint_token.py` | Issues a login token for a demo user |
| `connect_claude.py` | Writes `.mcp.json` here with a fresh token, for Claude Code |
| `demo_check.py` | Runs all 13 scenarios over HTTP: the dry run, and the fallback |
| `demo_common.py` | Shared settings |

Demo users:

| User | Group | May do |
|---|---|---|
| alice | group-payments | `payments-web`: project, skills, agents |
| bob | group-readers | `payments-web`: project context only |
| carol | group-billing | `billing-portal` only |

## Before the meeting (5 minutes)

1. `cd D:\office_work\AI-Assisted-SDLC-platform` and `git checkout release_candidate-sdd` + `git pull`
   (the demo runs whatever code is checked out).
2. `cd D:\office_work\sdlc-platform-demo`
3. `python setup_demo.py` (fresh repositories and key)
4. Terminal 1: `python run_gateway.py` — check the `Skills: … @ platform-skill-metadata -> <commit>`
   line, then leave it open; this is the audit log you'll show.
5. Terminal 2: `python demo_check.py` — expect **13 / 13 checks passed**.
6. `python connect_claude.py` — **tokens last 1 hour**, so do this within the hour before the demo.
7. Open Claude Code **in this folder** (`code D:\office_work\sdlc-platform-demo`, or `claude` in a
   terminal here). Approve the `sdlc-platform` server when asked; `/mcp` should show it connected.

## The demo (about 10 minutes)

Say first: *"This is the real platform code, run live with sample data and a simulated login."*

| # | Show | Type in Claude Code | Point out |
|---|---|---|---|
| 1 | Health | open `http://127.0.0.1:8765/healthz` in a browser | Open to anyone, reveals only name and version |
| 2 | Tools | *What tools does the sdlc-platform server give you?* | project, skill and agent tools |
| 3 | Project context | *Get the project context for payments-web. What's its source of truth, languages and framework?* | Read from `PROJECT.yaml` at an exact commit; Jira, TypeScript, React inferred from the repository |
| 4 | Skills | *Which skills apply to an implement task in payments-web?* | The team's `frontend-code-generation` (company tier, from the skills repository) + the project's own `payments-conventions` |
| 5 | Secret masking | *Show me the payments-conventions skill, version 1.0.0, in full.* | The planted GitHub token comes back as `[REDACTED:github-pat]` |
| 6 | Agents | *Which agents can implement a change in payments-web?* | Only `frontend`, with `frontend-code-generation`; `security` exists but the project policy doesn't allow it |
| 7 | Access control | *Get the project context for billing-portal.* | Refused: alice isn't entitled to that project |
| 8 | Audit | switch to Terminal 1 | Every call logged: who, which project, which tool, allowed or refused, correlation id — no tokens or secrets |
| 9 | Least privilege (optional) | `python connect_claude.py --user bob`, reconnect in `/mcp`, then *List the skills for payments-web* | Refused: `Requires skill:read` |

**Agent tool permissions** (an agent may only call the tools it lists) can't be triggered from
Claude Code yet: it needs the agent runtime (spec 014) to name the agent on each call. Show it with
`python demo_check.py`, step 8.

## Say honestly what's not shown

- Real Entra ID — pending the staging secrets (005 T045).
- Jira / Azure DevOps / GitHub connectors, code generation, quality gates, the end-to-end
  workflows — specs 009–017, still in specification.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Claude Code: `AUTH_HEADER_REJECTED` / 401 | Token expired (1 hour). `python connect_claude.py`, then reconnect in `/mcp` |
| 401 right after re-running `setup_demo.py` | `setup_demo.py` creates a new login key; an old server still uses the old one. Stop the old `run_gateway.py` (Ctrl+C, or close its window), start it again, then `python connect_claude.py` |
| `demo_check.py`: "Cannot reach" | Start `python run_gateway.py` first |
| Port 8765 already in use | An old gateway is still running; close it |
| `Could not fetch skills from …` | No network or no GitHub access. Use `python run_gateway.py --offline` (last fetched copy) or `python setup_demo.py --sample-skills` |
| Skills list is empty | The branch's `SKILL.md` files lack the spec 003 frontmatter; check `branch` in `skills_source.yaml` |
| Anything odd | `python setup_demo.py`, restart the gateway |

To remove the demo: stop the gateway and delete this folder.

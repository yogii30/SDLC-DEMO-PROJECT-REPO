# SDLC Platform — Demo Guide

A step-by-step guide for presenting the SDLC platform live to the Team.

- **Length:** about 15 minutes of preparation and a 10–15 minute demo.
- **Last full dry run:** 30 September 2026. Every step below passed: 13 / 13 checks, and every step tested in real Claude Code.

---

## 1. What this demo is

The demo runs the **real, merged platform code** from
`D:\office_work\AI-Assisted-SDLC-platform\sdlc-agent-platform\app` (specs 001–008). Nothing in the product
repository is changed.

| Part | Real or simulated? | How it's implemented and how it works |
|---|---|---|
| MCP gateway, sessions, tool calls (spec 006) | **Real** | A web server (`app/mcp/`) that speaks MCP, the standard AI clients like Claude Code use to call tools. The client connects and gets a session, then lists and calls tools. **Every call follows the same pipeline:** check the login → check permission for that project and tool → run the tool → mask secrets in the result → write an audit record → return a standard answer (`ok` with data, or a coded error such as `policy.refused`). The server never calls an AI model itself. |
| Token checks, permissions, secret masking, audit (spec 005) | **Real** | **Login:** every request carries a signed token, and the server verifies the signature against the issuer's public key, plus the issuer, audience, expiry, the 1-hour maximum lifetime and revocation. **Permissions:** an entitlements file maps each user group to its projects and scopes (`project:read`, `skill:read`, `agent:read`), and each tool declares the scope it needs. **Masking:** all output is scanned with the gitleaks secret-detection rules, and matches are replaced with `[REDACTED:<rule>]`. **Audit:** every login, allow, refusal and masking event is logged, and logs pass the same redaction. |
| Project context from `PROJECT.yaml` (spec 002) | **Real** | A registry maps the project name to its git repository. The platform reads `PROJECT.yaml` **at an exact commit** and validates it (e.g. exactly one Source of Truth). It then **infers facts from the code**, each with evidence: `package.json` → JavaScript and React, `tsconfig.json` → TypeScript. Finally it merges the company policy with the project's own settings, which may only tighten within allowed ranges. |
| Skill registry (spec 007) | **Real** | It indexes every Markdown file whose frontmatter says `kind: skill`, from two tiers: the company skills repository and the project's `.sdlc/skills/` folder. It validates the metadata (name, version, `applies_to`, status). **Resolve** picks the skills whose `applies_to` matches the project's languages and frameworks and the task (e.g. "implement"). Company skills must be `accepted`, and project skills layer on top. Every skill carries a content hash, so you know exactly which version was used, and all skill text is masked. |
| Agent registry and agent permissions (spec 008) | **Real** | It reads agent definitions (`kind: agent`), each declaring its role, **the tools it may call** and **the skills it uses** (by version range). **Resolve** returns only agents that the project's policy authorises (`allowed_agents`) and that apply to the project, with their skills resolved through the skill registry. **Enforcement:** when a call is made on behalf of an agent, it is refused if the agent isn't authorised or the tool isn't in its list. |
| Company skills | **Real**: fetched from GitHub, `MsTechmentTechnology/AI-Assisted-Development-Agents`, branch `platform-skill-metadata` | Before starting, `run_gateway.py` fetches the branch named in `skills_source.yaml` from GitHub into `cache/skills`, and the platform then reads the skills at that commit. The **demo script** does the fetching because the platform deliberately never opens URLs itself (security rule). A platform-managed copy of repositories is spec 010, still in specification. |
| Login | Simulated: a local key stands in for Entra ID. Tokens are checked exactly as in production, including the 1-hour limit. | `mint_token.py` signs a standard JWT with a local RSA key, and the server fetches the matching public key, the same way it would fetch Microsoft's. **In production only the configuration changes:** `security.yaml` names Entra ID as the issuer, Entra ID signs the tokens, and the checking code is the same. |
| Projects `payments-web` and `billing-portal` | Sample git repositories on this machine | `setup_demo.py` creates small local git repositories with a `PROJECT.yaml` and some code (`package.json`, `tsconfig.json`, a React file, a project skill), and registers them in `config/projects.yaml`. In production these would be the teams' real repositories, cloned and kept up to date by spec 010. |

### How it fits together

```
Claude Code ──HTTP + login token──▶ run_gateway.py  (127.0.0.1:8765/mcp)
                                       │
                                       ▼
                             real platform code (app/)
                 ┌──────────────┬──────────────┬──────────────┐
             login check    project context     skills         agents
                 │               │                 │              │
         simulated login   repos/payments-web  cache/skills   repos/platform-agents
                                               (fetched from
                                                GitHub on start)
```

### Demo users

| User | Group | Allowed |
|---|---|---|
| alice | group-payments | `payments-web`: project, skills, agents |
| bob | group-readers | `payments-web`: project context only |
| carol | group-billing | `billing-portal` only |

---

## 2. The day before: a full dry run (about 10 minutes)

Open PowerShell:

```powershell
# 1. Product code on the merged branch
cd D:\office_work\AI-Assisted-SDLC-platform
git status                      # must be clean: commit or stash anything first
git checkout release_candidate-sdd
git pull

# 2. Fresh demo data
cd D:\office_work\sdlc-platform-demo
python setup_demo.py
```

Then go through **section 3** once from start to finish.

> **Why the branch matters:** the demo imports the platform code straight from the product
> repository, so whatever branch is checked out there is what runs. On `release_candidate-sdd`,
> you're showing exactly what is merged and green in CI.

---

## 3. 15 minutes before the meeting

### Step 1: start the server (Terminal 1)

```powershell
cd D:\office_work\sdlc-platform-demo
python run_gateway.py
```

Check that it prints:

```
Skills: https://github.com/MsTechmentTechnology/AI-Assisted-Development-Agents @ platform-skill-metadata -> b69adc7 ...
SDLC platform gateway (demo) on http://127.0.0.1:8765/mcp
Tools: project.get-context, skill.list, skill.get, skill.resolve, skill.open-proposal, agent.list, agent.get, agent.resolve
```

**Leave this window open.** It's the audit log you'll show in demo step 8.

### Step 2: run the dry-run check (Terminal 2)

```powershell
cd D:\office_work\sdlc-platform-demo
python demo_check.py
```

Expected last line: **`13 / 13 checks passed`**. If you get anything else, see section 6.

### Step 3: create the login token

Tokens last **1 hour** at most (the platform refuses anything longer), so do this close to the
meeting:

```powershell
python connect_claude.py
```

### Step 4: open Claude Code in the demo folder

1. VS Code: **File → Open Folder → `D:\office_work\sdlc-platform-demo`**.
2. Open the Claude Code panel.
3. When asked to use the **`sdlc-platform`** MCP server, choose **approve**.
4. Type `/mcp` and check that `sdlc-platform` shows as **connected**.

### Step 5: arrange the screen

Have the Claude Code panel, Terminal 1 (the server log) and a browser tab ready. Close anything
unrelated.

---

## 4. The demo

### Opening line

> "Everything you'll see is the real platform code we've merged, running live. Only two things are
> simulated: the login, which stands in for Entra ID, and a sample project. The skills are our
> team's real skills, served straight from GitHub."

### Demo steps

**Tip:** always name the project in your prompt. The platform never guesses a project.

| # | Do this | What appears | Say this |
|---|---|---|---|
| 1 | In the browser, open `http://127.0.0.1:8765/healthz` | Name, version, status | "The health check is public, but it reveals nothing else. Everything else needs a login." |
| 2 | *What tools does the sdlc-platform server give you?* | 8 tools: project, skills, agents | "Claude Code connected to our platform and sees 8 governed tools." |
| 3 | *Get the project context for payments-web. What are its source of truth, languages and framework?* | Jira; TypeScript and JavaScript; React | "It reads the project's `PROJECT.yaml` at an exact commit and works out the stack from the code." |
| 4 | *Which skills apply to an implement task in payments-web?* | `frontend-code-generation 0.2.0` (organisation) + `payments-conventions 1.0.0` (project) | "It picks the right skills automatically: our team's frontend skill from GitHub, plus the project's own conventions." |
| 5 | *Show me the payments-conventions skill, version 1.0.0, in full.* | Token shown as `[REDACTED:github-pat]` | See the talking point below. |
| 6 | *Which agents can implement a change in payments-web?* | Only `frontend`, with the frontend skill | "A `security` agent exists, but this project's policy doesn't allow it, so it's never offered." |
| 7 | *Get the project context for billing-portal.* | Refused: `project_not_entitled` | "Alice isn't entitled to that project. Users see only their own projects." |
| 8 | Switch to **Terminal 1** | Audit lines for every call | "Every call is audited: who, which project, which tool, allowed or refused. No tokens or secrets appear in the log." |

### Talking point for step 5

Claude will warn that "a secret is committed and should be rotated." Use that moment:

> "That token is fake; we planted it on purpose. The point is that even if a real one slips into a
> skill, the platform strips it before the AI ever sees it, and logs that it did."

### Optional: least privilege (about 2 minutes)

1. Terminal 2: `python connect_claude.py --user bob`
2. Claude Code: `/mcp`, then reconnect `sdlc-platform`
3. Ask: *List the skills for payments-web.*
4. The result is refused: `missing_scope` (`Requires skill:read`).
5. Say: "Bob can read projects but has no skill permission."
6. Switch back afterwards: `python connect_claude.py`, then reconnect with `/mcp`.

### Optional: agent tool permissions

Claude Code can't yet name which agent is making a call; that comes with the agent runtime (spec
014). Show it instead with `python demo_check.py`, **step 8** of its output:

- `qa may not call skill.resolve`: refused
- `the security agent is not allowed on this project`: refused

---

## 5. Closing: what's next (1–2 minutes)

**Done:** specs 001–008, the platform foundation (security, gateway, skills, agents).
1,467 tests pass with 98.5% coverage, and every merge is checked by CI.

**Not shown yet, said honestly:**

- Real Entra ID login: waiting on the staging secrets (005 T045).
- Jira, Azure DevOps and GitHub connectors, code generation, quality gates and the end-to-end
  workflows: specs 009–017, still being specified.
- The platform fetching from GitHub itself: the demo script does it today; spec 010 moves it into
  the platform.

**Asks:**

- Branch protection on the platform repository, from a repository admin (001 T031).
- The Entra staging secrets (005 T045).
- The team adopting the spec 003 skill format. The skills PR is ready on `platform-skill-metadata`.

---

## 6. If something goes wrong

| Problem | Fix |
|---|---|
| Claude Code shows 401 or `AUTH_HEADER_REJECTED` | The token expired (1 hour). Run `python connect_claude.py`, then reconnect with `/mcp`. |
| 401 right after re-running `setup_demo.py` | `setup_demo.py` creates a new login key; an old server still uses the old one. Stop the old `run_gateway.py` (Ctrl+C, or close its window), start it again, then `python connect_claude.py` |
| `Could not fetch skills from …` when starting | No network or no GitHub access. Run `python run_gateway.py --offline` to use the last fetched copy. |
| Skills list is empty | The branch's `SKILL.md` files lack the spec 003 frontmatter. Check `branch` in `skills_source.yaml`. |
| `demo_check.py` says "Cannot reach" | Start `python run_gateway.py` first. |
| Port 8765 already in use | An old server is still running. Close that window, or restart the terminal. |
| Claude Code won't connect at all | Fall back to `python demo_check.py`: the same scenarios, shown as terminal output. |
| Anything else | Run `python setup_demo.py`, then restart `python run_gateway.py`. |

---

## 7. After the meeting

- Stop the server: **Ctrl+C** in Terminal 1.
- Nothing needs undoing: the product repository was never changed.

---

## 8. Reference

### Files in this folder

| File | What it does |
|---|---|
| `setup_demo.py` | Creates `keys/`, `repos/` and `config/`. Re-run to reset. `--sample-skills` uses local sample skills instead of GitHub. |
| `skills_source.yaml` | The GitHub repository and **branch** the company skills come from |
| `run_gateway.py` | Fetches the skills branch into `cache/skills`, then starts the real gateway. `--offline` skips the fetch. |
| `mint_token.py` | Prints a login token for `alice`, `bob` or `carol` |
| `connect_claude.py` | Writes `.mcp.json` with a fresh token for Claude Code |
| `demo_check.py` | Runs all 13 scenarios over HTTP: the dry run and the fallback |
| `demo_common.py` | Shared settings: issuer, port, project names |

### Changing the skills

- **Update a skill:** push to `platform-skill-metadata` on GitHub, then restart `run_gateway.py`.
- **Show another branch:** change `branch:` in `skills_source.yaml`, then restart. The branch's skills need the
  spec 003 frontmatter (`schema_version`, `kind: skill`, `name`, `version`, `description`,
  `applies_to`, `status`), or the platform skips them.

### The skills branch

- **Repository:** `MsTechmentTechnology/AI-Assisted-Development-Agents`
- **Branch:** `platform-skill-metadata`, pushed, **no PR yet**
- **Contents:** `origin/release_candidate` + `frontend-code-generation` + one commit (`b69adc7`) adding the
  spec 003 frontmatter. The skill body is unchanged.
- **Next step:** open a PR into `release_candidate` once testing is done. That repository requires
  approval before merging.

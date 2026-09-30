# SDLC Platform — Team Q&A Preparation

Questions the team (AI experts) is likely to ask, with honest answers, plus exactly what is hardcoded and
what is not.

- **Checked against the code:** 30 September 2026, product repository `release_candidate-sdd` at `1f8ea00`.
- **Companion:** [DEMO_GUIDE.md](DEMO_GUIDE.md) (how to run the demo).

---

## 1. The one-line answer

> **The platform code has nothing hardcoded for this demo.** Everything demo-specific is
> configuration and sample data in the demo folder. The platform code is the merged code,
> unchanged.

Evidence, checked directly:

| Check | Result |
|---|---|
| Demo names (`payments`, `alice`, `techment`, `billing`, `demo`) anywhere in `app/` | **None found** |
| Files in `app/` changed for the demo | **None**; `git status` is clean |
| AI model SDKs (Anthropic, OpenAI, …) imported by `app/` | **None**, and CI blocks them (Principle X) |

---

## 2. Fixed values in the platform code (product rules, not shortcuts)

| Fixed in code | Value | Why |
|---|---|---|
| Maximum token lifetime | 1 hour | Security requirement, spec 005 FR-003 |
| Default host and port | `127.0.0.1:8765` | Only a default; `gateway.yaml` overrides it |
| Supported MCP protocol versions | `2025-06-18`, `2025-03-26`, `2024-11-05` | The MCP standard's published versions |
| Stack-detection rules | e.g. `react` in `package.json` → React; `tsconfig.json` → TypeScript; `requirements.txt` → Python | Deterministic, auditable rules (spec 002); every fact is returned with its evidence |
| Secret-detection rules | The gitleaks default rule set, vendored with its version | An industry-standard rule set, not custom patterns |

---

## 3. What the demo folder provides (sample data and configuration)

| What | Where | Honest description |
|---|---|---|
| Users `alice`, `bob`, `carol` and their groups | `mint_token.py` | Test users. In production they come from Entra ID. |
| Login issuer and signing key | `demo_common.py`, `keys/` | Simulated identity provider. The checking code is the production code. |
| Which group sees which project, with which scopes | `config/entitlements.yaml` | **Configuration, not code.** Edit it and permissions change. |
| Projects and their repositories | `config/projects.yaml` + `repos/` | Sample git repositories on this machine |
| Company policy (`allowed_agents`, quality gates) | `config/policy/global.yaml` | Configuration |
| Agents `frontend`, `qa`, `security` | `repos/platform-agents` | Sample agent definitions; the platform's real `agents/` folder is still empty |
| Repository URLs such as `https://github.com/techment-demo/payments-web` | `setup_demo.py` | **Identity labels only.** The `techment-demo` organisation doesn't exist, and nothing ever connects to these URLs. The platform uses the URL to identify a repository and show where data came from. |
| The fake GitHub token | the project skill `payments-conventions` | Planted deliberately to show masking |
| Company skills | GitHub, `MsTechmentTechnology/AI-Assisted-Development-Agents`, branch `platform-skill-metadata` | **Real**, fetched live on every start |
| Expected results | `demo_check.py` | The **test's** expectations. The server doesn't know them; nothing is scripted. |

---

## 4. Likely questions and answers

### "Are the answers scripted?"

No. Claude Code writes each answer live from the tool results, and each tool result is computed on
the spot from git at an exact commit. Change a file, commit it, and the answer changes.

**Live proof you can offer:**
- Change a group's scopes in `config/entitlements.yaml`, restart `run_gateway.py`, and the same
  question is now allowed or refused.
- Point `skills_source.yaml` at another branch, restart, and the skills list changes.

### "Where is the AI? Does the platform use an LLM, embeddings or RAG?"

The platform makes **no model calls**, by design (constitution Principle X), and CI enforces it: model
SDKs can't even be imported. The platform is the **governed context and permission layer**; the AI
runs in the client (Claude Code, Copilot, …).

Why this design:
- **Model-neutral:** any MCP client can use it.
- **Deterministic and auditable:** the same inputs give the same result.
- **Data stays put:** the server sends no company content to a model provider.

### "How does it choose skills without AI?"

By **deterministic matching**. Each skill declares `applies_to` (languages, frameworks, tasks). The
platform matches that against:
1. facts inferred from the code (e.g. TypeScript and React from `package.json` and `tsconfig.json`), and
2. the task words the client sends (e.g. `implement`).

Company skills must be `accepted`, and project skills layer on top of company skills.

### "What are the limitations of that matching?"

**Say this yourself before it's discovered:** task matching is **literal**. If the client sends `build`
instead of `implement`, the frontend skill won't match, because it lists `implement` and `generate`.
Relevance ranking, synonyms and context assembly are **spec 013**, still in specification. At MVP,
search is exact, structural and lexical; embeddings are out of scope (spec 012).

### "What stops the AI from reaching data it shouldn't?"

The **server** enforces it, not the model. Every call is checked against:
- the user's token (signature, issuer, audience, expiry, revocation);
- the user's group entitlements (which projects, which scopes);
- the agent's allowed tools and the project's allowed agents, when a call is made on behalf of an agent.

A refusal is a coded error (e.g. `policy.refused` / `project_not_entitled`). It's never merely "the
model decided not to".

### "What about prompt injection? Could a skill's text tell the AI to do something bad?"

The platform treats skill and project content as **data**: it validates metadata, masks secrets
and records the content hash. But it doesn't judge the *instructions* inside a skill. The defence is
**governance**: company skills must be `accepted` through a reviewed PR, and whatever the text says,
the server still enforces permissions on every tool call. A skill can't grant itself access.

### "What if a secret ends up in a skill or a file?"

The server masks it **before** the text leaves, using the gitleaks rules, replacing it with
`[REDACTED:<rule>]` and recording a `secret.masked` audit event. The model never sees the value.
The source still needs the secret rotated. Masking is a safety net, not a replacement for hygiene.

### "Is the login real?"

The token is a standard signed JWT, and the checking code is the production code. Only the
**issuer** is simulated. Switching to Entra ID is a configuration change (`security.yaml`), blocked
today only by the staging secrets (005 T045).

### "How do you know which skill version or which code was used?"

Every result is traceable:
- the project context carries the repository **commit SHA**;
- every skill carries its **version and content hash**;
- every call has a **correlation ID** in the audit log.

So any answer can be traced back to exact inputs.

### "Why MCP?"

It's the open standard AI clients use to call tools. One server works with Claude Code, and with
any other MCP client, without per-client integrations.

### "How is this tested?"

- 1,467 automated tests, with 98.5% coverage.
- Every PR must pass CI: lint, strict typing, architecture boundaries, a guard against editing the
  legacy code, spec status, a no-`.env` check, and the tests.
- Code can't be merged for a feature whose specification isn't `Accepted`.

### "Does it scale? How fast is it?"

Honest answer: it isn't load-tested yet. Resolution reads git at a commit, runs in worker threads,
and caches file contents by hash. Performance and managed workspaces come with specs 010 and 012.
One known item: indexing a very large skills repository cold can take seconds (tracked as 007 T031).

### "What's not built yet?"

- Real Entra ID login (waiting on staging secrets)
- Jira, Azure DevOps and GitHub connectors (spec 010)
- Code generation, quality gates and verification (specs 014–016)
- Ranking and context assembly (spec 013)
- The end-to-end greenfield and brownfield workflows (specs 017–019)

### "When will it be done?"

The MVP plan estimates about **36 weeks** from the start (33–34 with the speed-up options it lists).
Specs 001–008, the foundation, are accepted and implemented.

---

## 5. Answers to avoid

| Don't say | Say instead |
|---|---|
| "The AI decides who can see what." | "The server enforces access on every call; the AI only sees what's allowed." |
| "It uses AI to pick skills." | "It uses deterministic matching on declared metadata and the code's detected stack." |
| "Login is done." | "Login checking is done; the Entra ID connection is a configuration step, waiting on secrets." |
| "It's production-ready." | "The foundation is merged and tested; the workflows are next." |
| "Those are our repositories." (about `techment-demo/...`) | "Those are sample projects on this machine; the skills are real, from our GitHub." |

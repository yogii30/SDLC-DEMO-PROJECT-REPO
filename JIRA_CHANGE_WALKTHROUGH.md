# Walkthrough: one Jira change, from ticket to pull request

This guide takes one small change through the whole platform: a **Show password** toggle on the
`payments-web` login page. You create the Jira ticket, sign in with `sdlc auth login`, and drive a
`greenfield-frontend` run from your editor until a reviewed pull request is waiting for you.

The platform never merges and never approves a gate. Each step below says whether **you** do it, or
**the assistant** in your editor does it with the `sdlc` tools.

| | |
|---|---|
| Project | `payments-web` (repository `yogii30/SDLC-DEMO-PROJECT-REPO`, Source of Truth `jira:SDLC`) |
| Workflow | `greenfield-frontend` |
| Steps in the run | plan → implement → test → review → pull-request → write-back |
| Gates that need a person | **context-review** (before any code) and **pull-request-review** (at the end) |

For installing the CLI and onboarding a new repository, see [CLI_ONBOARDING.md](CLI_ONBOARDING.md).

---

## 0. Before you start

Check these once:

- The gateway is running, and it was restarted after the last change to the demo repository. It
  fetches every project repository when it starts.
- The demo repository's **default branch on GitHub** is the one that holds `PROJECT.yaml`
  (`sdlc-demo-greenfield`). The gateway always reads the default branch.
- Your GitHub token can read and push to `yogii30/SDLC-DEMO-PROJECT-REPO`.

To start the gateway locally:

```bash
cd sdlc-agent-platform
.venv/bin/python -m app.mcp --config ~/sdlc/config/gateway.yaml
```

---

## 1. Create the Jira ticket (you, in Jira)

The platform reads tickets but does not create them. In the **SDLC** project, create a **Story**:

**Summary**

```text
Login page: add a Show password toggle
```

**Description**

```text
The login page (SDLC-39) shows the password as dots only. Users who mistype a long password
cannot check it before submitting.

Add a toggle button inside the password field that shows or hides the password.
UI only: no change to how the form submits or validates.

## Acceptance Criteria

- The password field shows a "Show password" button at its right edge.
- Selecting it shows the password as plain text and changes the label to "Hide password".
- Selecting it again hides the password.
- The button is reachable with Tab and works with Enter and Space.
- The button has aria-pressed set to true or false to match the current state.
- Submitting the form never sends or logs anything extra because of the toggle.
```

Keep the `## Acceptance Criteria` heading and the bullet list exactly as shown. The platform reads
the bullets under that heading as the criteria the change must meet.

Link it to **SDLC-39** ("relates to"), set the status to **To Do**, and note the key Jira gives it.
This guide writes it as **`SDLC-XX`**. Replace that with your real key everywhere below.

---

## 2. Sign in (you, in a terminal)

```bash
sdlc auth login \
  --gateway   http://127.0.0.1:8765 \
  --issuer    http://localhost:8080/realms/sdlc \
  --client-id sdlc-cli \
  --scope     profile
```

A browser opens on the Keycloak sign-in page. Sign in, then go back to the terminal. The four flags
are needed only the first time: later sign-ins are just `sdlc auth login`.

Plain `http` is accepted only for `localhost` and `127.0.0.1`. A shared gateway needs `https`.

---

## 3. Set your connector credentials (you, once)

This gateway acts at Jira and GitHub with **your** credentials (`credential_source: caller`):

```bash
sdlc auth credential set jira      # your Atlassian email, then an API token
sdlc auth credential set github    # a token with contents and pull request write access
sdlc auth status
```

`sdlc auth status` should end with:

```text
github credential: set
jira credential:   set
```

Credentials are kept in the macOS Keychain and sent only to your gateway.

---

## 4. Connect your editor (you, once)

```bash
sdlc connect claude-code      # or: cursor, vscode
```

Restart the editor (or reload its MCP servers). The `sdlc` tools appear in its tool list.

---

## 5. Read the ticket (assistant)

Ask in the editor:

> Using the sdlc tools, read work item SDLC-XX in project payments-web.

The assistant calls:

```text
tracker.get-work-item  { project: "payments-web", work_item_key: "SDLC-XX" }
```

**Check:** the summary is right, and all six acceptance criteria are listed. If a criterion is
missing, fix the ticket in Jira and ask again.

---

## 6. Build the context package (assistant, then you review)

> Assemble the context package for SDLC-XX.

```text
context.assemble-package  { project: "payments-web", work_item: "SDLC-XX" }
```

The assistant shows you what the package contains and what it left out:

- the ticket and its acceptance criteria
- the company and project skills that apply (frontend conventions, `.sdlc/skills/payments-conventions.md`)
- code from the repository: the existing login page and its tests
- the organisation's principles

If something is missing or irrelevant, say so. The assistant rebuilds the package with `include`
or `exclude`. When the package is right, **approve it**. The assistant notes the package's
**hash**; the run is tied to that exact package.

---

## 7. Start the run (assistant)

> Start a greenfield-frontend run for SDLC-XX with that package.

```text
run.start  { project: "payments-web", workflow: "greenfield-frontend", context_package: "<hash>" }
```

Name `greenfield-frontend` explicitly: if you leave it out, the run uses `greenfield-backend`.

The run's ID comes back. `workflow.get-progress` shows where the run is at any time.

---

## 8. Gate 1: context review (you approve)

```text
workflow.get-context-review  { run_id }
```

The assistant shows the review. If you accept it, tell the assistant, and it records your approval:

```text
run.approve-gate  { run_id, gate: "context-review" }
```

No code is written before this gate is approved.

---

## 9. The run's steps (assistant, you watch)

From here the assistant loops: `run.get { run_id }`, then does what `next` says.

| Step | What happens | Tools |
|---|---|---|
| **plan** | Reads the package and writes a short plan: which component changes, the toggle's state, the tests to add. The plan is checked against the ticket. | `context.get-package`, `run.start-step`, `run.record-step` |
| **implement** | Creates the run's branch and commits the toggle in the login component, working as the `frontend` agent. | `repository.create-branch` (once), `repository.commit` |
| **test** | Commits tests for each criterion on the same branch: show, hide, label change, keyboard, `aria-pressed`. Works as the `qa` agent. | `repository.commit` |
| *verification* | After each new commit: lint, tests and secret scanning run against it. The run does not move on until verification passes. | `gate.start-verification`, `gate.get-verification` |
| **review** | An independent review (see step 10). | |
| **pull-request** | Opens the pull request from the run's branch. Only a verified commit can be opened. | `repository.open-pull-request` |
| **write-back** | Records what was done and updates Jira: a comment on SDLC-XX with the pull request link, and a status change. | `run.record-completion`, `tracker.comment`, `tracker.set-status` |

If a step fails, `next` says to retry or rerun it. Review and fix rounds are limited to two each.

---

## 10. The independent review (you open a new session)

The review must not see how the code was written. When `next` says the **review** step is due:

1. Open a **new** editor session with nothing from the current one.
2. Ask: *"Review the run `<run_id>` in project payments-web."*
3. That session calls `run.start-step`, `run.get-review-package`, and `run.record-step` with its
   verdict.
4. Go back to the first session. If the review asked for changes, the run goes back to implement;
   otherwise it continues to the pull request.

---

## 11. Gate 2: pull-request review (you)

When `next` says `approve_gate` for **pull-request-review**:

1. Open the pull request on GitHub and review it as you would any change. Try the toggle locally if
   you want.
2. Check that SDLC-XX has the platform's comment with the pull request link.
3. If you accept it, tell the assistant, and it records your approval:

   ```text
   run.approve-gate  { run_id, gate: "pull-request-review" }
   ```

4. The assistant closes the run:

   ```text
   run.close  { run_id }
   ```

**Merging is yours.** Merge the pull request on GitHub when you are ready. The platform never does.

---

## Quick reference

| # | Who | What |
|---|---|---|
| 1 | You | Create the Story in Jira, with `## Acceptance Criteria` |
| 2 | You | `sdlc auth login` |
| 3 | You | `sdlc auth credential set jira` / `github` (once) |
| 4 | You | `sdlc connect claude-code` (once) |
| 5 | Assistant | `tracker.get-work-item` |
| 6 | Assistant → you | `context.assemble-package`, then you approve the package |
| 7 | Assistant | `run.start` with `greenfield-frontend` and the package hash |
| 8 | **You** | Gate 1: approve `context-review` |
| 9 | Assistant | plan → implement → test, verified after each commit |
| 10 | You (new session) | Independent review |
| 11 | Assistant | Open the pull request, write back to Jira |
| 12 | **You** | Gate 2: approve `pull-request-review`, then merge on GitHub |

You can also ask the editor for the `workflow.implement-work-item` prompt with `work_item: SDLC-XX`
and `workflow: greenfield-frontend`. It gives the assistant this whole procedure in one message.

## When something goes wrong

| You see | Do this |
|---|---|
| `cli.not_signed_in` or the editor says *"Signed out of the SDLC platform"* | `sdlc auth login` |
| `no PROJECT.yaml at the repository root` | Make the branch with `PROJECT.yaml` the default branch on GitHub, then restart the gateway |
| *"could not clone this repository into its workspace"* | Your GitHub token can't read the repository: `sdlc auth credential set github` with one that can |
| `context.assemble-package` fails with `internal.error` | The gateway is older than the fix for this (spec 013, correlation ID). Update it and restart |
| The run is waiting and nothing happens | `workflow.get-progress`: it is probably waiting on a gate only you can approve |

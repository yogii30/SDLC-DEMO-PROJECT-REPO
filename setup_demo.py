"""Create everything the demo gateway reads: a signing key, small local git repositories and the
gateway configuration. Safe to re-run: it deletes and recreates keys/, repos/ and config/.

    python setup_demo.py                  # company skills from GitHub (skills_source.yaml)
    python setup_demo.py --sample-skills  # company skills from a local sample repository

The team's skills repository is only read, never changed: run_gateway.py fetches the branch named
in skills_source.yaml into cache/skills on every start.
"""

from __future__ import annotations

import argparse
import os
import random
import shutil
import string
import subprocess
import tempfile
from pathlib import Path

import yaml

from demo_common import (
    AUDIENCE,
    CONFIG_DIR,
    ISSUER,
    KEYS_DIR,
    OTHER_PROJECT,
    PROJECT,
    REPOS_DIR,
    SAMPLE_SKILLS_MARKER,
    SKILLS_SOURCE,
    create_key,
)

COMPANY_SKILLS_URL = "https://github.com/techment-demo/company-skills"
PLATFORM_URL = "https://github.com/techment-demo/sdlc-agent-platform"
PROJECT_URL = f"https://github.com/techment-demo/{PROJECT}"
OTHER_URL = f"https://github.com/techment-demo/{OTHER_PROJECT}"

PACKAGE_JSON = """{
  "name": "payments-web",
  "private": true,
  "dependencies": {"react": "^18.3.1", "react-dom": "^18.3.1"},
  "devDependencies": {"typescript": "^5.6.0", "vite": "^5.4.0"}
}
"""

# A fake GitHub token, built at run time, planted in a skill to show spec 005's masking.
FAKE_GITHUB_TOKEN = "gh" + "p_" + "".join(random.choices(string.ascii_letters + string.digits, k=36))


# ---------------------------------------------------------------- file builders


def skill(name: str, version: str, sections: dict[str, str], **extra: object) -> str:
    front: dict[str, object] = {
        "schema_version": "1.0.0",
        "kind": "skill",
        "name": name,
        "version": version,
        "description": extra.pop("description", f"The {name} skill."),
        "applies_to": extra.pop("applies_to", "any"),
        "status": "accepted",
        **extra,
    }
    body = "".join(f"## {heading}\n\n{text}\n\n" for heading, text in sections.items())
    return "---\n" + yaml.safe_dump(front, sort_keys=False) + "---\n" + body


def agent(name: str, role: str, tools: list[str], **extra: object) -> str:
    front: dict[str, object] = {
        "schema_version": "1.1.0",
        "kind": "agent",
        "name": name,
        "version": "1.0.0",
        "description": extra.pop("description", f"The {name} agent."),
        "applies_to": extra.pop("applies_to", "any"),
        "status": "accepted",
        "tools": tools,
        "role": role,
        "skills": extra.pop("skills", []),
        "output": "change-summary",
    }
    body = str(extra.pop("instructions", f"## Instructions\n\nAct as the {name} agent.\n"))
    return "---\n" + yaml.safe_dump(front, sort_keys=False) + "---\n" + body


def manifest(project: str, team: str, jira_key: str) -> str:
    return yaml.safe_dump(
        {
            "api_version": "platform/v1",
            "kind": "project",
            "project": project,
            "owner": {"team": team},
            "lifecycle": "brownfield",
            "source_of_truth": {"jira": {"project_key": jira_key}},
        },
        sort_keys=False,
    )


# ---------------------------------------------------------------- git


def git_env() -> dict[str, str]:
    """A fixed identity and no user or system git config (no signing, no hooks), as the platform's
    own tests do. Applies only to these throwaway demo repositories."""
    empty = Path(tempfile.gettempdir()) / "sdlc-demo-empty-gitconfig"
    empty.write_text("", encoding="utf-8")
    return {
        **os.environ,
        "GIT_AUTHOR_NAME": "SDLC Demo",
        "GIT_AUTHOR_EMAIL": "demo@example.invalid",
        "GIT_COMMITTER_NAME": "SDLC Demo",
        "GIT_COMMITTER_EMAIL": "demo@example.invalid",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": str(empty),
    }


def make_repo(name: str, origin: str, files: dict[str, str]) -> Path:
    path = REPOS_DIR / name
    path.mkdir(parents=True)
    env = git_env()

    def git(*args: str) -> None:
        subprocess.run(["git", "-C", str(path), *args], check=True, capture_output=True, env=env)

    git("init", "-q", "-b", "main")
    git("config", "core.autocrlf", "false")
    for relative, text in files.items():
        target = path / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(text.encode("utf-8"))
    git("add", "-A")
    git("commit", "-q", "-m", "Initial demo content")
    # Look like a clone of `origin` without any network: the platform reads origin's URL and
    # origin/HEAD to identify the repository and its default branch.
    git("remote", "add", "origin", origin)
    git("update-ref", "refs/remotes/origin/main", "HEAD")
    git("symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main")
    return path


# ---------------------------------------------------------------- content


def build_sample_skills() -> None:
    """A small stand-in company skills repository, for --sample-skills."""
    make_repo(
        "company-skills",
        COMPANY_SKILLS_URL,
        {
            "README.md": "# Company skills (demo)\n",
            "skills/frontend-code-generation.md": skill(
                "frontend-code-generation",
                "0.2.0",
                {"Overview": "Generate production-ready React, Vue or Angular TypeScript code."},
                applies_to={"languages": ["typescript", "javascript"], "tasks": ["implement"]},
            ),
        },
    )


def build_repos(sample_skills: bool) -> None:
    if sample_skills:
        build_sample_skills()
    make_repo(
        "platform-agents",
        PLATFORM_URL,
        {
            "agents/README.md": "# Agent definitions (demo)\n",
            "agents/frontend.md": agent(
                "frontend",
                "frontend",
                ["project.get-context", "skill.resolve", "skill.get", "agent.resolve", "agent.get"],
                applies_to={"languages": ["typescript", "javascript"]},
                skills=[{"name": "frontend-code-generation", "range": "^0.2"}],
                description="Implements frontend changes in React, Vue and Angular apps.",
                instructions="## Instructions\n\nImplement the change, then run the tests.\n",
            ),
            "agents/qa.md": agent(
                "qa",
                "qa",
                ["project.get-context"],
                applies_to={"tasks": ["test"]},
                description="Writes and runs tests.",
            ),
            "agents/security.md": agent(
                "security", "security", ["project.get-context"], description="Security review."
            ),
        },
    )
    make_repo(
        PROJECT,
        PROJECT_URL,
        {
            "PROJECT.yaml": manifest(PROJECT, "payments", "PAY"),
            "README.md": "# Payments web app (demo)\n",
            "package.json": PACKAGE_JSON,
            "tsconfig.json": '{\n  "compilerOptions": {"strict": true, "jsx": "react-jsx"}\n}\n',
            "src/App.tsx": "export function App() {\n  return <h1>Payments</h1>;\n}\n",
            # The project's own skill carries the planted token, so the team's skills stay clean.
            ".sdlc/skills/payments-conventions.md": skill(
                "payments-conventions",
                "1.0.0",
                {
                    "Overview": (
                        "Show amounts from integer minor units; never do money maths in floats."
                        f"\n\nStaging deploy token: {FAKE_GITHUB_TOKEN}"
                    ),
                },
                description="UI conventions specific to the payments team.",
            ),
        },
    )
    make_repo(
        OTHER_PROJECT,
        OTHER_URL,
        {
            "PROJECT.yaml": manifest(OTHER_PROJECT, "billing", "BILL"),
            "README.md": "# Billing portal (demo)\n",
            "package.json": '{"name": "billing-portal", "private": true}\n',
        },
    )


def write_config(sample_skills: bool) -> None:
    CONFIG_DIR.mkdir()
    (CONFIG_DIR / "policy").mkdir()
    files = {
        "gateway.yaml": {
            "name": "sdlc-platform",
            "version": "0.1.0",
            "security": "security.yaml",
            "policy_dir": "policy",
            "projects": "projects.yaml",
            "skills": (
                {"repository": COMPANY_SKILLS_URL, "working_copy": "../repos/company-skills"}
                if sample_skills
                else {
                    "repository": str(yaml.safe_load(SKILLS_SOURCE.read_text(encoding="utf-8"))["repository"]),
                    "working_copy": "../cache/skills",
                }
            ),
            "agents": {"directory": "../repos/platform-agents/agents"},
        },
        "security.yaml": {
            "providers": [
                {
                    "name": "demo-idp",
                    "issuer": ISSUER,
                    "audience": AUDIENCE,
                    "subject_claim": "oid",
                    "token_id_claim": "uti",
                }
            ],
            "entitlements": "entitlements.yaml",
        },
        "entitlements.yaml": {
            "groups": {
                "group-payments": {
                    "projects": [PROJECT],
                    "scopes": ["project:read", "skill:read", "agent:read"],
                },
                "group-readers": {"projects": [PROJECT], "scopes": ["project:read"]},
                "group-billing": {
                    "projects": [OTHER_PROJECT],
                    "scopes": ["project:read", "skill:read", "agent:read"],
                },
            }
        },
        "projects.yaml": {
            "projects": {
                PROJECT: {"repository": PROJECT_URL, "working_copy": f"../repos/{PROJECT}"},
                OTHER_PROJECT: {
                    "repository": OTHER_URL,
                    "working_copy": f"../repos/{OTHER_PROJECT}",
                },
            }
        },
        "policy/global.yaml": {
            "quality_gates": {"min_coverage": 80, "typecheck": True, "lint": True, "tests": True},
            "required_scans": ["secrets", "dependencies"],
            "reviewers": {"min_approvals": 1, "required_roles": ["security"]},
            "agent_authorisation": {"allowed_agents": ["backend", "frontend", "qa", "reviewer"]},
            "ranges": {"quality_gates.min_coverage": {"min": 70, "max": 100}},
        },
    }
    for name, data in files.items():
        (CONFIG_DIR / name).write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample-skills", action="store_true", help="use a local sample skills repository")
    sample_skills = parser.parse_args().sample_skills
    for directory in (KEYS_DIR, REPOS_DIR, CONFIG_DIR):
        if directory.exists():
            # git marks object files read-only; clear the flag so Windows can delete them.
            shutil.rmtree(directory, onexc=lambda f, p, _: (os.chmod(p, 0o700), f(p)))
    create_key()
    build_repos(sample_skills)
    write_config(sample_skills)
    print("Demo ready:")
    print(f"  keys/    signing key of the simulated identity provider")
    if sample_skills:
        SAMPLE_SKILLS_MARKER.write_text("", encoding="utf-8")
    source = yaml.safe_load(SKILLS_SOURCE.read_text(encoding="utf-8"))
    skills = ("repos/company-skills (sample)" if sample_skills
              else f"GitHub {source['repository']} @ {source['branch']} (fetched by run_gateway.py)")
    print(f"  skills   {skills}")
    print(f"  repos/   platform-agents, {PROJECT}, {OTHER_PROJECT}")
    print(f"  config/  gateway, security, entitlements, projects, policy")
    print("Next: python run_gateway.py")


if __name__ == "__main__":
    main()

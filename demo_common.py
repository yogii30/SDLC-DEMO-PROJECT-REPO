"""Shared settings for the SDLC platform demo.

The demo runs the real platform code from the AI-Assisted-SDLC-platform checkout (installed with
``pip install -e``). Only the identity provider is simulated: a local RSA key stands in for Entra
ID, and the gateway fetches its public key in-process instead of over the network.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import httpx
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPrivateKey
from jwt.algorithms import RSAAlgorithm

HERE = Path(__file__).resolve().parent
CONFIG_DIR = HERE / "config"
REPOS_DIR = HERE / "repos"
KEYS_DIR = HERE / "keys"
KEY_FILE = KEYS_DIR / "demo-signing-key.pem"
GATEWAY_CONFIG = CONFIG_DIR / "gateway.yaml"
SKILLS_SOURCE = HERE / "skills_source.yaml"
SKILLS_CACHE = HERE / "cache" / "skills"
SAMPLE_SKILLS_MARKER = CONFIG_DIR / "sample-skills"

# Spec 005 accepts an http:// issuer only on localhost (a local test issuer). Nothing listens
# there: identity_provider_client() answers the discovery and key requests in-process.
ISSUER = "http://localhost/demo-idp/v2.0"
AUDIENCE = "api://sdlc-platform"
KEY_ID = "demo-rsa-1"

HOST = "127.0.0.1"
PORT = 8765
URL = f"http://{HOST}:{PORT}/mcp"

PROJECT = "payments-web"
OTHER_PROJECT = "billing-portal"


def create_key() -> None:
    KEYS_DIR.mkdir(exist_ok=True)
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    KEY_FILE.write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )


def load_key() -> RSAPrivateKey:
    if not KEY_FILE.exists():
        raise SystemExit("No demo signing key. Run: python setup_demo.py")
    key = serialization.load_pem_private_key(KEY_FILE.read_bytes(), password=None)
    assert isinstance(key, RSAPrivateKey)
    return key


def jwks() -> dict[str, Any]:
    public = json.loads(RSAAlgorithm.to_jwk(load_key().public_key()))
    public.update(kid=KEY_ID, use="sig", alg="RS256")
    return {"keys": [public]}


def identity_provider_client() -> httpx.AsyncClient:
    """An HTTP client that answers the OIDC discovery and JWKS requests in-process."""
    keys = jwks()

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/.well-known/openid-configuration"):
            return httpx.Response(200, json={"issuer": ISSUER, "jwks_uri": f"{ISSUER}/keys"})
        if request.url.path.endswith("/keys"):
            return httpx.Response(200, json=keys)
        return httpx.Response(404)

    return httpx.AsyncClient(transport=httpx.MockTransport(handler))

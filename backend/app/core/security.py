import logging
import ipaddress
from threading import Lock
from typing import Any, Dict, Optional
from urllib.parse import urlsplit

import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException, status
from jwt import PyJWKClient, PyJWKClientConnectionError, PyJWKClientError
from jwt.exceptions import PyJWKError, PyJWKSetError

from app.core.config import settings

logger = logging.getLogger("safenav.security")

_JWKS_CACHE_LIFESPAN_SECONDS = 300
_JWKS_TIMEOUT_SECONDS = 5
_JWKS_REFRESH_COOLDOWN_SECONDS = 30
_jwks_client: Optional[PyJWKClient] = None
_jwks_client_url: Optional[str] = None
_jwks_client_lock = Lock()


def _is_loopback(hostname: Optional[str]) -> bool:
    if not hostname:
        return False
    if hostname.lower() == "localhost":
        return True
    try:
        return ipaddress.ip_address(hostname).is_loopback
    except ValueError:
        return False


def _invalid_configuration() -> HTTPException:
    logger.error("Supabase JWT verification configuration is invalid")
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Authentication configuration is invalid on server.",
    )


def _validated_jwks_url() -> str:
    project_url = settings.SUPABASE_URL.strip()
    jwks_url = settings.SUPABASE_JWKS_URL.strip()
    issuer = settings.SUPABASE_JWT_ISSUER.strip()
    if not project_url or not jwks_url or not issuer or not settings.SUPABASE_JWT_AUDIENCE:
        raise _invalid_configuration()

    try:
        project = urlsplit(project_url)
        jwks = urlsplit(jwks_url)
        issuer_url = urlsplit(issuer)
        project_port = project.port
        jwks_port = jwks.port
        issuer_port = issuer_url.port
    except ValueError:
        raise _invalid_configuration()

    def valid_parts(parsed: Any) -> bool:
        return bool(
            parsed.hostname
            and parsed.scheme in ("https", "http")
            and parsed.username is None
            and parsed.password is None
            and not parsed.query
            and not parsed.fragment
        )

    if not all(valid_parts(parsed) for parsed in (project, jwks, issuer_url)):
        raise _invalid_configuration()

    local_http_allowed = (
        settings.ENVIRONMENT.strip().lower() in ("development", "local")
        and settings.SUPABASE_JWKS_ALLOW_INSECURE_LOCAL
    )

    def transport_allowed(parsed: Any) -> bool:
        if parsed.scheme == "https":
            return True
        return local_http_allowed and _is_loopback(parsed.hostname)

    if not all(transport_allowed(parsed) for parsed in (project, jwks, issuer_url)):
        raise _invalid_configuration()

    same_project_authority = (
        project.scheme == jwks.scheme == issuer_url.scheme
        and project.hostname.lower() == jwks.hostname.lower() == issuer_url.hostname.lower()
        and project_port == jwks_port == issuer_port
    )
    project_has_no_path = project.path in ("", "/")
    expected_issuer_path = issuer_url.path.rstrip("/") == "/auth/v1"
    expected_jwks_path = jwks.path == "/auth/v1/.well-known/jwks.json"
    if not (same_project_authority and project_has_no_path and expected_issuer_path and expected_jwks_path):
        raise _invalid_configuration()

    return jwks_url


def _get_jwks_client(jwks_url: str) -> PyJWKClient:
    global _jwks_client, _jwks_client_url
    if _jwks_client is None or _jwks_client_url != jwks_url:
        with _jwks_client_lock:
            if _jwks_client is None or _jwks_client_url != jwks_url:
                _jwks_client = PyJWKClient(
                    jwks_url,
                    cache_jwk_set=True,
                    lifespan=_JWKS_CACHE_LIFESPAN_SECONDS,
                    timeout=_JWKS_TIMEOUT_SECONDS,
                    cooldown_duration=_JWKS_REFRESH_COOLDOWN_SECONDS,
                )
                _jwks_client_url = jwks_url
    return _jwks_client


def decode_supabase_jwt(token: str) -> Dict[str, Any]:
    """Verify a Supabase ES256 access token against the project's cached JWKS."""
    jwks_url = _validated_jwks_url()

    try:
        header = jwt.get_unverified_header(token)
    except (jwt.PyJWTError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
        )

    kid = header.get("kid")
    if header.get("alg") != "ES256" or not isinstance(kid, str) or not kid.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
        )

    try:
        signing_jwk = _get_jwks_client(jwks_url).get_signing_key(kid)
    except PyJWKClientConnectionError:
        logger.error("Supabase JWKS endpoint is unavailable")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is temporarily unavailable.",
        )
    except (PyJWKError, PyJWKSetError):
        logger.error("Supabase JWKS response could not be validated")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is temporarily unavailable.",
        )
    except PyJWKClientError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
        )

    public_key = signing_jwk.key
    if (
        signing_jwk.key_id != kid
        or signing_jwk.key_type != "EC"
        or signing_jwk.algorithm_name != "ES256"
        or signing_jwk.public_key_use not in (None, "sig")
        or not isinstance(public_key, ec.EllipticCurvePublicKey)
        or public_key.curve.name != "secp256r1"
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
        )

    try:
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["ES256"],
            issuer=settings.SUPABASE_JWT_ISSUER,
            audience=settings.SUPABASE_JWT_AUDIENCE,
            options={"require": ["exp", "iat", "iss", "aud", "sub"]},
        )
        if not isinstance(payload.get("sub"), str) or not payload["sub"].strip():
            raise jwt.InvalidTokenError("Invalid subject claim")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again."
        )
    except (jwt.PyJWTError, TypeError, ValueError):
        logger.warning("Rejected invalid Supabase JWT")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials."
        )

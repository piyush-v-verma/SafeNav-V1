from datetime import datetime, timedelta, timezone
import json
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException
from jwt import PyJWKClientConnectionError, PyJWKClientError

from app.core import security
from app.core.config import settings
from app.dependencies import auth


ISSUER = "https://test-project.supabase.co/auth/v1"
JWKS_URL = f"{ISSUER}/.well-known/jwks.json"
AUDIENCE = "authenticated"
KID = "generated-test-key"


class StubJwksClient:
    def __init__(self, jwk=None, error=None):
        self.jwk = jwk
        self.error = error
        self.requested_kids = []

    def get_signing_key(self, kid):
        self.requested_kids.append(kid)
        if self.error:
            raise self.error
        return self.jwk


class SupabaseJWTVerificationTests(unittest.TestCase):
    def setUp(self):
        self.settings_patchers = []
        for name, value in {
            "ENVIRONMENT": "staging",
            "SUPABASE_URL": "https://test-project.supabase.co",
            "SUPABASE_JWKS_URL": JWKS_URL,
            "SUPABASE_JWT_ISSUER": ISSUER,
            "SUPABASE_JWT_AUDIENCE": AUDIENCE,
            "SUPABASE_JWKS_ALLOW_INSECURE_LOCAL": False,
        }.items():
            patcher = patch.object(settings, name, value)
            patcher.start()
            self.settings_patchers.append(patcher)
        security._jwks_client = None
        security._jwks_client_url = None

    def tearDown(self):
        security._jwks_client = None
        security._jwks_client_url = None
        for patcher in reversed(self.settings_patchers):
            patcher.stop()

    @staticmethod
    def make_material(curve=ec.SECP256R1(), kid=KID, use="sig", algorithm="ES256"):
        private_key = ec.generate_private_key(curve)
        jwk_data = json.loads(jwt.algorithms.ECAlgorithm.to_jwk(private_key.public_key()))
        jwk_data.update({"kid": kid, "alg": algorithm, "use": use})
        return private_key, jwt.PyJWK.from_dict(jwk_data)

    @staticmethod
    def make_token(
        private_key,
        kid=KID,
        issuer=ISSUER,
        audience=AUDIENCE,
        subject="citizen-123",
        expires_at=None,
        algorithm="ES256",
    ):
        now = datetime.now(timezone.utc)
        payload = {
            "iss": issuer,
            "aud": audience,
            "iat": int(now.timestamp()),
            "exp": expires_at if expires_at is not None else int((now + timedelta(minutes=5)).timestamp()),
        }
        if subject is not None:
            payload["sub"] = subject
        headers = {"kid": kid} if kid is not None else {}
        key = private_key if algorithm.startswith("ES") else "test-only-hs-key-material-long-enough"
        return jwt.encode(payload, key, algorithm=algorithm, headers=headers)

    def install_client(self, client):
        self.client_patcher = patch.object(security, "PyJWKClient", return_value=client)
        self.client_patcher.start()
        self.addCleanup(self.client_patcher.stop)

    def assert_invalid_token(self, token, status_code=401):
        with self.assertRaises(HTTPException) as caught:
            security.decode_supabase_jwt(token)
        self.assertEqual(caught.exception.status_code, status_code)

    def test_valid_es256_token_uses_kid_and_cached_jwks_client(self):
        private_key, signing_jwk = self.make_material()
        client = StubJwksClient(signing_jwk)
        self.install_client(client)
        token = self.make_token(private_key)

        first = security.decode_supabase_jwt(token)
        second = security.decode_supabase_jwt(token)

        self.assertEqual(first["sub"], "citizen-123")
        self.assertEqual(second["aud"], AUDIENCE)
        self.assertEqual(client.requested_kids, [KID, KID])

    def test_jwks_client_is_cached_and_uses_finite_timeout(self):
        private_key, signing_jwk = self.make_material()
        client = StubJwksClient(signing_jwk)
        arguments = []

        def factory(*args, **kwargs):
            arguments.append((args, kwargs))
            return client

        with patch.object(security, "PyJWKClient", side_effect=factory):
            token = self.make_token(private_key)
            security.decode_supabase_jwt(token)
            security.decode_supabase_jwt(token)

        self.assertEqual(len(arguments), 1)
        self.assertTrue(arguments[0][1]["cache_jwk_set"])
        self.assertEqual(arguments[0][1]["lifespan"], 300)
        self.assertEqual(arguments[0][1]["timeout"], 5)
        self.assertEqual(arguments[0][1]["cooldown_duration"], 30)

    def test_invalid_signature_is_rejected(self):
        private_key, signing_jwk = self.make_material()
        other_key = ec.generate_private_key(ec.SECP256R1())
        self.install_client(StubJwksClient(signing_jwk))
        self.assert_invalid_token(self.make_token(other_key))

    def test_expired_token_is_rejected(self):
        private_key, signing_jwk = self.make_material()
        self.install_client(StubJwksClient(signing_jwk))
        expired = int((datetime.now(timezone.utc) - timedelta(minutes=1)).timestamp())
        with self.assertRaises(HTTPException) as caught:
            security.decode_supabase_jwt(self.make_token(private_key, expires_at=expired))
        self.assertEqual(caught.exception.status_code, 401)
        self.assertIn("expired", caught.exception.detail.lower())

    def test_wrong_issuer_audience_and_missing_subject_are_rejected(self):
        private_key, signing_jwk = self.make_material()
        self.install_client(StubJwksClient(signing_jwk))
        cases = (
            {"issuer": "https://wrong-project.supabase.co/auth/v1"},
            {"audience": "anon"},
            {"subject": None},
        )
        for overrides in cases:
            with self.subTest(overrides=overrides):
                self.assert_invalid_token(self.make_token(private_key, **overrides))

    def test_required_exp_iat_iss_and_aud_claims_cannot_be_omitted(self):
        private_key, signing_jwk = self.make_material()
        self.install_client(StubJwksClient(signing_jwk))
        now = datetime.now(timezone.utc)
        claims = {
            "iss": ISSUER,
            "aud": AUDIENCE,
            "sub": "citizen-123",
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=5)).timestamp()),
        }
        for missing_claim in ("exp", "iat", "iss", "aud"):
            with self.subTest(missing_claim=missing_claim):
                payload = dict(claims)
                payload.pop(missing_claim)
                token = jwt.encode(payload, private_key, algorithm="ES256", headers={"kid": KID})
                self.assert_invalid_token(token)

    def test_missing_kid_is_rejected_before_jwks_lookup(self):
        private_key, signing_jwk = self.make_material()
        client = StubJwksClient(signing_jwk)
        self.install_client(client)
        self.assert_invalid_token(self.make_token(private_key, kid=None))
        self.assertEqual(client.requested_kids, [])

    def test_hs256_is_rejected_without_legacy_fallback(self):
        private_key, signing_jwk = self.make_material()
        client = StubJwksClient(signing_jwk)
        self.install_client(client)
        self.assert_invalid_token(self.make_token(private_key, algorithm="HS256"))
        self.assertEqual(client.requested_kids, [])

    def test_jwks_retrieval_failure_fails_closed(self):
        client = StubJwksClient(error=PyJWKClientConnectionError("mocked offline"))
        self.install_client(client)
        token = self.make_token(ec.generate_private_key(ec.SECP256R1()))
        self.assert_invalid_token(token, status_code=503)

    def test_unknown_kid_is_rejected(self):
        client = StubJwksClient(error=PyJWKClientError("unknown key id"))
        self.install_client(client)
        token = self.make_token(ec.generate_private_key(ec.SECP256R1()))
        self.assert_invalid_token(token)

    def test_non_p256_wrong_use_and_mismatched_kid_keys_are_rejected(self):
        private_key, _ = self.make_material()
        public_key = ec.generate_private_key(ec.SECP256R1()).public_key()
        wrong_curve = ec.generate_private_key(ec.SECP384R1()).public_key()
        invalid_keys = (
            SimpleNamespace(key=public_key, key_id=KID, key_type="RSA", algorithm_name="ES256", public_key_use="sig"),
            SimpleNamespace(key=wrong_curve, key_id=KID, key_type="EC", algorithm_name="ES256", public_key_use="sig"),
            SimpleNamespace(key=public_key, key_id=KID, key_type="EC", algorithm_name="ES256", public_key_use="enc"),
            SimpleNamespace(key=public_key, key_id="different-kid", key_type="EC", algorithm_name="ES256", public_key_use="sig"),
        )
        for jwk in invalid_keys:
            with self.subTest(jwk=jwk):
                security._jwks_client = None
                security._jwks_client_url = None
                self.install_client(StubJwksClient(jwk))
                self.assert_invalid_token(self.make_token(private_key))

    def test_invalid_remote_http_and_mismatched_project_urls_fail_before_fetch(self):
        private_key, _ = self.make_material()
        invalid_configs = (
            {"SUPABASE_JWKS_URL": "http://remote.example/auth/v1/.well-known/jwks.json"},
            {"SUPABASE_JWKS_URL": "https://other-project.supabase.co/auth/v1/.well-known/jwks.json"},
            {
                "ENVIRONMENT": "production",
                "SUPABASE_JWKS_ALLOW_INSECURE_LOCAL": True,
                "SUPABASE_URL": "http://127.0.0.1:54321",
                "SUPABASE_JWKS_URL": "http://127.0.0.1:54321/auth/v1/.well-known/jwks.json",
                "SUPABASE_JWT_ISSUER": "http://127.0.0.1:54321/auth/v1",
            },
        )
        for updates in invalid_configs:
            with self.subTest(updates=updates):
                for name, value in updates.items():
                    patcher = patch.object(settings, name, value)
                    patcher.start()
                    self.addCleanup(patcher.stop)
                with patch.object(security, "PyJWKClient") as factory:
                    self.assert_invalid_token(self.make_token(private_key), status_code=500)
                    factory.assert_not_called()

    def test_loopback_http_requires_explicit_local_development_allowance(self):
        private_key, signing_jwk = self.make_material()
        local_url = "http://127.0.0.1:54321"
        updates = {
            "ENVIRONMENT": "development",
            "SUPABASE_URL": local_url,
            "SUPABASE_JWKS_URL": f"{local_url}/auth/v1/.well-known/jwks.json",
            "SUPABASE_JWT_ISSUER": f"{local_url}/auth/v1",
            "SUPABASE_JWKS_ALLOW_INSECURE_LOCAL": True,
        }
        for name, value in updates.items():
            patcher = patch.object(settings, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)
        self.install_client(StubJwksClient(signing_jwk))
        self.assertEqual(
            security.decode_supabase_jwt(
                self.make_token(private_key, issuer=f"{local_url}/auth/v1")
            )["sub"],
            "citizen-123",
        )


class ProfileAuthenticationDependencyTests(unittest.IsolatedAsyncioTestCase):
    class Query:
        def __init__(self, data=None, error=None):
            self.data = data
            self.error = error

        def select(self, _columns):
            return self

        def eq(self, _column, _value):
            return self

        def single(self):
            return self

        def execute(self):
            if self.error:
                raise self.error
            return SimpleNamespace(data=self.data)

    class Client:
        def __init__(self, query):
            self.query = query

        def table(self, _name):
            return self.query

    async def call_get_current_user(self, client, payload=None):
        with patch.object(auth, "decode_supabase_jwt", return_value=payload or {"sub": "citizen-123"}), \
             patch.object(auth, "get_supabase_client", return_value=client):
            return await auth.get_current_user(SimpleNamespace(credentials="test-token"))

    async def test_missing_supabase_client_fails_closed(self):
        for environment in ("development", "staging", "production"):
            with self.subTest(environment=environment), patch.object(settings, "ENVIRONMENT", environment), \
                 patch.object(auth, "decode_supabase_jwt", return_value={
                     "sub": "citizen-123", "user_metadata": {"role": "admin", "account_status": "active"},
                 }), patch.object(auth, "get_supabase_client", return_value=None):
                with self.assertRaises(HTTPException) as caught:
                    await auth.get_current_user(SimpleNamespace(credentials="test-token"))
                self.assertEqual(caught.exception.status_code, 503)

    async def test_missing_profile_returns_404(self):
        with self.assertRaises(HTTPException) as caught:
            await self.call_get_current_user(self.Client(self.Query()))
        self.assertEqual(caught.exception.status_code, 404)

    async def test_database_failure_returns_503(self):
        with self.assertRaises(HTTPException) as caught:
            await self.call_get_current_user(self.Client(self.Query(error=RuntimeError("offline"))))
        self.assertEqual(caught.exception.status_code, 503)

    async def test_intentional_profile_http_exception_is_preserved(self):
        expected = HTTPException(status_code=404, detail="Profile missing")
        with self.assertRaises(HTTPException) as caught:
            await self.call_get_current_user(self.Client(self.Query(error=expected)))
        self.assertIs(caught.exception, expected)

    async def test_postgrest_missing_row_error_maps_to_404(self):
        error = RuntimeError("no row")
        error.code = "PGRST116"
        with self.assertRaises(HTTPException) as caught:
            await self.call_get_current_user(self.Client(self.Query(error=error)))
        self.assertEqual(caught.exception.status_code, 404)

    async def test_role_and_status_come_from_profile_not_jwt_metadata(self):
        database_profile = {"id": "citizen-123", "role": "user", "account_status": "active"}
        profile = await self.call_get_current_user(
            self.Client(self.Query(database_profile)),
            {"sub": "citizen-123", "user_metadata": {"role": "admin", "account_status": "suspended"}},
        )
        self.assertEqual(profile["role"], "user")
        self.assertEqual(profile["account_status"], "active")

    async def test_suspended_or_missing_status_is_not_active(self):
        for profile in ({"role": "user", "account_status": "suspended"}, {"role": "user"}):
            with self.subTest(profile=profile), self.assertRaises(HTTPException) as caught:
                await auth.require_active_user(profile)
            self.assertEqual(caught.exception.status_code, 403)

    async def test_non_admin_cannot_use_admin_dependency(self):
        with self.assertRaises(HTTPException) as caught:
            await auth.require_admin({"role": "user", "account_status": "active"})
        self.assertEqual(caught.exception.status_code, 403)

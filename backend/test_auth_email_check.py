import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient
from postgrest.exceptions import APIError

BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from app.api.v1 import auth as auth_api  # noqa: E402
from app.db import supabase as supabase_db  # noqa: E402
from app.main import app  # noqa: E402


class FakeRpc:
    def __init__(self, data=None, error=None):
        self.data = data
        self.error = error

    def execute(self):
        if self.error:
            raise self.error
        return SimpleNamespace(data=self.data)


class FakeSupabase:
    def __init__(self, data=None, error=None):
        self.data = data
        self.error = error
        self.calls = []

    def rpc(self, function_name, params):
        self.calls.append((function_name, params))
        return FakeRpc(self.data, self.error)


class AuthEmailCheckTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        with auth_api._email_check_attempts_lock:
            auth_api._email_check_attempts.clear()
        self.client_factory = patch(
            "app.api.v1.auth.get_auth_email_lookup_client",
            return_value=FakeSupabase(data=True),
        )
        self.mock_client_factory = self.client_factory.start()
        self.addCleanup(self.client_factory.stop)

    def tearDown(self):
        with auth_api._email_check_attempts_lock:
            auth_api._email_check_attempts.clear()

    def test_registered_response_contains_no_auth_records_or_credentials(self):
        supabase = FakeSupabase(data=True)
        self.mock_client_factory.return_value = supabase

        response = self.client.post(
            "/api/v1/auth/check-email",
            json={"email": "  User@Example.com  "},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"success": True, "registered": True})
        self.assertEqual(
            supabase.calls,
            [("safenav_auth_email_exists", {"p_email": "user@example.com"})],
        )

    def test_unregistered_email_returns_false(self):
        self.mock_client_factory.return_value = FakeSupabase(data=False)

        response = self.client.post(
            "/api/v1/auth/check-email",
            json={"email": "unknown@example.com"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"success": True, "registered": False})

    def test_invalid_empty_missing_and_non_string_email_return_standard_422(self):
        supabase = self.mock_client_factory.return_value
        invalid_bodies = [
            {"email": ""},
            {"email": "not-an-email"},
            {"email": 12},
            {},
        ]
        for body in invalid_bodies:
            with self.subTest(body=body):
                response = self.client.post("/api/v1/auth/check-email", json=body)
                self.assertEqual(response.status_code, 422)
                self.assertEqual(response.json()["error"]["code"], "VALIDATION_ERROR")
        self.assertEqual(supabase.calls, [])

    def test_missing_supabase_client_fails_closed(self):
        self.mock_client_factory.return_value = None

        response = self.client.post(
            "/api/v1/auth/check-email",
            json={"email": "user@example.com"},
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"]["code"], "AUTH_SERVICE_UNAVAILABLE")

    def test_database_rpc_failure_is_not_unregistered(self):
        self.mock_client_factory.return_value = FakeSupabase(
            error=APIError({"code": "PGRST000", "message": "database failure"})
        )

        response = self.client.post(
            "/api/v1/auth/check-email",
            json={"email": "user@example.com"},
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"]["code"], "DATABASE_ERROR")
        self.assertNotIn("registered", response.json())

    def test_network_failure_is_auth_service_unavailable(self):
        self.mock_client_factory.return_value = FakeSupabase(
            error=httpx.ConnectError("simulated")
        )

        response = self.client.post(
            "/api/v1/auth/check-email",
            json={"email": "user@example.com"},
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"]["code"], "AUTH_SERVICE_UNAVAILABLE")

    def test_unexpected_failure_is_sanitized(self):
        self.mock_client_factory.return_value = FakeSupabase(error=RuntimeError("private details"))

        response = self.client.post(
            "/api/v1/auth/check-email",
            json={"email": "user@example.com"},
        )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["error"]["code"], "INTERNAL_SERVER_ERROR")
        self.assertNotIn("private details", response.text)

    def test_rate_limit_returns_429_and_retry_after(self):
        with patch.object(auth_api, "_EMAIL_CHECK_LIMIT", 2):
            for _ in range(2):
                allowed = self.client.post(
                    "/api/v1/auth/check-email",
                    json={"email": "user@example.com"},
                    headers={"X-Forwarded-For": "198.51.100.1"},
                )
                self.assertEqual(allowed.status_code, 200)

            limited = self.client.post(
                "/api/v1/auth/check-email",
                json={"email": "user@example.com"},
                headers={"X-Forwarded-For": "203.0.113.20"},
            )

        self.assertEqual(limited.status_code, 429)
        self.assertEqual(limited.json()["error"]["code"], "RATE_LIMIT_EXCEEDED")
        self.assertIn("Retry-After", limited.headers)
        self.assertEqual(len(self.mock_client_factory.return_value.calls), 2)

    def test_lookup_client_uses_short_timeout_and_does_not_persist_auth_sessions(self):
        with (
            patch.object(supabase_db, "_auth_email_lookup_client", None),
            patch.object(supabase_db.settings, "SUPABASE_URL", "https://test-project.supabase.co"),
            patch.object(supabase_db.settings, "SUPABASE_KEY", "test-only-server-key"),
            patch.object(supabase_db, "create_client", return_value=object()) as create_client,
        ):
            client = supabase_db.get_auth_email_lookup_client()

        self.assertIsNotNone(client)
        options = create_client.call_args.kwargs["options"]
        self.assertEqual(options.postgrest_client_timeout, 5)
        self.assertFalse(options.persist_session)
        self.assertFalse(options.auto_refresh_token)

    def test_rpc_response_type_must_be_boolean(self):
        self.mock_client_factory.return_value = FakeSupabase(data={"registered": True})

        response = self.client.post(
            "/api/v1/auth/check-email",
            json={"email": "user@example.com"},
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"]["code"], "DATABASE_ERROR")

    def test_rpc_privileges_are_restricted_to_service_role(self):
        migration = (
            BACKEND_DIR.parent
            / "supabase"
            / "migrations"
            / "202611210001_auth_email_lookup.sql"
        ).read_text(encoding="utf-8")

        self.assertIn("FROM PUBLIC", migration)
        self.assertIn("FROM anon, authenticated", migration)
        self.assertIn("TO service_role", migration)
        self.assertIn("SET search_path = pg_catalog, pg_temp", migration)
        self.assertIn("FROM auth.users", migration)
        self.assertNotIn("FROM public.profiles", migration)

    def test_openapi_documents_post_contract_and_error_statuses(self):
        schema = app.openapi()
        operation = schema["paths"]["/api/v1/auth/check-email"]["post"]
        self.assertIn("requestBody", operation)
        request_schema = schema["components"]["schemas"]["EmailRegistrationCheckRequest"]
        self.assertEqual(request_schema["properties"]["email"]["format"], "email")
        for code in ("200", "422", "429", "500", "503"):
            self.assertIn(code, operation["responses"])


if __name__ == "__main__":
    unittest.main()

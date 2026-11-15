#!/usr/bin/env python3
"""
SafeNav V1: Administrator Provisioning Tool
-------------------------------------------
Promotes a registered user to the 'admin' role or creates a new administrator
account using the Supabase Service-Role key.

Supports recovery from partial provisioning failures without creating duplicate
Auth identities.

Usage:
    python backend/scripts/provision_admin.py --email admin@safenav.in
    python backend/scripts/provision_admin.py --email admin@safenav.in --name "SafeNav Lead Administrator"
"""

import argparse
import sys
from pathlib import Path

# Safe standard output encoding on Windows console
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.app.core.config import settings
from supabase import create_client


def main():
    parser = argparse.ArgumentParser(description="Provision a SafeNav Administrator")
    parser.add_argument("--email", required=True, help="Administrator email address")
    parser.add_argument("--create", action="store_true", help="Create Auth user if they do not exist")
    parser.add_argument("--password", help="Password (used only if a new Auth user must be created)")
    parser.add_argument("--name", default="SafeNav Lead Administrator", help="Administrator display name")

    args = parser.parse_args()

    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        print("\n[ERROR] SUPABASE_URL and SUPABASE_KEY (service-role key) must be set in backend/.env")
        print("Please configure backend/.env before running this script.\n")
        sys.exit(1)

    print(f"\n[SafeNav] Admin Provisioning: {args.email}")
    print("=" * 60)

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

    try:
        # 1. Search for existing Auth identity
        users_resp = supabase.auth.admin.list_users()
        target_user = None
        for u in users_resp:
            if u.email.lower() == args.email.lower():
                target_user = u
                break

        if target_user:
            user_id = target_user.id
            print(f"[INFO] Existing Supabase Auth identity detected:")
            print(f"       Email:   {target_user.email}")
            print(f"       User ID: {user_id}")
            print("       Reusing existing identity (no duplicate Auth account will be created).")
        else:
            if not args.create:
                print(f"[ERROR] User with email '{args.email}' not found in Supabase Auth.")
                print("Tip: If creating a brand new identity, include --create --password <password>.\n")
                sys.exit(1)

            if not args.password:
                print("[ERROR] --password is required when creating a new Auth identity.\n")
                sys.exit(1)

            print(f"Creating new Supabase Auth user for {args.email} ...")
            create_resp = supabase.auth.admin.create_user({
                "email": args.email,
                "password": args.password,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": args.name,
                    "role": "admin"
                }
            })
            target_user = create_resp.user
            user_id = target_user.id
            print(f"[OK] Supabase Auth user created (UUID: {user_id})")

        # 2. Check if public.profiles exists and update/insert
        print("\nChecking public.profiles table...")
        profile_data = {
            "id": user_id,
            "full_name": args.name,
            "role": "admin",
            "account_status": "active",
        }

        # Use upsert to handle both new and existing profile records safely
        upsert_resp = supabase.table("profiles").upsert(profile_data).execute()

        # 3. Verify resulting profile record in the database
        verification = supabase.table("profiles").select("id, full_name, role, account_status, created_at, updated_at").eq("id", user_id).single().execute()

        verified_data = verification.data
        if not verified_data or verified_data.get("role") != "admin":
            print("[FAILED] Verification failed: Profile record was not successfully saved with role 'admin'.")
            sys.exit(1)

        print("[OK] Database profile verified successfully:")
        print(f"     UUID:           {verified_data.get('id')}")
        print(f"     Full Name:      {verified_data.get('full_name')}")
        print(f"     Role:           {verified_data.get('role')}")
        print(f"     Account Status: {verified_data.get('account_status')}")
        print(f"     Updated At:     {verified_data.get('updated_at')}")

        print("\n[SUCCESS] Administrator provisioned successfully.")
        print(f"Admin Email: {args.email}")
        print("You can now sign in at the Desktop Admin Console (http://localhost:5174).\n")

    except Exception as e:
        err_str = str(e)
        if "PGRST205" in err_str or "public.profiles" in err_str:
            print("\n[DATABASE NOTICE] 'public.profiles' table does not exist in your Supabase database yet.")
            print("Action Required: Please copy and run the SQL migration in your Supabase SQL Editor:")
            print("File: supabase/migrations/20261115_001_create_profiles.sql\n")
        else:
            print(f"\n[ERROR] Provisioning failed: {e}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()

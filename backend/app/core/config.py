import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Base directory for backend
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load .env file
load_dotenv(BASE_DIR / ".env")

class Settings:
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))

    # CORS
    _cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174")
    CORS_ORIGINS: List[str] = [origin.strip() for origin in _cors_raw.split(",") if origin.strip()]

    # Supabase configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    _supabase_base_url: str = SUPABASE_URL.rstrip("/")
    SUPABASE_JWKS_URL: str = (
        os.getenv("SUPABASE_JWKS_URL", "").strip()
        or f"{_supabase_base_url}/auth/v1/.well-known/jwks.json"
    )
    SUPABASE_JWT_ISSUER: str = (
        os.getenv("SUPABASE_JWT_ISSUER", "").strip()
        or f"{_supabase_base_url}/auth/v1"
    )
    SUPABASE_JWT_AUDIENCE: str = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated").strip() or "authenticated"
    SUPABASE_JWKS_ALLOW_INSECURE_LOCAL: bool = (
        os.getenv("SUPABASE_JWKS_ALLOW_INSECURE_LOCAL", "false").strip().lower()
        in ("1", "true", "yes")
    )

    # Paths
    GRAPH_FILEPATH: Path = BASE_DIR / "data" / "processed" / "nagpur_roads.graphml"
    BOUNDARY_FILEPATH: Path = BASE_DIR / "data" / "raw" / "nagpur_boundary.geojson"

settings = Settings()

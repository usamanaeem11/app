"""
Database client - supports both Supabase and standalone PostgreSQL
Auto-detects which database to use based on environment variables
"""
import os
from typing import Optional, Union
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# Database type detection
DATABASE_URL = os.environ.get('DATABASE_URL')
SUPABASE_URL = os.environ.get('VITE_SUPABASE_URL')
USE_STANDALONE_POSTGRES = DATABASE_URL and not SUPABASE_URL

if USE_STANDALONE_POSTGRES:
    # Use standalone PostgreSQL
    from utils.postgres_adapter import PostgresDatabase
    _db_instance: Optional[PostgresDatabase] = None

    def get_db() -> PostgresDatabase:
        global _db_instance
        if _db_instance is None:
            if not DATABASE_URL:
                raise ValueError("DATABASE_URL not found in environment variables")
            _db_instance = PostgresDatabase(DATABASE_URL)
        return _db_instance
else:
    # Use Supabase
    from supabase import create_client, Client

    class SupabaseDB:
        _instance: Optional[Client] = None

        @classmethod
        def get_client(cls) -> Client:
            if cls._instance is None:
                supabase_url = os.environ.get('VITE_SUPABASE_URL')
                supabase_key = os.environ.get('VITE_SUPABASE_SUPABASE_ANON_KEY')

                if not supabase_url or not supabase_key:
                    raise ValueError("Supabase credentials not found in environment variables")

                cls._instance = create_client(supabase_url, supabase_key)

            return cls._instance

    def get_db() -> Client:
        return SupabaseDB.get_client()

"""
Database client for Supabase
Handles all database operations using Supabase PostgreSQL
"""
from supabase import create_client, Client
import os
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

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

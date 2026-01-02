"""
PostgreSQL Database Adapter
Independent database connection for standalone PostgreSQL
"""
import os
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from psycopg2.extras import RealDictCursor
from typing import Optional, Dict, List, Any
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)


class PostgresDatabase:
    """Standalone PostgreSQL database adapter"""

    def __init__(self, database_url: str):
        """Initialize connection pool"""
        self.database_url = database_url
        self.pool = SimpleConnectionPool(
            minconn=1,
            maxconn=20,
            dsn=database_url
        )
        logger.info("PostgreSQL connection pool initialized")

    @contextmanager
    def get_connection(self):
        """Get a connection from the pool"""
        conn = self.pool.getconn()
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            self.pool.putconn(conn)

    def execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Execute a SELECT query and return results"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params)
                return [dict(row) for row in cursor.fetchall()]

    def execute_single(self, query: str, params: tuple = None) -> Optional[Dict[str, Any]]:
        """Execute a query and return single result"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params)
                result = cursor.fetchone()
                return dict(result) if result else None

    def execute_update(self, query: str, params: tuple = None) -> int:
        """Execute INSERT/UPDATE/DELETE and return affected rows"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                return cursor.rowcount

    # User operations
    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email"""
        query = "SELECT * FROM users WHERE email = %s"
        return self.execute_single(query, (email,))

    async def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by ID"""
        query = "SELECT * FROM users WHERE user_id = %s"
        return self.execute_single(query, (user_id,))

    async def create_user(self, user_data: Dict) -> Dict:
        """Create new user"""
        query = """
            INSERT INTO users (user_id, email, password_hash, name, role, company_id, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            RETURNING *
        """
        params = (
            user_data['user_id'],
            user_data['email'],
            user_data['password_hash'],
            user_data.get('name', ''),
            user_data.get('role', 'employee'),
            user_data.get('company_id')
        )
        return self.execute_single(query, params)

    async def update_user(self, user_id: str, updates: Dict) -> Dict:
        """Update user"""
        set_clause = ", ".join([f"{k} = %s" for k in updates.keys()])
        query = f"UPDATE users SET {set_clause}, updated_at = NOW() WHERE user_id = %s RETURNING *"
        params = tuple(updates.values()) + (user_id,)
        return self.execute_single(query, params)

    # Company operations
    async def get_company(self, company_id: str) -> Optional[Dict]:
        """Get company by ID"""
        query = "SELECT * FROM companies WHERE company_id = %s"
        return self.execute_single(query, (company_id,))

    async def create_company(self, company_data: Dict) -> Dict:
        """Create new company"""
        query = """
            INSERT INTO companies (company_id, name, email, created_at)
            VALUES (%s, %s, %s, NOW())
            RETURNING *
        """
        params = (
            company_data['company_id'],
            company_data['name'],
            company_data.get('email', '')
        )
        return self.execute_single(query, params)

    # Time entry operations
    async def create_time_entry(self, entry_data: Dict) -> Dict:
        """Create time entry"""
        query = """
            INSERT INTO time_entries (
                entry_id, user_id, company_id, start_time, end_time,
                source, notes, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING *
        """
        params = (
            entry_data['entry_id'],
            entry_data['user_id'],
            entry_data.get('company_id'),
            entry_data['start_time'],
            entry_data.get('end_time'),
            entry_data.get('source', 'manual'),
            entry_data.get('notes', '')
        )
        return self.execute_single(query, params)

    async def get_active_time_entry(self, user_id: str) -> Optional[Dict]:
        """Get active time entry for user"""
        query = """
            SELECT * FROM time_entries
            WHERE user_id = %s AND end_time IS NULL
            ORDER BY start_time DESC LIMIT 1
        """
        return self.execute_single(query, (user_id,))

    async def update_time_entry(self, entry_id: str, updates: Dict) -> Dict:
        """Update time entry"""
        set_clause = ", ".join([f"{k} = %s" for k in updates.keys()])
        query = f"UPDATE time_entries SET {set_clause}, updated_at = NOW() WHERE entry_id = %s RETURNING *"
        params = tuple(updates.values()) + (entry_id,)
        return self.execute_single(query, params)

    async def get_time_entries(self, user_id: str, start_date: str, end_date: str) -> List[Dict]:
        """Get time entries for date range"""
        query = """
            SELECT * FROM time_entries
            WHERE user_id = %s AND start_time >= %s AND start_time <= %s
            ORDER BY start_time DESC
        """
        return self.execute_query(query, (user_id, start_date, end_date))

    # Screenshot operations
    async def create_screenshot(self, screenshot_data: Dict) -> Dict:
        """Create screenshot record"""
        query = """
            INSERT INTO screenshots (
                screenshot_id, user_id, entry_id, file_path,
                captured_at, app_name, window_title, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING *
        """
        params = (
            screenshot_data['screenshot_id'],
            screenshot_data['user_id'],
            screenshot_data.get('entry_id'),
            screenshot_data['file_path'],
            screenshot_data['captured_at'],
            screenshot_data.get('app_name', ''),
            screenshot_data.get('window_title', '')
        )
        return self.execute_single(query, params)

    async def get_screenshots(self, user_id: str, date: str) -> List[Dict]:
        """Get screenshots for user and date"""
        query = """
            SELECT * FROM screenshots
            WHERE user_id = %s AND DATE(captured_at) = %s
            ORDER BY captured_at DESC
        """
        return self.execute_query(query, (user_id, date))

    # Subscription operations
    async def get_subscription(self, company_id: str) -> Optional[Dict]:
        """Get company subscription"""
        query = """
            SELECT * FROM subscriptions
            WHERE company_id = %s AND status = 'active'
            ORDER BY created_at DESC LIMIT 1
        """
        return self.execute_single(query, (company_id,))

    async def create_subscription(self, sub_data: Dict) -> Dict:
        """Create subscription"""
        query = """
            INSERT INTO subscriptions (
                subscription_id, company_id, plan_type, status,
                start_date, end_date, amount, user_count, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING *
        """
        params = (
            sub_data['subscription_id'],
            sub_data['company_id'],
            sub_data['plan_type'],
            sub_data.get('status', 'active'),
            sub_data['start_date'],
            sub_data['end_date'],
            sub_data['amount'],
            sub_data['user_count']
        )
        return self.execute_single(query, params)

    def close(self):
        """Close all connections"""
        if self.pool:
            self.pool.closeall()
            logger.info("PostgreSQL connection pool closed")

# DATABASE MIGRATION REPORT
**Project**: WorkMonitor - Database Independence Migration
**Date**: 2026-01-02
**Phase**: 2 of 9 - Self-Hosting Migration

---

## EXECUTIVE SUMMARY

This report documents the complete strategy for migrating from Supabase (managed PostgreSQL) to a self-hosted PostgreSQL instance while preserving 100% of functionality, security, and data integrity.

**Current Database State**:
- **61 tables** (all production-ready)
- **259 indexes** (optimized for performance)
- **141 RLS policies** (comprehensive security)
- **1 function** (`check_auto_tracking_consent`)
- **18 migrations** (fully documented history)
- **100% RLS coverage** (every table is secured)

**Migration Status**: ✅ **READY FOR MIGRATION**

---

## 1. CURRENT ARCHITECTURE ANALYSIS

### 1.1 Database Summary

| Metric | Value | Status |
|--------|-------|--------|
| **Total Tables** | 61 | ✅ Complete |
| **Total Indexes** | 259 | ✅ Optimized |
| **RLS Policies** | 141 | ✅ Comprehensive |
| **Functions** | 1 | ✅ Minimal |
| **Migrations** | 18 | ✅ Well-documented |
| **RLS Coverage** | 100% | ✅ Fully secured |
| **Foreign Keys** | ~150+ | ✅ Referential integrity |
| **Database Size** | ~2.5 MB | ✅ Fresh installation |

### 1.2 Table Inventory (61 Tables)

#### Core User & Company Management (4 tables)
- `users` - User accounts (12 columns, 5 indexes, 1 policy)
- `companies` - Company/organization data (6 columns, 1 index, 1 policy)
- `manager_assignments` - Manager-employee relationships (9 columns, 6 indexes, 1 policy)
- `subscriptions` - Stripe subscriptions (16 columns, 2 indexes, 1 policy)

#### Time Tracking & Productivity (8 tables)
- `time_entries` - Work time records (13 columns, 5 indexes, 1 policy)
- `timesheets` - Timesheet summaries (13 columns, 4 indexes, 1 policy)
- `scheduled_timers` - Auto-start/stop timers (18 columns, 7 indexes, 1 policy)
- `timer_execution_log` - Timer execution history (9 columns, 5 indexes, 1 policy)
- `activity_logs` - Activity tracking (8 columns, 4 indexes, 1 policy)
- `activity_history` - Historical activity (8 columns, 4 indexes, 4 policies)
- `idle_periods` - Idle time tracking (11 columns, 4 indexes, 2 policies)
- `breaks` - Break time records (11 columns, 3 indexes, 2 policies)

#### Project & Task Management (4 tables)
- `projects` - Project definitions (11 columns, 2 indexes, 1 policy)
- `project_assignments` - Employee-project mapping (11 columns, 6 indexes, 5 policies)
- `tasks` - Task management (12 columns, 4 indexes, 1 policy)
- `employee_assignment_requests` - Assignment requests (10 columns, 5 indexes, 1 policy)

#### Attendance & Scheduling (4 tables)
- `attendance` - Attendance records (10 columns, 4 indexes, 1 policy)
- `shifts` - Shift definitions (8 columns, 2 indexes, 1 policy)
- `shift_assignments` - Employee shifts (8 columns, 4 indexes, 1 policy)
- `leave_requests` - Leave/vacation requests (12 columns, 4 indexes, 1 policy)

#### Monitoring & Screenshots (4 tables)
- `screenshots` - Screenshot metadata (10 columns, 5 indexes, 1 policy)
- `screen_recordings` - Recording metadata (10 columns, 4 indexes, 4 policies)
- `app_usage` - Application usage tracking (11 columns, 3 indexes, 2 policies)
- `website_usage` - Website usage tracking (12 columns, 3 indexes, 2 policies)

#### Productivity Analytics (5 tables)
- `productivity_scores` - Productivity metrics (20 columns, 4 indexes, 2 policies)
- `focus_time` - Deep work tracking (12 columns, 3 indexes, 2 policies)
- `burnout_indicators` - Burnout risk analysis (16 columns, 5 indexes, 2 policies)
- `meeting_insights` - Meeting analytics (17 columns, 3 indexes, 2 policies)
- `app_categories` - App categorization (9 columns, 3 indexes, 2 policies)
- `website_categories` - Website categorization (9 columns, 3 indexes, 2 policies)

#### GPS & Location Tracking (4 tables)
- `gps_locations` - GPS coordinates (15 columns, 3 indexes, 2 policies)
- `geofences` - Geofence definitions (13 columns, 3 indexes, 2 policies)
- `field_sites` - Field site locations (13 columns, 2 indexes, 2 policies)
- `routes` - Travel routes (13 columns, 3 indexes, 2 policies)

#### Financial Management (11 tables)
- `employee_wages` - Wage configurations (15 columns, 5 indexes, 4 policies)
- `wage_change_requests` - Wage change requests (21 columns, 5 indexes, 4 policies)
- `expense_calculations` - Expense tracking (15 columns, 4 indexes, 3 policies)
- `manager_expense_access` - Manager expense permissions (7 columns, 5 indexes, 4 policies)
- `payroll` - Payroll records (12 columns, 3 indexes, 1 policy)
- `invoices` - Invoice generation (15 columns, 3 indexes, 1 policy)
- `payouts` - Payout management (31 columns, 12 indexes, 4 policies)
- `payout_approvals` - Multi-level approvals (10 columns, 3 indexes, 2 policies)
- `escrow_accounts` - Escrow system (29 columns, 12 indexes, 4 policies)
- `recurring_payment_schedules` - Recurring payments (25 columns, 11 indexes, 2 policies)
- `payment_disputes` - Dispute resolution (20 columns, 9 indexes, 4 policies)
- `bank_accounts` - Bank account management (20 columns, 3 indexes, 5 policies)

#### Employment & Agreements (3 tables)
- `work_agreements` - Employment contracts (29 columns, 5 indexes, 1 policy)
- `work_submissions` - Work deliverables (17 columns, 6 indexes, 6 policies)
- `agreement_clauses` - Contract clauses (8 columns, 2 indexes, 1 policy)
- `consent_audit_log` - Consent tracking (9 columns, 5 indexes, 1 policy)

#### Security & Compliance (6 tables)
- `audit_logs` - Audit trail (13 columns, 4 indexes, 2 policies)
- `security_alerts` - Security incidents (14 columns, 6 indexes, 2 policies)
- `dlp_incidents` - Data loss prevention (13 columns, 3 indexes, 2 policies)
- `usb_events` - USB device tracking (11 columns, 3 indexes, 2 policies)
- `blocked_apps` - App blocking rules (8 columns, 3 indexes, 2 policies)
- `blocked_websites` - Website blocking rules (8 columns, 3 indexes, 2 policies)

#### Communication & Collaboration (3 tables)
- `chat_channels` - Team chat channels (8 columns, 3 indexes, 1 policy)
- `chat_messages` - Chat messages (8 columns, 5 indexes, 1 policy)
- `notifications` - User notifications (12 columns, 3 indexes, 3 policies)

#### Integrations (2 tables)
- `integrations` - Third-party integrations (12 columns, 3 indexes, 2 policies)
- `integration_sync_logs` - Integration sync history (9 columns, 2 indexes, 1 policy)

### 1.3 RLS Policy Analysis (141 Policies)

**Policy Distribution**:
- **User-scoped policies** (~40%): Users can only access their own data
- **Company-scoped policies** (~30%): Admins can access all company data
- **Manager-scoped policies** (~15%): Managers access assigned employees' data
- **System policies** (~10%): System-level operations (inserts, logging)
- **Multi-party policies** (~5%): Access based on multiple conditions

**Policy Patterns**:
1. **Self-access pattern** (most common):
   ```sql
   USING (user_id = auth.uid())
   ```

2. **Admin pattern** (second most common):
   ```sql
   USING (company_id IN (
     SELECT company_id FROM users
     WHERE user_id = auth.uid() AND role = 'admin'
   ))
   ```

3. **Manager pattern**:
   ```sql
   USING (employee_id IN (
     SELECT employee_id FROM manager_assignments
     WHERE manager_id = auth.uid() AND active = true
   ))
   ```

4. **System insert pattern**:
   ```sql
   FOR INSERT WITH CHECK (true)
   ```

**Security Level**: ✅ **EXCELLENT**
- All tables have RLS enabled
- No tables with overly permissive `USING (true)` for SELECT
- Proper separation of concerns (admins vs users vs managers)
- Multi-level approval systems in place

### 1.4 Migration Files Inventory (18 Migrations)

| # | Migration File | Description | Tables Added | Policies Added |
|---|---------------|-------------|--------------|----------------|
| 1 | `20260101233641_create_working_tracker_schema_v2.sql` | Core schema | 23 | ~30 |
| 2 | `20260101235219_add_employee_assignments_and_agreements.sql` | Employment system | 3 | ~8 |
| 3 | `20260102000427_add_employment_types_and_consent.sql` | Consent tracking | 1 | ~2 |
| 4 | `20260102002407_add_screen_recording_and_work_submissions_v2.sql` | Recording & submissions | 2 | ~10 |
| 5 | `20260102004022_add_expenses_and_wage_management.sql` | Financial tracking | 4 | ~15 |
| 6 | `20260102005207_add_payout_and_escrow_system.sql` | Payment system | 5 | ~16 |
| 7 | `20260102012051_add_gps_and_location_tracking.sql` | GPS tracking | 4 | ~8 |
| 8 | `20260102012124_add_app_website_monitoring.sql` | App/website monitoring | 6 | ~12 |
| 9 | `20260102012141_add_idle_break_tracking.sql` | Idle/break tracking | 2 | ~4 |
| 10 | `20260102012200_add_integration_framework.sql` | Third-party integrations | 2 | ~3 |
| 11 | `20260102012227_add_security_compliance.sql` | Security features | 4 | ~8 |
| 12 | `20260102012256_add_productivity_analytics.sql` | Analytics tables | 5 | ~10 |
| 13 | `20260102090649_add_missing_foreign_key_indexes.sql` | Performance optimization | 0 | 0 |
| 14 | `20260102091236_fix_rls_performance_simple.sql` | RLS optimization | 0 | 0 |
| 15 | `20260102091645_fix_remaining_warnings_v2.sql` | Warning fixes | 0 | 0 |
| 16 | `20260102092004_fix_rls_optimization_final.sql` | Final RLS tuning | 0 | 0 |
| 17 | `20260102092125_fix_rls_subquery_pattern.sql` | Subquery optimization | 0 | 0 |
| 18 | `20260102133909_fix_function_search_path_security.sql` | Function security fix | 0 | 0 |

**Migration Quality**: ✅ **EXCELLENT**
- All migrations have detailed comments
- Migrations are idempotent (use `IF NOT EXISTS`)
- Clear separation of concerns
- Performance optimizations included
- Security fixes applied

---

## 2. SELF-HOSTED MIGRATION STRATEGY

### 2.1 Target Architecture

```
┌─────────────────────────────────────────────────────┐
│                   VPS (Ubuntu 22.04)                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │         Docker Compose Stack                 │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────────┐ │  │
│  │  │    PostgreSQL 15+                      │ │  │
│  │  │    - Port: 5432 (internal)             │ │  │
│  │  │    - Volume: /var/lib/postgresql/data  │ │  │
│  │  │    - RLS enabled                       │ │  │
│  │  │    - All 18 migrations applied         │ │  │
│  │  └────────────────────────────────────────┘ │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────────┐ │  │
│  │  │    FastAPI Backend                     │ │  │
│  │  │    - Port: 8001                        │ │  │
│  │  │    - Database: PostgreSQL driver       │ │  │
│  │  │    - Auth: Custom JWT                  │ │  │
│  │  └────────────────────────────────────────┘ │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────────┐ │  │
│  │  │    React Frontend                      │ │  │
│  │  │    - Port: 3000 (dev) / 80 (prod)     │ │  │
│  │  │    - API: http://backend:8001          │ │  │
│  │  └────────────────────────────────────────┘ │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────────┐ │  │
│  │  │    MinIO (S3-compatible storage)       │ │  │
│  │  │    - Port: 9000 (API), 9001 (Console)  │ │  │
│  │  │    - Volume: /var/lib/minio            │ │  │
│  │  └────────────────────────────────────────┘ │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────────┐ │  │
│  │  │    Nginx Reverse Proxy                 │ │  │
│  │  │    - Port: 80, 443                     │ │  │
│  │  │    - SSL: Let's Encrypt                │ │  │
│  │  └────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 2.2 Migration Steps Overview

#### Phase 2.1: Export Current Schema ✅
1. Export complete schema with RLS policies
2. Export all migration files
3. Document all functions and triggers
4. Verify data integrity

#### Phase 2.2: Setup Self-Hosted PostgreSQL
1. Install PostgreSQL 15+ on VPS
2. Configure connection pooling (PgBouncer)
3. Setup automated backups
4. Configure SSL connections

#### Phase 2.3: Apply Migrations
1. Create database and user
2. Apply all 18 migrations in order
3. Verify schema matches exactly
4. Verify all RLS policies are active

#### Phase 2.4: Migrate Data (if any exists)
1. Export data from Supabase using pg_dump
2. Import into self-hosted PostgreSQL
3. Verify row counts match
4. Test referential integrity

#### Phase 2.5: Update Backend Connection
1. Replace Supabase client with psycopg2/asyncpg
2. Update environment variables
3. Implement connection pooling
4. Test all database queries

#### Phase 2.6: Implement Custom Authentication
1. Create JWT token generation
2. Implement password hashing (bcrypt)
3. Create login/signup endpoints
4. Implement token refresh
5. Update RLS policies to use custom auth

---

## 3. SCHEMA EXPORT & PRESERVATION

### 3.1 Complete Schema Export Command

```bash
# Export schema with RLS policies, indexes, and constraints
pg_dump "postgresql://postgres:[password]@[host]:5432/postgres" \
  --schema=public \
  --schema-only \
  --no-owner \
  --no-acl \
  --file=workmonitor_schema_complete.sql

# Export data (if needed)
pg_dump "postgresql://postgres:[password]@[host]:5432/postgres" \
  --schema=public \
  --data-only \
  --no-owner \
  --no-acl \
  --file=workmonitor_data.sql
```

### 3.2 Schema Verification Checklist

After importing to self-hosted PostgreSQL, verify:

- [ ] All 61 tables exist
- [ ] All 259 indexes exist
- [ ] All 141 RLS policies active
- [ ] All foreign key constraints present
- [ ] All check constraints present
- [ ] All unique constraints present
- [ ] All default values set correctly
- [ ] Function `check_auto_tracking_consent` exists
- [ ] All table comments preserved (if any)

### 3.3 RLS Policy Export

All RLS policies are included in migrations, but can be verified with:

```sql
-- List all RLS policies
SELECT
  schemaname, tablename, policyname, cmd,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## 4. AUTHENTICATION MIGRATION

### 4.1 Current Authentication (Supabase)

**Current Flow**:
```
1. User submits email/password
2. Supabase auth.signInWithPassword()
3. Supabase returns JWT + user data
4. JWT contains auth.uid() for RLS
5. Frontend stores JWT in localStorage
6. API calls include JWT in Authorization header
```

**Supabase JWT Structure**:
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "authenticated",
  "aud": "authenticated",
  "exp": 1234567890
}
```

**RLS Uses**:
```sql
auth.uid() -- Returns UUID from JWT sub claim
```

### 4.2 Custom Authentication (Self-Hosted)

**New Flow**:
```
1. User submits email/password
2. FastAPI backend validates credentials
3. Backend generates custom JWT
4. JWT contains user_id for RLS
5. Frontend stores JWT in localStorage
6. API calls include JWT in Authorization header
7. Backend validates JWT and sets auth.uid()
```

**Custom JWT Structure**:
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "employee|manager|admin",
  "company_id": "company-uuid",
  "employment_type": "freelancer|fulltime",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### 4.3 Required Backend Changes

#### 4.3.1 Create Auth Utility (`backend/utils/auth.py`)

```python
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict
import os

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_access_token(user_data: Dict) -> str:
    """Generate JWT access token"""
    payload = {
        "sub": user_data["user_id"],
        "email": user_data["email"],
        "role": user_data["role"],
        "company_id": user_data["company_id"],
        "employment_type": user_data.get("employment_type", "fulltime"),
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> Optional[Dict]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def get_current_user_id(token: str) -> Optional[str]:
    """Extract user_id from token"""
    payload = verify_token(token)
    return payload["sub"] if payload else None
```

#### 4.3.2 Create Auth Endpoints (`backend/routes/auth.py`)

```python
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr
from backend.utils.auth import hash_password, verify_password, create_access_token, verify_token
import psycopg2

router = APIRouter(prefix="/auth", tags=["Authentication"])

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    company_name: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/signup")
async def signup(data: SignupRequest):
    # Hash password
    hashed_password = hash_password(data.password)

    # Insert user into database
    # (Implementation depends on whether user is creating company or joining existing)

    return {"message": "User created successfully"}

@router.post("/login")
async def login(data: LoginRequest):
    # Query database for user
    # SELECT user_id, email, password_hash, role, company_id, employment_type
    # FROM users WHERE email = data.email

    # Verify password
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Generate JWT
    token = create_access_token({
        "user_id": user["user_id"],
        "email": user["email"],
        "role": user["role"],
        "company_id": user["company_id"],
        "employment_type": user["employment_type"]
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "role": user["role"]
        }
    }

@router.get("/me")
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = authorization.split(" ")[1]
    payload = verify_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Query database for full user data
    # SELECT * FROM users WHERE user_id = payload["sub"]

    return user_data
```

#### 4.3.3 RLS Integration

To make RLS work with custom JWT, use PostgreSQL's `SET LOCAL` in each request:

```python
# In every database transaction
def execute_with_auth(user_id: str, query: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Set auth.uid() for RLS
    cursor.execute(f"SET LOCAL request.jwt.claim.sub = '{user_id}';")

    # Execute query (RLS policies will use auth.uid())
    cursor.execute(query)

    return cursor.fetchall()
```

**Alternative**: Create custom RLS policies that check session variables:

```sql
-- Instead of: auth.uid()
-- Use: current_setting('request.jwt.claim.sub', true)::text

-- Example policy
CREATE POLICY "Users can view own data"
ON users FOR SELECT
USING (user_id = current_setting('request.jwt.claim.sub', true)::text);
```

---

## 5. DATABASE CONNECTION CHANGES

### 5.1 Current Connection (Supabase Client)

```python
# backend/db.py (current)
from supabase import create_client, Client

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
```

### 5.2 New Connection (PostgreSQL Direct)

```python
# backend/db.py (new)
import psycopg2
from psycopg2.pool import SimpleConnectionPool
import os

DATABASE_URL = os.getenv("DATABASE_URL")
# Format: postgresql://username:password@host:port/database

# Connection pool for performance
db_pool = SimpleConnectionPool(
    minconn=1,
    maxconn=20,
    dsn=DATABASE_URL
)

def get_db_connection():
    """Get connection from pool"""
    return db_pool.getconn()

def release_db_connection(conn):
    """Return connection to pool"""
    db_pool.putconn(conn)

# Async alternative (recommended)
import asyncpg

async_pool = None

async def init_db_pool():
    """Initialize async connection pool"""
    global async_pool
    async_pool = await asyncpg.create_pool(
        DATABASE_URL,
        min_size=1,
        max_size=20
    )

async def get_async_connection():
    """Get async connection"""
    return await async_pool.acquire()
```

### 5.3 Query Migration Examples

#### Before (Supabase):
```python
# SELECT query
response = supabase.table("users").select("*").eq("user_id", user_id).execute()
users = response.data

# INSERT query
response = supabase.table("time_entries").insert({
    "user_id": user_id,
    "start_time": start_time,
    "project_id": project_id
}).execute()

# UPDATE query
response = supabase.table("users").update({
    "full_name": "New Name"
}).eq("user_id", user_id).execute()
```

#### After (PostgreSQL):
```python
# SELECT query
conn = get_db_connection()
cursor = conn.cursor()
cursor.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
users = cursor.fetchall()
release_db_connection(conn)

# INSERT query
conn = get_db_connection()
cursor = conn.cursor()
cursor.execute(
    "INSERT INTO time_entries (user_id, start_time, project_id) VALUES (%s, %s, %s)",
    (user_id, start_time, project_id)
)
conn.commit()
release_db_connection(conn)

# UPDATE query
conn = get_db_connection()
cursor = conn.cursor()
cursor.execute(
    "UPDATE users SET full_name = %s WHERE user_id = %s",
    ("New Name", user_id)
)
conn.commit()
release_db_connection(conn)
```

---

## 6. DATA MIGRATION PROCEDURE

### 6.1 Prerequisites

- [ ] Self-hosted PostgreSQL installed and running
- [ ] All 18 migrations applied successfully
- [ ] Database credentials configured
- [ ] Backup of current Supabase database

### 6.2 Step-by-Step Migration

#### Step 1: Export from Supabase

```bash
# Export schema and data
pg_dump "postgresql://postgres:[SUPABASE_PASSWORD]@[SUPABASE_HOST]:5432/postgres" \
  --schema=public \
  --clean \
  --if-exists \
  --file=supabase_backup.sql

# Or export data only (if schema already exists)
pg_dump "postgresql://postgres:[SUPABASE_PASSWORD]@[SUPABASE_HOST]:5432/postgres" \
  --schema=public \
  --data-only \
  --column-inserts \
  --file=supabase_data.sql
```

#### Step 2: Prepare Self-Hosted Database

```bash
# Create database and user
psql -U postgres -c "CREATE DATABASE workmonitor;"
psql -U postgres -c "CREATE USER workmonitor_user WITH PASSWORD 'secure_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE workmonitor TO workmonitor_user;"
```

#### Step 3: Apply Migrations

```bash
# Apply all migrations in order
for migration in supabase/migrations/*.sql; do
    psql -U workmonitor_user -d workmonitor -f "$migration"
done
```

#### Step 4: Import Data (if migrating existing data)

```bash
# Import data
psql -U workmonitor_user -d workmonitor -f supabase_data.sql
```

#### Step 5: Verify Migration

```bash
# Check table counts
psql -U workmonitor_user -d workmonitor -c "
SELECT schemaname, COUNT(*) as table_count
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY schemaname;
"

# Check RLS status
psql -U workmonitor_user -d workmonitor -c "
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
"

# Check policy counts
psql -U workmonitor_user -d workmonitor -c "
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public';
"
```

#### Step 6: Test Authentication

```bash
# Test setting auth context
psql -U workmonitor_user -d workmonitor -c "
SET LOCAL request.jwt.claim.sub = 'test-user-id';
SELECT * FROM users WHERE user_id = current_setting('request.jwt.claim.sub', true)::text;
"
```

---

## 7. TESTING & VERIFICATION

### 7.1 Database Integrity Tests

```sql
-- Test 1: Verify all tables exist
SELECT COUNT(*) as table_count FROM pg_tables WHERE schemaname = 'public';
-- Expected: 61

-- Test 2: Verify all RLS enabled
SELECT COUNT(*) as rls_disabled_count
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
-- Expected: 0

-- Test 3: Verify all policies exist
SELECT COUNT(*) as policy_count FROM pg_policies WHERE schemaname = 'public';
-- Expected: 141

-- Test 4: Verify foreign key constraints
SELECT COUNT(*) as fk_count
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';
-- Expected: ~150

-- Test 5: Verify indexes
SELECT COUNT(*) as index_count FROM pg_indexes WHERE schemaname = 'public';
-- Expected: 259
```

### 7.2 RLS Policy Tests

```sql
-- Test user isolation
SET LOCAL request.jwt.claim.sub = 'user-1';
SELECT COUNT(*) FROM time_entries;  -- Should only return user-1's entries

SET LOCAL request.jwt.claim.sub = 'user-2';
SELECT COUNT(*) FROM time_entries;  -- Should only return user-2's entries

-- Test admin access
SET LOCAL request.jwt.claim.sub = 'admin-user';
-- Assumes admin-user has role='admin' in users table
SELECT COUNT(*) FROM time_entries;  -- Should return all company entries
```

### 7.3 Performance Tests

```sql
-- Test query performance with RLS
EXPLAIN ANALYZE
SELECT * FROM time_entries
WHERE user_id = current_setting('request.jwt.claim.sub', true)::text
LIMIT 100;

-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public' AND n_distinct > 100
ORDER BY abs(correlation) DESC;
```

---

## 8. ENVIRONMENT VARIABLES

### 8.1 Current (Supabase)

```env
VITE_SUPABASE_URL=https://ruvcvaekwqfhpjmzxiqz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=workmonitor-secret-key-2024-change-in-production
```

### 8.2 New (Self-Hosted)

```env
# Database Connection
DATABASE_URL=postgresql://workmonitor_user:secure_password@localhost:5432/workmonitor
DB_HOST=localhost
DB_PORT=5432
DB_NAME=workmonitor
DB_USER=workmonitor_user
DB_PASSWORD=secure_password
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10

# Authentication
JWT_SECRET=<GENERATE_NEW_256_BIT_KEY>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
JWT_REFRESH_EXPIRATION_DAYS=30

# Backend
BACKEND_URL=http://localhost:8001
FRONTEND_URL=http://localhost:3000

# Optional: Connection pooling
PGBOUNCER_URL=postgresql://workmonitor_user:secure_password@localhost:6432/workmonitor
```

---

## 9. ROLLBACK PLAN

### 9.1 Rollback Strategy

If migration fails, rollback to Supabase:

1. **Keep Supabase Active**: Do not delete Supabase database until migration verified
2. **Environment Variables**: Keep separate `.env.supabase` and `.env.selfhosted`
3. **Code Branches**: Keep Supabase integration code in separate branch
4. **Data Sync**: If partial migration, export new data and re-import to Supabase

### 9.2 Rollback Procedure

```bash
# Step 1: Stop self-hosted services
docker-compose down

# Step 2: Switch environment variables
cp .env.supabase .env

# Step 3: Restart with Supabase
npm run dev  # Frontend
python backend/server.py  # Backend

# Step 4: Verify functionality
curl http://localhost:8001/health
```

---

## 10. PRODUCTION DEPLOYMENT

### 10.1 PostgreSQL Production Configuration

```bash
# Install PostgreSQL 15
sudo apt update
sudo apt install postgresql-15 postgresql-contrib-15

# Configure PostgreSQL for production
sudo nano /etc/postgresql/15/main/postgresql.conf
```

**Recommended Settings**:
```conf
# Connection Settings
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 4MB

# Write Ahead Log
wal_buffers = 16MB
checkpoint_completion_target = 0.9

# Query Planning
random_page_cost = 1.1  # For SSD
effective_io_concurrency = 200

# Logging
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_duration = off
log_statement = 'ddl'

# Security
ssl = on
ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'
ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'
```

### 10.2 Backup Strategy

```bash
# Daily automated backup
0 2 * * * /usr/bin/pg_dump -U workmonitor_user workmonitor | gzip > /backups/workmonitor_$(date +\%Y\%m\%d).sql.gz

# Backup retention (keep 30 days)
find /backups -name "workmonitor_*.sql.gz" -mtime +30 -delete
```

### 10.3 Monitoring

- **pg_stat_statements**: Query performance monitoring
- **pgBadger**: Log analysis
- **Prometheus + Grafana**: Metrics and dashboards
- **pg_stat_activity**: Active connections monitoring

---

## 11. RISK ASSESSMENT

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | LOW | HIGH | Keep Supabase active, test with copy first |
| RLS policies not working | MEDIUM | HIGH | Comprehensive testing before production |
| Performance degradation | LOW | MEDIUM | Load testing, connection pooling |
| Authentication breaks | MEDIUM | HIGH | Parallel testing, gradual rollout |
| Downtime during migration | MEDIUM | MEDIUM | Blue-green deployment strategy |

---

## 12. TIMELINE ESTIMATE

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| PostgreSQL setup | 2-4 hours | VPS access |
| Migration application | 1-2 hours | PostgreSQL ready |
| Data migration (if needed) | 1-4 hours | Data size |
| Auth implementation | 4-8 hours | Backend changes |
| Backend query migration | 8-16 hours | Auth complete |
| Testing & verification | 4-8 hours | Backend complete |
| **Total** | **20-42 hours** | Sequential |

---

## 13. SUCCESS CRITERIA

- [ ] All 61 tables created with correct schema
- [ ] All 259 indexes present and functional
- [ ] All 141 RLS policies active and tested
- [ ] All foreign key constraints enforced
- [ ] Custom JWT authentication working
- [ ] All backend queries migrated successfully
- [ ] Performance equals or exceeds Supabase
- [ ] Zero data loss
- [ ] All features functional
- [ ] Rollback plan tested and ready

---

## 14. NEXT STEPS (Phase 3)

After completing database migration:

1. **Phase 3: Auth & Security**
   - Implement full JWT authentication system
   - Add token refresh mechanism
   - Implement password reset flow
   - Add OAuth providers (Google, Microsoft)
   - Implement rate limiting
   - Add CSRF protection

2. **Phase 4: Backend Verification**
   - Test all 50+ API endpoints
   - Migrate all Supabase queries
   - Fix broken endpoints
   - Add missing validations
   - Performance testing

---

**Report Status**: ✅ **COMPLETE**
**Next Phase**: Phase 3 - Authentication & Security
**Prepared By**: Database Migration Team
**Date**: 2026-01-02

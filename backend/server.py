from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
import bcrypt
import jwt
import httpx
from contextlib import asynccontextmanager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'workmonitor-secret-key-2024')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = 168  # 7 days

# Subscription Plans Configuration
SUBSCRIPTION_PLANS = {
    "monthly": {
        "name": "Monthly",
        "duration_months": 1,
        "base_price_per_user": 2.00,
        "discount_percent": 0,
        "price_per_user": 2.00
    },
    "quarterly": {
        "name": "Quarterly", 
        "duration_months": 3,
        "base_price_per_user": 2.00,
        "discount_percent": 5,
        "price_per_user": 1.90  # 5% off
    },
    "biannual": {
        "name": "6 Months",
        "duration_months": 6,
        "base_price_per_user": 2.00,
        "discount_percent": 10,
        "price_per_user": 1.80  # 10% off
    },
    "yearly": {
        "name": "Yearly",
        "duration_months": 12,
        "base_price_per_user": 2.00,
        "discount_percent": 20,
        "price_per_user": 1.60  # 20% off
    }
}

# Services included in all plans
INCLUDED_SERVICES = [
    "Time Tracking",
    "Screenshot Monitoring",
    "Activity Tracking",
    "Project Management",
    "Task Management",
    "Attendance Tracking",
    "Timesheet Management",
    "Leave Management",
    "Shift Scheduling",
    "Payroll Management",
    "Invoice Generation",
    "Real-time Dashboard",
    "Team Management",
    "Reports & Analytics",
    "WebSocket Real-time Updates",
    "Role-based Access Control"
]

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, company_id: str):
        await websocket.accept()
        if company_id not in self.active_connections:
            self.active_connections[company_id] = []
        self.active_connections[company_id].append(websocket)
        logger.info(f"WebSocket connected for company: {company_id}")
    
    def disconnect(self, websocket: WebSocket, company_id: str):
        if company_id in self.active_connections:
            if websocket in self.active_connections[company_id]:
                self.active_connections[company_id].remove(websocket)
    
    async def broadcast(self, company_id: str, message: dict):
        if company_id in self.active_connections:
            for connection in self.active_connections[company_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

manager = ConnectionManager()

# Pydantic Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    company_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    role: str
    company_id: str
    picture: Optional[str] = None
    status: str = "active"

class CompanyCreate(BaseModel):
    name: str
    timezone: str = "UTC"

class CompanyResponse(BaseModel):
    company_id: str
    name: str
    timezone: str
    tracking_policy: dict

class TimeEntryCreate(BaseModel):
    start_time: datetime
    end_time: Optional[datetime] = None
    source: str = "manual"
    notes: Optional[str] = None
    project_id: Optional[str] = None

class TimeEntryUpdate(BaseModel):
    end_time: Optional[datetime] = None
    idle_time: Optional[int] = 0
    notes: Optional[str] = None
    status: Optional[str] = None

class TimeEntryResponse(BaseModel):
    entry_id: str
    user_id: str
    start_time: datetime
    end_time: Optional[datetime]
    duration: int
    idle_time: int
    source: str
    status: str
    notes: Optional[str]
    project_id: Optional[str]

class ScreenshotCreate(BaseModel):
    time_entry_id: str
    s3_url: str
    blurred: bool = False
    app_name: Optional[str] = None
    window_title: Optional[str] = None

class ScreenshotResponse(BaseModel):
    screenshot_id: str
    user_id: str
    time_entry_id: str
    s3_url: str
    taken_at: datetime
    blurred: bool
    app_name: Optional[str]
    window_title: Optional[str]

class ActivityLogCreate(BaseModel):
    app_name: str
    url: Optional[str] = None
    activity_level: int  # 0-100
    window_title: Optional[str] = None

class ActivityLogResponse(BaseModel):
    log_id: str
    user_id: str
    app_name: str
    url: Optional[str]
    activity_level: int
    window_title: Optional[str]
    timestamp: datetime

class LeaveRequestCreate(BaseModel):
    leave_type: str  # vacation, sick, personal, etc.
    start_date: datetime
    end_date: datetime
    reason: Optional[str] = None

class LeaveRequestResponse(BaseModel):
    leave_id: str
    user_id: str
    user_name: str
    leave_type: str
    start_date: datetime
    end_date: datetime
    status: str
    reason: Optional[str]
    reviewed_by: Optional[str]

class TimesheetResponse(BaseModel):
    timesheet_id: str
    user_id: str
    user_name: str
    week_start: datetime
    total_hours: float
    billable_hours: float
    status: str
    entries: List[dict]

class PayrollResponse(BaseModel):
    payroll_id: str
    user_id: str
    user_name: str
    period_start: datetime
    period_end: datetime
    hours: float
    rate: float
    amount: float
    status: str

class InviteCreate(BaseModel):
    email: EmailStr
    role: str = "employee"

# ==================== PROJECT & TASK MODELS ====================
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    client_name: Optional[str] = None
    budget_hours: Optional[float] = None
    hourly_rate: Optional[float] = None
    status: str = "active"
    color: str = "#3B82F6"

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    client_name: Optional[str] = None
    budget_hours: Optional[float] = None
    hourly_rate: Optional[float] = None
    status: Optional[str] = None
    color: Optional[str] = None

class TaskCreate(BaseModel):
    project_id: str
    name: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: str = "medium"  # low, medium, high, urgent
    estimated_hours: Optional[float] = None
    status: str = "todo"  # todo, in_progress, review, done

class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[str] = None
    estimated_hours: Optional[float] = None
    status: Optional[str] = None

# ==================== SHIFT MODELS ====================
class ShiftCreate(BaseModel):
    name: str
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format
    days: List[int]  # 0=Monday, 6=Sunday
    break_duration: int = 60  # minutes
    color: str = "#10B981"

class ShiftAssignmentCreate(BaseModel):
    user_id: str
    shift_id: str
    date: datetime
    notes: Optional[str] = None

# ==================== ATTENDANCE MODELS ====================
class AttendanceCreate(BaseModel):
    date: datetime
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    status: str = "present"  # present, absent, late, half_day, on_leave

# ==================== INVOICE MODELS ====================
class InvoiceCreate(BaseModel):
    client_name: str
    project_id: Optional[str] = None
    items: List[dict]  # [{description, hours, rate, amount}]
    due_date: datetime
    notes: Optional[str] = None
    tax_rate: float = 0

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None  # draft, sent, paid, overdue, cancelled
    paid_date: Optional[datetime] = None

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, company_id: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'company_id': company_id,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    # Try cookie first
    session_token = request.cookies.get('session_token')
    
    # Then try Authorization header
    if not session_token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            session_token = auth_header.split(' ')[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if it's a JWT token
    try:
        payload = jwt.decode(session_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"user_id": payload['user_id']}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        pass
    except jwt.InvalidTokenError:
        pass
    
    # Check if it's a session token from Google OAuth
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one({"user_id": session['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# App Lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("company_id")
    await db.companies.create_index("company_id", unique=True)
    await db.time_entries.create_index([("user_id", 1), ("start_time", -1)])
    await db.screenshots.create_index([("user_id", 1), ("taken_at", -1)])
    await db.activity_logs.create_index([("user_id", 1), ("timestamp", -1)])
    await db.user_sessions.create_index("session_token", unique=True)
    logger.info("Database indexes created")
    yield
    client.close()

# Create FastAPI app
app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")

# ==================== AUTH ROUTES ====================
@api_router.post("/auth/register")
async def register(user_data: UserCreate, response: Response):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create company if provided
    company_id = f"company_{uuid.uuid4().hex[:12]}"
    if user_data.company_name:
        company = {
            "company_id": company_id,
            "name": user_data.company_name,
            "timezone": "UTC",
            "tracking_policy": {
                "screenshot_interval": 30,
                "idle_timeout": 300,
                "auto_start": True,
                "blur_screenshots": False
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.companies.insert_one(company)
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": "admin" if user_data.company_name else "employee",
        "company_id": company_id,
        "status": "active",
        "hourly_rate": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    # Create JWT token
    token = create_jwt_token(user_id, company_id, user["role"])
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRY_HOURS * 3600
    )
    
    return {
        "token": token,
        "user": {
            "user_id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "role": user["role"],
            "company_id": company_id
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user["user_id"], user["company_id"], user["role"])
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRY_HOURS * 3600
    )
    
    return {
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "company_id": user["company_id"],
            "picture": user.get("picture")
        }
    }

# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api_router.post("/auth/session")
async def process_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    # Fetch user data from Emergent Auth
    async with httpx.AsyncClient() as client_http:
        auth_response = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        auth_data = auth_response.json()
    
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        company_id = existing_user["company_id"]
        role = existing_user["role"]
        # Update user data
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        # Create new user and company
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        company_id = f"company_{uuid.uuid4().hex[:12]}"
        role = "admin"
        
        # Create company
        company = {
            "company_id": company_id,
            "name": f"{name}'s Company",
            "timezone": "UTC",
            "tracking_policy": {
                "screenshot_interval": 30,
                "idle_timeout": 300,
                "auto_start": True,
                "blur_screenshots": False
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.companies.insert_one(company)
        
        # Create user
        user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": role,
            "company_id": company_id,
            "status": "active",
            "hourly_rate": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    
    # Store session
    session = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.update_one(
        {"user_id": user_id},
        {"$set": session},
        upsert=True
    )
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 3600
    )
    
    return {
        "user": {
            "user_id": user_id,
            "email": email,
            "name": name,
            "role": role,
            "company_id": company_id,
            "picture": picture
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "company_id": user["company_id"],
        "picture": user.get("picture"),
        "status": user.get("status", "active")
    }

@api_router.post("/auth/logout")
async def logout(response: Response, request: Request):
    session_token = request.cookies.get('session_token')
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/", samesite="none", secure=True)
    return {"message": "Logged out successfully"}

# ==================== COMPANY ROUTES ====================
@api_router.get("/company")
async def get_company(user: dict = Depends(get_current_user)):
    company = await db.companies.find_one({"company_id": user["company_id"]}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@api_router.put("/company")
async def update_company(data: dict, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.companies.update_one(
        {"company_id": user["company_id"]},
        {"$set": data}
    )
    return {"message": "Company updated"}

@api_router.post("/company/invite")
async def invite_employee(invite: InviteCreate, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "hr", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if user already exists
    existing = await db.users.find_one({"email": invite.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create invite
    invite_doc = {
        "invite_id": f"invite_{uuid.uuid4().hex[:12]}",
        "email": invite.email,
        "role": invite.role,
        "company_id": user["company_id"],
        "invited_by": user["user_id"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.invites.insert_one(invite_doc)
    
    return {"message": "Invite sent", "invite_id": invite_doc["invite_id"]}

# ==================== TEAM ROUTES ====================
@api_router.get("/team")
async def get_team(user: dict = Depends(get_current_user)):
    members = await db.users.find(
        {"company_id": user["company_id"]},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    return members

@api_router.get("/team/{user_id}")
async def get_team_member(user_id: str, user: dict = Depends(get_current_user)):
    member = await db.users.find_one(
        {"user_id": user_id, "company_id": user["company_id"]},
        {"_id": 0, "password_hash": 0}
    )
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    return member

@api_router.put("/team/{user_id}")
async def update_team_member(user_id: str, data: dict, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Don't allow updating sensitive fields
    data.pop("password_hash", None)
    data.pop("user_id", None)
    data.pop("company_id", None)
    
    await db.users.update_one(
        {"user_id": user_id, "company_id": user["company_id"]},
        {"$set": data}
    )
    return {"message": "Team member updated"}

# ==================== TIME ENTRIES ROUTES ====================
@api_router.post("/time-entries")
async def create_time_entry(entry: TimeEntryCreate, user: dict = Depends(get_current_user)):
    entry_id = f"entry_{uuid.uuid4().hex[:12]}"
    
    duration = 0
    if entry.end_time:
        duration = int((entry.end_time - entry.start_time).total_seconds())
    
    doc = {
        "entry_id": entry_id,
        "user_id": user["user_id"],
        "company_id": user["company_id"],
        "start_time": entry.start_time.isoformat(),
        "end_time": entry.end_time.isoformat() if entry.end_time else None,
        "duration": duration,
        "idle_time": 0,
        "source": entry.source,
        "status": "active" if not entry.end_time else "completed",
        "notes": entry.notes,
        "project_id": entry.project_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.time_entries.insert_one(doc)
    
    # Broadcast to company
    await manager.broadcast(user["company_id"], {
        "type": "time_entry_created",
        "data": {"entry_id": entry_id, "user_id": user["user_id"], "user_name": user["name"]}
    })
    
    return {"entry_id": entry_id, "message": "Time entry created"}

@api_router.get("/time-entries")
async def get_time_entries(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"company_id": user["company_id"]}
    
    # Filter by user
    if user["role"] == "employee":
        query["user_id"] = user["user_id"]
    elif user_id:
        query["user_id"] = user_id
    
    # Date filters
    if start_date:
        query["start_time"] = {"$gte": start_date}
    if end_date:
        if "start_time" in query:
            query["start_time"]["$lte"] = end_date
        else:
            query["start_time"] = {"$lte": end_date}
    
    entries = await db.time_entries.find(query, {"_id": 0}).sort("start_time", -1).to_list(1000)
    return entries

@api_router.get("/time-entries/active")
async def get_active_entry(user: dict = Depends(get_current_user)):
    entry = await db.time_entries.find_one(
        {"user_id": user["user_id"], "status": "active"},
        {"_id": 0}
    )
    return entry

@api_router.put("/time-entries/{entry_id}")
async def update_time_entry(entry_id: str, data: TimeEntryUpdate, user: dict = Depends(get_current_user)):
    entry = await db.time_entries.find_one({"entry_id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    # Check permission
    if entry["user_id"] != user["user_id"] and user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {}
    if data.end_time:
        update_data["end_time"] = data.end_time.isoformat()
        start_time = datetime.fromisoformat(entry["start_time"])
        update_data["duration"] = int((data.end_time - start_time).total_seconds())
        update_data["status"] = "completed"
    if data.idle_time is not None:
        update_data["idle_time"] = data.idle_time
    if data.notes is not None:
        update_data["notes"] = data.notes
    if data.status:
        update_data["status"] = data.status
    
    await db.time_entries.update_one({"entry_id": entry_id}, {"$set": update_data})
    
    # Broadcast update
    await manager.broadcast(user["company_id"], {
        "type": "time_entry_updated",
        "data": {"entry_id": entry_id, "user_id": user["user_id"]}
    })
    
    return {"message": "Entry updated"}

@api_router.delete("/time-entries/{entry_id}")
async def delete_time_entry(entry_id: str, user: dict = Depends(get_current_user)):
    entry = await db.time_entries.find_one({"entry_id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    if entry["user_id"] != user["user_id"] and user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.time_entries.delete_one({"entry_id": entry_id})
    return {"message": "Entry deleted"}

# ==================== SCREENSHOTS ROUTES ====================
@api_router.post("/screenshots")
async def create_screenshot(screenshot: ScreenshotCreate, user: dict = Depends(get_current_user)):
    screenshot_id = f"screenshot_{uuid.uuid4().hex[:12]}"
    
    doc = {
        "screenshot_id": screenshot_id,
        "user_id": user["user_id"],
        "company_id": user["company_id"],
        "time_entry_id": screenshot.time_entry_id,
        "s3_url": screenshot.s3_url,
        "taken_at": datetime.now(timezone.utc).isoformat(),
        "blurred": screenshot.blurred,
        "app_name": screenshot.app_name,
        "window_title": screenshot.window_title
    }
    await db.screenshots.insert_one(doc)
    
    return {"screenshot_id": screenshot_id}

@api_router.get("/screenshots")
async def get_screenshots(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"company_id": user["company_id"]}
    
    if user["role"] == "employee":
        query["user_id"] = user["user_id"]
    elif user_id:
        query["user_id"] = user_id
    
    if start_date:
        query["taken_at"] = {"$gte": start_date}
    if end_date:
        if "taken_at" in query:
            query["taken_at"]["$lte"] = end_date
        else:
            query["taken_at"] = {"$lte": end_date}
    
    screenshots = await db.screenshots.find(query, {"_id": 0}).sort("taken_at", -1).to_list(500)
    return screenshots

# ==================== ACTIVITY LOGS ROUTES ====================
@api_router.post("/activity-logs")
async def create_activity_log(log: ActivityLogCreate, user: dict = Depends(get_current_user)):
    log_id = f"log_{uuid.uuid4().hex[:12]}"
    
    doc = {
        "log_id": log_id,
        "user_id": user["user_id"],
        "company_id": user["company_id"],
        "app_name": log.app_name,
        "url": log.url,
        "activity_level": log.activity_level,
        "window_title": log.window_title,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.activity_logs.insert_one(doc)
    
    return {"log_id": log_id}

@api_router.get("/activity-logs")
async def get_activity_logs(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"company_id": user["company_id"]}
    
    if user["role"] == "employee":
        query["user_id"] = user["user_id"]
    elif user_id:
        query["user_id"] = user_id
    
    if start_date:
        query["timestamp"] = {"$gte": start_date}
    if end_date:
        if "timestamp" in query:
            query["timestamp"]["$lte"] = end_date
        else:
            query["timestamp"] = {"$lte": end_date}
    
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    return logs

# ==================== TIMESHEETS ROUTES ====================
@api_router.get("/timesheets")
async def get_timesheets(
    status: Optional[str] = None,
    user_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"company_id": user["company_id"]}
    
    if user["role"] == "employee":
        query["user_id"] = user["user_id"]
    elif user_id:
        query["user_id"] = user_id
    
    if status:
        query["status"] = status
    
    timesheets = await db.timesheets.find(query, {"_id": 0}).sort("week_start", -1).to_list(100)
    return timesheets

@api_router.post("/timesheets/generate")
async def generate_timesheet(user: dict = Depends(get_current_user)):
    """Generate timesheet for current week"""
    today = datetime.now(timezone.utc)
    week_start = today - timedelta(days=today.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=7)
    
    # Get time entries for the week
    entries = await db.time_entries.find({
        "user_id": user["user_id"],
        "start_time": {"$gte": week_start.isoformat(), "$lt": week_end.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    total_hours = sum(e.get("duration", 0) for e in entries) / 3600
    
    timesheet_id = f"timesheet_{uuid.uuid4().hex[:12]}"
    timesheet = {
        "timesheet_id": timesheet_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "company_id": user["company_id"],
        "week_start": week_start.isoformat(),
        "total_hours": round(total_hours, 2),
        "billable_hours": round(total_hours, 2),
        "status": "pending",
        "entries": [{"entry_id": e["entry_id"], "duration": e.get("duration", 0)} for e in entries],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.timesheets.update_one(
        {"user_id": user["user_id"], "week_start": week_start.isoformat()},
        {"$set": timesheet},
        upsert=True
    )
    
    return {"timesheet_id": timesheet_id, "total_hours": round(total_hours, 2)}

@api_router.put("/timesheets/{timesheet_id}/approve")
async def approve_timesheet(timesheet_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "manager", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.timesheets.update_one(
        {"timesheet_id": timesheet_id},
        {"$set": {"status": "approved", "approved_by": user["user_id"], "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Timesheet approved"}

@api_router.put("/timesheets/{timesheet_id}/reject")
async def reject_timesheet(timesheet_id: str, reason: str = "", user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "manager", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.timesheets.update_one(
        {"timesheet_id": timesheet_id},
        {"$set": {"status": "rejected", "rejection_reason": reason, "rejected_by": user["user_id"]}}
    )
    return {"message": "Timesheet rejected"}

# ==================== LEAVE ROUTES ====================
@api_router.post("/leaves")
async def create_leave_request(leave: LeaveRequestCreate, user: dict = Depends(get_current_user)):
    leave_id = f"leave_{uuid.uuid4().hex[:12]}"
    
    doc = {
        "leave_id": leave_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "company_id": user["company_id"],
        "leave_type": leave.leave_type,
        "start_date": leave.start_date.isoformat(),
        "end_date": leave.end_date.isoformat(),
        "reason": leave.reason,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.leaves.insert_one(doc)
    
    return {"leave_id": leave_id, "message": "Leave request submitted"}

@api_router.get("/leaves")
async def get_leaves(
    status: Optional[str] = None,
    user_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"company_id": user["company_id"]}
    
    if user["role"] == "employee":
        query["user_id"] = user["user_id"]
    elif user_id:
        query["user_id"] = user_id
    
    if status:
        query["status"] = status
    
    leaves = await db.leaves.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return leaves

@api_router.put("/leaves/{leave_id}/approve")
async def approve_leave(leave_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "manager", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.leaves.update_one(
        {"leave_id": leave_id},
        {"$set": {"status": "approved", "reviewed_by": user["user_id"], "reviewed_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Leave approved"}

@api_router.put("/leaves/{leave_id}/reject")
async def reject_leave(leave_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "manager", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.leaves.update_one(
        {"leave_id": leave_id},
        {"$set": {"status": "rejected", "reviewed_by": user["user_id"], "reviewed_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Leave rejected"}

# ==================== PAYROLL ROUTES ====================
@api_router.get("/payroll")
async def get_payroll(
    period: Optional[str] = None,
    user_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"company_id": user["company_id"]}
    
    if user["role"] == "employee":
        query["user_id"] = user["user_id"]
    elif user_id:
        query["user_id"] = user_id
    
    if period:
        query["period"] = period
    
    payroll = await db.payroll.find(query, {"_id": 0}).sort("period_start", -1).to_list(100)
    return payroll

@api_router.post("/payroll/generate")
async def generate_payroll(
    period_start: str,
    period_end: str,
    user: dict = Depends(get_current_user)
):
    if user["role"] not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all approved timesheets in period
    timesheets = await db.timesheets.find({
        "company_id": user["company_id"],
        "status": "approved",
        "week_start": {"$gte": period_start, "$lte": period_end}
    }, {"_id": 0}).to_list(1000)
    
    # Group by user
    user_hours = {}
    for ts in timesheets:
        uid = ts["user_id"]
        if uid not in user_hours:
            user_hours[uid] = {"hours": 0, "name": ts.get("user_name", "")}
        user_hours[uid]["hours"] += ts.get("total_hours", 0)
    
    # Generate payroll entries
    payroll_entries = []
    for uid, data in user_hours.items():
        user_doc = await db.users.find_one({"user_id": uid}, {"_id": 0})
        rate = user_doc.get("hourly_rate", 0) if user_doc else 0
        
        payroll_id = f"payroll_{uuid.uuid4().hex[:12]}"
        entry = {
            "payroll_id": payroll_id,
            "user_id": uid,
            "user_name": data["name"],
            "company_id": user["company_id"],
            "period_start": period_start,
            "period_end": period_end,
            "period": f"{period_start[:7]}",
            "hours": round(data["hours"], 2),
            "rate": rate,
            "amount": round(data["hours"] * rate, 2),
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payroll.insert_one(entry)
        payroll_entries.append(entry)
    
    return {"message": f"Generated {len(payroll_entries)} payroll entries", "entries": payroll_entries}

@api_router.put("/payroll/{payroll_id}/process")
async def process_payroll(payroll_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.payroll.update_one(
        {"payroll_id": payroll_id},
        {"$set": {"status": "processed", "processed_by": user["user_id"], "processed_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Payroll processed"}

# ==================== DASHBOARD / STATS ROUTES ====================
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)
    
    query_base = {"company_id": user["company_id"]}
    if user["role"] == "employee":
        query_base["user_id"] = user["user_id"]
    
    # Today's hours
    today_entries = await db.time_entries.find({
        **query_base,
        "start_time": {"$gte": today.isoformat()}
    }, {"_id": 0}).to_list(1000)
    today_hours = sum(e.get("duration", 0) for e in today_entries) / 3600
    
    # Week hours
    week_entries = await db.time_entries.find({
        **query_base,
        "start_time": {"$gte": week_start.isoformat()}
    }, {"_id": 0}).to_list(1000)
    week_hours = sum(e.get("duration", 0) for e in week_entries) / 3600
    
    # Month hours
    month_entries = await db.time_entries.find({
        **query_base,
        "start_time": {"$gte": month_start.isoformat()}
    }, {"_id": 0}).to_list(1000)
    month_hours = sum(e.get("duration", 0) for e in month_entries) / 3600
    
    # Activity stats
    activity_logs = await db.activity_logs.find({
        **query_base,
        "timestamp": {"$gte": today.isoformat()}
    }, {"_id": 0}).to_list(1000)
    avg_activity = sum(l.get("activity_level", 0) for l in activity_logs) / max(len(activity_logs), 1)
    
    # Team stats (for managers/admins)
    team_online = 0
    team_total = 0
    if user["role"] in ["admin", "manager", "hr"]:
        team_total = await db.users.count_documents({"company_id": user["company_id"]})
        # Count active time entries in last 15 minutes
        recent_cutoff = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
        team_online = len(set([
            e["user_id"] for e in await db.time_entries.find({
                "company_id": user["company_id"],
                "status": "active"
            }, {"user_id": 1, "_id": 0}).to_list(1000)
        ]))
    
    # Pending approvals
    pending_leaves = await db.leaves.count_documents({**query_base, "status": "pending"}) if user["role"] in ["admin", "manager", "hr"] else 0
    pending_timesheets = await db.timesheets.count_documents({**query_base, "status": "pending"}) if user["role"] in ["admin", "manager", "hr"] else 0
    
    return {
        "today_hours": round(today_hours, 2),
        "week_hours": round(week_hours, 2),
        "month_hours": round(month_hours, 2),
        "avg_activity": round(avg_activity, 1),
        "team_online": team_online,
        "team_total": team_total,
        "pending_leaves": pending_leaves,
        "pending_timesheets": pending_timesheets,
        "screenshots_today": await db.screenshots.count_documents({**query_base, "taken_at": {"$gte": today.isoformat()}})
    }

@api_router.get("/dashboard/team-status")
async def get_team_status(user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "manager", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    team = await db.users.find(
        {"company_id": user["company_id"]},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    
    result = []
    for member in team:
        # Get active time entry
        active_entry = await db.time_entries.find_one(
            {"user_id": member["user_id"], "status": "active"},
            {"_id": 0}
        )
        
        # Get latest activity
        latest_activity = await db.activity_logs.find_one(
            {"user_id": member["user_id"]},
            {"_id": 0},
            sort=[("timestamp", -1)]
        )
        
        # Get today's hours
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_entries = await db.time_entries.find({
            "user_id": member["user_id"],
            "start_time": {"$gte": today.isoformat()}
        }, {"_id": 0}).to_list(100)
        today_hours = sum(e.get("duration", 0) for e in today_entries) / 3600
        
        status = "offline"
        if active_entry:
            status = "active"
            if latest_activity:
                activity_time = datetime.fromisoformat(latest_activity["timestamp"].replace('Z', '+00:00'))
                if datetime.now(timezone.utc) - activity_time > timedelta(minutes=5):
                    status = "idle"
        
        result.append({
            "user_id": member["user_id"],
            "name": member["name"],
            "email": member["email"],
            "role": member["role"],
            "picture": member.get("picture"),
            "status": status,
            "today_hours": round(today_hours, 2),
            "current_app": latest_activity.get("app_name") if latest_activity else None,
            "activity_level": latest_activity.get("activity_level", 0) if latest_activity else 0
        })
    
    return result

@api_router.get("/dashboard/activity-chart")
async def get_activity_chart(days: int = 7, user: dict = Depends(get_current_user)):
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    query = {"company_id": user["company_id"], "start_time": {"$gte": start_date.isoformat()}}
    if user["role"] == "employee":
        query["user_id"] = user["user_id"]
    
    entries = await db.time_entries.find(query, {"_id": 0}).to_list(10000)
    
    # Group by date
    daily_data = {}
    for e in entries:
        date = e["start_time"][:10]
        if date not in daily_data:
            daily_data[date] = {"hours": 0, "entries": 0}
        daily_data[date]["hours"] += e.get("duration", 0) / 3600
        daily_data[date]["entries"] += 1
    
    result = []
    for i in range(days):
        date = (datetime.now(timezone.utc) - timedelta(days=days-1-i)).strftime("%Y-%m-%d")
        result.append({
            "date": date,
            "hours": round(daily_data.get(date, {"hours": 0})["hours"], 2),
            "entries": daily_data.get(date, {"entries": 0})["entries"]
        })
    
    return result

# ==================== PROJECT ROUTES ====================
@api_router.post("/projects")
async def create_project(project: ProjectCreate, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    project_id = f"project_{uuid.uuid4().hex[:12]}"
    doc = {
        "project_id": project_id,
        "company_id": user["company_id"],
        "name": project.name,
        "description": project.description,
        "client_name": project.client_name,
        "budget_hours": project.budget_hours,
        "hourly_rate": project.hourly_rate,
        "status": project.status,
        "color": project.color,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.projects.insert_one(doc)
    return {"project_id": project_id, "message": "Project created"}

@api_router.get("/projects")
async def get_projects(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"company_id": user["company_id"]}
    if status:
        query["status"] = status
    
    projects = await db.projects.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Add tracked hours for each project
    for project in projects:
        entries = await db.time_entries.find(
            {"project_id": project["project_id"]},
            {"duration": 1, "_id": 0}
        ).to_list(10000)
        project["tracked_hours"] = round(sum(e.get("duration", 0) for e in entries) / 3600, 2)
        
        # Count tasks
        task_count = await db.tasks.count_documents({"project_id": project["project_id"]})
        project["task_count"] = task_count
    
    return projects

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    project = await db.projects.find_one(
        {"project_id": project_id, "company_id": user["company_id"]},
        {"_id": 0}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get tracked hours
    entries = await db.time_entries.find(
        {"project_id": project_id},
        {"duration": 1, "_id": 0}
    ).to_list(10000)
    project["tracked_hours"] = round(sum(e.get("duration", 0) for e in entries) / 3600, 2)
    
    return project

@api_router.put("/projects/{project_id}")
async def update_project(project_id: str, data: ProjectUpdate, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.projects.update_one(
            {"project_id": project_id, "company_id": user["company_id"]},
            {"$set": update_data}
        )
    return {"message": "Project updated"}

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.projects.delete_one({"project_id": project_id, "company_id": user["company_id"]})
    return {"message": "Project deleted"}

# ==================== TASK ROUTES ====================
@api_router.post("/tasks")
async def create_task(task: TaskCreate, user: dict = Depends(get_current_user)):
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    doc = {
        "task_id": task_id,
        "project_id": task.project_id,
        "company_id": user["company_id"],
        "name": task.name,
        "description": task.description,
        "assigned_to": task.assigned_to,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "priority": task.priority,
        "estimated_hours": task.estimated_hours,
        "status": task.status,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tasks.insert_one(doc)
    return {"task_id": task_id, "message": "Task created"}

@api_router.get("/tasks")
async def get_tasks(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"company_id": user["company_id"]}
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status"] = status
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    tasks = await db.tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Add tracked hours and assignee name
    for task in tasks:
        entries = await db.time_entries.find(
            {"task_id": task["task_id"]},
            {"duration": 1, "_id": 0}
        ).to_list(1000)
        task["tracked_hours"] = round(sum(e.get("duration", 0) for e in entries) / 3600, 2)
        
        if task.get("assigned_to"):
            assignee = await db.users.find_one({"user_id": task["assigned_to"]}, {"name": 1, "_id": 0})
            task["assignee_name"] = assignee.get("name") if assignee else None
    
    return tasks

@api_router.get("/tasks/{task_id}")
async def get_task(task_id: str, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one(
        {"task_id": task_id, "company_id": user["company_id"]},
        {"_id": 0}
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, data: TaskUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if "due_date" in update_data and update_data["due_date"]:
        update_data["due_date"] = update_data["due_date"].isoformat()
    
    if update_data:
        await db.tasks.update_one(
            {"task_id": task_id, "company_id": user["company_id"]},
            {"$set": update_data}
        )
    return {"message": "Task updated"}

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    await db.tasks.delete_one({"task_id": task_id, "company_id": user["company_id"]})
    return {"message": "Task deleted"}

# ==================== SHIFT ROUTES ====================
@api_router.post("/shifts")
async def create_shift(shift: ShiftCreate, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "hr", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    shift_id = f"shift_{uuid.uuid4().hex[:12]}"
    doc = {
        "shift_id": shift_id,
        "company_id": user["company_id"],
        "name": shift.name,
        "start_time": shift.start_time,
        "end_time": shift.end_time,
        "days": shift.days,
        "break_duration": shift.break_duration,
        "color": shift.color,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.shifts.insert_one(doc)
    return {"shift_id": shift_id, "message": "Shift created"}

@api_router.get("/shifts")
async def get_shifts(user: dict = Depends(get_current_user)):
    shifts = await db.shifts.find(
        {"company_id": user["company_id"]},
        {"_id": 0}
    ).to_list(100)
    return shifts

@api_router.put("/shifts/{shift_id}")
async def update_shift(shift_id: str, data: dict, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "hr", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.shifts.update_one(
        {"shift_id": shift_id, "company_id": user["company_id"]},
        {"$set": data}
    )
    return {"message": "Shift updated"}

@api_router.delete("/shifts/{shift_id}")
async def delete_shift(shift_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "hr", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.shifts.delete_one({"shift_id": shift_id, "company_id": user["company_id"]})
    return {"message": "Shift deleted"}

@api_router.post("/shift-assignments")
async def create_shift_assignment(assignment: ShiftAssignmentCreate, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "hr", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    assignment_id = f"assign_{uuid.uuid4().hex[:12]}"
    doc = {
        "assignment_id": assignment_id,
        "company_id": user["company_id"],
        "user_id": assignment.user_id,
        "shift_id": assignment.shift_id,
        "date": assignment.date.isoformat(),
        "notes": assignment.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.shift_assignments.insert_one(doc)
    return {"assignment_id": assignment_id}

@api_router.get("/shift-assignments")
async def get_shift_assignments(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"company_id": user["company_id"]}
    if user["role"] == "employee":
        query["user_id"] = user["user_id"]
    elif user_id:
        query["user_id"] = user_id
    
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    assignments = await db.shift_assignments.find(query, {"_id": 0}).to_list(500)
    
    # Add shift and user details
    for a in assignments:
        shift = await db.shifts.find_one({"shift_id": a["shift_id"]}, {"_id": 0})
        a["shift"] = shift
        user_doc = await db.users.find_one({"user_id": a["user_id"]}, {"name": 1, "picture": 1, "_id": 0})
        a["user_name"] = user_doc.get("name") if user_doc else None
        a["user_picture"] = user_doc.get("picture") if user_doc else None
    
    return assignments

# ==================== ATTENDANCE ROUTES ====================
@api_router.post("/attendance/clock-in")
async def clock_in(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Check if already clocked in
    existing = await db.attendance.find_one({
        "user_id": user["user_id"],
        "date": today.isoformat()
    })
    
    if existing and existing.get("clock_in"):
        raise HTTPException(status_code=400, detail="Already clocked in today")
    
    now = datetime.now(timezone.utc)
    
    # Get user's shift for today
    today_weekday = today.weekday()
    shift_assignment = await db.shift_assignments.find_one({
        "user_id": user["user_id"],
        "date": today.isoformat()
    })
    
    status = "present"
    if shift_assignment:
        shift = await db.shifts.find_one({"shift_id": shift_assignment["shift_id"]})
        if shift:
            shift_start = datetime.strptime(shift["start_time"], "%H:%M").replace(
                year=now.year, month=now.month, day=now.day,
                tzinfo=timezone.utc
            )
            if now > shift_start + timedelta(minutes=15):
                status = "late"
    
    attendance_id = f"attendance_{uuid.uuid4().hex[:12]}"
    doc = {
        "attendance_id": attendance_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "company_id": user["company_id"],
        "date": today.isoformat(),
        "clock_in": now.isoformat(),
        "clock_out": None,
        "status": status,
        "work_hours": 0,
        "overtime": 0
    }
    
    if existing:
        await db.attendance.update_one(
            {"user_id": user["user_id"], "date": today.isoformat()},
            {"$set": {"clock_in": now.isoformat(), "status": status}}
        )
    else:
        await db.attendance.insert_one(doc)
    
    return {"message": "Clocked in successfully", "status": status, "time": now.isoformat()}

@api_router.post("/attendance/clock-out")
async def clock_out(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    attendance = await db.attendance.find_one({
        "user_id": user["user_id"],
        "date": today.isoformat()
    })
    
    if not attendance or not attendance.get("clock_in"):
        raise HTTPException(status_code=400, detail="Not clocked in today")
    
    if attendance.get("clock_out"):
        raise HTTPException(status_code=400, detail="Already clocked out today")
    
    now = datetime.now(timezone.utc)
    clock_in_time = datetime.fromisoformat(attendance["clock_in"])
    work_hours = (now - clock_in_time).total_seconds() / 3600
    
    # Calculate overtime (assuming 8 hours is standard)
    overtime = max(0, work_hours - 8)
    
    await db.attendance.update_one(
        {"user_id": user["user_id"], "date": today.isoformat()},
        {"$set": {
            "clock_out": now.isoformat(),
            "work_hours": round(work_hours, 2),
            "overtime": round(overtime, 2)
        }}
    )
    
    return {"message": "Clocked out successfully", "work_hours": round(work_hours, 2), "overtime": round(overtime, 2)}

@api_router.get("/attendance")
async def get_attendance(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"company_id": user["company_id"]}
    
    if user["role"] == "employee":
        query["user_id"] = user["user_id"]
    elif user_id:
        query["user_id"] = user_id
    
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    attendance = await db.attendance.find(query, {"_id": 0}).sort("date", -1).to_list(500)
    return attendance

@api_router.get("/attendance/today")
async def get_today_attendance(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    attendance = await db.attendance.find_one({
        "user_id": user["user_id"],
        "date": today.isoformat()
    }, {"_id": 0})
    
    return attendance or {"status": "not_clocked_in"}

@api_router.get("/attendance/report")
async def get_attendance_report(
    start_date: str,
    end_date: str,
    user: dict = Depends(get_current_user)
):
    if user["role"] not in ["admin", "hr", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all team members
    team = await db.users.find(
        {"company_id": user["company_id"]},
        {"_id": 0, "user_id": 1, "name": 1}
    ).to_list(1000)
    
    report = []
    for member in team:
        attendance_records = await db.attendance.find({
            "user_id": member["user_id"],
            "date": {"$gte": start_date, "$lte": end_date}
        }, {"_id": 0}).to_list(100)
        
        total_work_hours = sum(a.get("work_hours", 0) for a in attendance_records)
        total_overtime = sum(a.get("overtime", 0) for a in attendance_records)
        present_days = len([a for a in attendance_records if a.get("status") in ["present", "late"]])
        late_days = len([a for a in attendance_records if a.get("status") == "late"])
        absent_days = len([a for a in attendance_records if a.get("status") == "absent"])
        
        report.append({
            "user_id": member["user_id"],
            "name": member["name"],
            "total_work_hours": round(total_work_hours, 2),
            "total_overtime": round(total_overtime, 2),
            "present_days": present_days,
            "late_days": late_days,
            "absent_days": absent_days,
            "attendance_rate": round(present_days / max(len(attendance_records), 1) * 100, 1)
        })
    
    return report

# ==================== INVOICE ROUTES ====================
@api_router.post("/invoices")
async def create_invoice(invoice: InvoiceCreate, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    invoice_id = f"invoice_{uuid.uuid4().hex[:12]}"
    
    # Calculate totals
    subtotal = sum(item.get("amount", 0) for item in invoice.items)
    tax_amount = subtotal * (invoice.tax_rate / 100)
    total = subtotal + tax_amount
    
    # Generate invoice number
    count = await db.invoices.count_documents({"company_id": user["company_id"]})
    invoice_number = f"INV-{datetime.now().year}-{str(count + 1).zfill(4)}"
    
    doc = {
        "invoice_id": invoice_id,
        "invoice_number": invoice_number,
        "company_id": user["company_id"],
        "client_name": invoice.client_name,
        "project_id": invoice.project_id,
        "items": invoice.items,
        "subtotal": round(subtotal, 2),
        "tax_rate": invoice.tax_rate,
        "tax_amount": round(tax_amount, 2),
        "total": round(total, 2),
        "due_date": invoice.due_date.isoformat(),
        "notes": invoice.notes,
        "status": "draft",
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.invoices.insert_one(doc)
    
    return {"invoice_id": invoice_id, "invoice_number": invoice_number}

@api_router.get("/invoices")
async def get_invoices(
    status: Optional[str] = None,
    project_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    if user["role"] not in ["admin", "hr", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = {"company_id": user["company_id"]}
    if status:
        query["status"] = status
    if project_id:
        query["project_id"] = project_id
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return invoices

@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "company_id": user["company_id"]},
        {"_id": 0}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Get company info for invoice
    company = await db.companies.find_one({"company_id": user["company_id"]}, {"_id": 0})
    invoice["company"] = company
    
    return invoice

@api_router.put("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, data: InvoiceUpdate, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if "paid_date" in update_data and update_data["paid_date"]:
        update_data["paid_date"] = update_data["paid_date"].isoformat()
    
    if update_data:
        await db.invoices.update_one(
            {"invoice_id": invoice_id, "company_id": user["company_id"]},
            {"$set": update_data}
        )
    return {"message": "Invoice updated"}

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.invoices.delete_one({"invoice_id": invoice_id, "company_id": user["company_id"]})
    return {"message": "Invoice deleted"}

@api_router.post("/invoices/{invoice_id}/generate-from-project")
async def generate_invoice_from_project(
    invoice_id: str,
    project_id: str,
    start_date: str,
    end_date: str,
    user: dict = Depends(get_current_user)
):
    if user["role"] not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get project
    project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get time entries for the project in date range
    entries = await db.time_entries.find({
        "project_id": project_id,
        "start_time": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(10000)
    
    total_hours = sum(e.get("duration", 0) for e in entries) / 3600
    hourly_rate = project.get("hourly_rate", 0)
    
    items = [{
        "description": f"Work on {project['name']} ({start_date} to {end_date})",
        "hours": round(total_hours, 2),
        "rate": hourly_rate,
        "amount": round(total_hours * hourly_rate, 2)
    }]
    
    return {
        "items": items,
        "subtotal": round(total_hours * hourly_rate, 2),
        "total_hours": round(total_hours, 2)
    }

# ==================== WEBSOCKET ====================
@app.websocket("/ws/{company_id}")
async def websocket_endpoint(websocket: WebSocket, company_id: str):
    await manager.connect(websocket, company_id)
    try:
        while True:
            data = await websocket.receive_json()
            # Handle incoming WebSocket messages if needed
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, company_id)

@api_router.get("/")
async def root():
    return {"message": "WorkMonitor API v1.0", "status": "running"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

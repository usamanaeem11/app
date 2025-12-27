from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, List
import os
import httpx
from datetime import datetime, timezone, timedelta
import json
import logging

router = APIRouter(prefix="/calendar", tags=["calendar"])
logger = logging.getLogger(__name__)

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_CALENDAR_REDIRECT_URI', 'http://localhost:8001/api/calendar/callback')

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"

# Required scopes for calendar access
CALENDAR_SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events"
]

class CalendarEvent(BaseModel):
    summary: str
    description: Optional[str] = None
    start_time: str  # ISO format
    end_time: str    # ISO format
    attendees: Optional[List[str]] = None
    location: Optional[str] = None
    reminder_minutes: int = 30

class SyncTimeEntryRequest(BaseModel):
    time_entry_id: str
    project_name: Optional[str] = None
    description: Optional[str] = None

@router.get("/connect")
async def connect_google_calendar(request: Request):
    """Initiate Google Calendar OAuth flow"""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=503,
            detail="Google Calendar not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        )
    
    # Get user from request for state
    auth_header = request.headers.get('Authorization', '')
    state = auth_header.replace('Bearer ', '')[:20] if auth_header else 'anonymous'
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(CALENDAR_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state
    }
    
    auth_url = f"{GOOGLE_AUTH_URL}?{'&'.join(f'{k}={v}' for k, v in params.items())}"
    return {"auth_url": auth_url}

@router.get("/callback")
async def google_calendar_callback(
    code: str,
    state: str = None,
    request: Request = None
):
    """Handle Google Calendar OAuth callback"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google Calendar not configured")
    
    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": GOOGLE_REDIRECT_URI
            }
        )
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for tokens")
        
        tokens = token_response.json()
    
    # Store tokens (in production, associate with user)
    db = request.app.state.db
    
    # Get user info from Google
    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )
        google_user = user_response.json()
    
    # Store calendar connection
    await db.calendar_connections.update_one(
        {"google_email": google_user.get("email")},
        {"$set": {
            "google_email": google_user.get("email"),
            "access_token": tokens.get("access_token"),
            "refresh_token": tokens.get("refresh_token"),
            "token_expiry": (datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))).isoformat(),
            "connected_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Redirect to frontend with success
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    return RedirectResponse(f"{frontend_url}/settings?calendar=connected")

@router.get("/events")
async def get_calendar_events(
    user_id: str,
    start_date: str = None,
    end_date: str = None,
    request: Request = None
):
    """Get calendar events for a user"""
    db = request.app.state.db
    
    # Get user's calendar connection
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user or not user.get("google_email"):
        raise HTTPException(status_code=404, detail="User not connected to Google Calendar")
    
    connection = await db.calendar_connections.find_one(
        {"google_email": user["google_email"]},
        {"_id": 0}
    )
    
    if not connection:
        raise HTTPException(status_code=404, detail="Calendar not connected")
    
    # Refresh token if expired
    access_token = await refresh_token_if_needed(db, connection)
    
    # Default to current week
    if not start_date:
        start_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    if not end_date:
        end_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    
    # Fetch events from Google Calendar
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GOOGLE_CALENDAR_API}/calendars/primary/events",
            headers={"Authorization": f"Bearer {access_token}"},
            params={
                "timeMin": start_date,
                "timeMax": end_date,
                "singleEvents": True,
                "orderBy": "startTime"
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to fetch calendar events")
        
        data = response.json()
    
    events = []
    for item in data.get("items", []):
        events.append({
            "id": item.get("id"),
            "summary": item.get("summary"),
            "description": item.get("description"),
            "start": item.get("start", {}).get("dateTime") or item.get("start", {}).get("date"),
            "end": item.get("end", {}).get("dateTime") or item.get("end", {}).get("date"),
            "location": item.get("location"),
            "status": item.get("status"),
            "html_link": item.get("htmlLink")
        })
    
    return {"events": events, "count": len(events)}

@router.post("/events")
async def create_calendar_event(
    event: CalendarEvent,
    user_id: str,
    request: Request = None
):
    """Create a calendar event"""
    db = request.app.state.db
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user or not user.get("google_email"):
        raise HTTPException(status_code=404, detail="User not connected to Google Calendar")
    
    connection = await db.calendar_connections.find_one(
        {"google_email": user["google_email"]},
        {"_id": 0}
    )
    
    if not connection:
        raise HTTPException(status_code=404, detail="Calendar not connected")
    
    access_token = await refresh_token_if_needed(db, connection)
    
    # Create event payload
    event_body = {
        "summary": event.summary,
        "description": event.description,
        "start": {"dateTime": event.start_time, "timeZone": "UTC"},
        "end": {"dateTime": event.end_time, "timeZone": "UTC"},
        "reminders": {
            "useDefault": False,
            "overrides": [{"method": "popup", "minutes": event.reminder_minutes}]
        }
    }
    
    if event.attendees:
        event_body["attendees"] = [{"email": email} for email in event.attendees]
    
    if event.location:
        event_body["location"] = event.location
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{GOOGLE_CALENDAR_API}/calendars/primary/events",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json=event_body
        )
        
        if response.status_code not in [200, 201]:
            raise HTTPException(status_code=500, detail="Failed to create calendar event")
        
        created_event = response.json()
    
    return {
        "event_id": created_event.get("id"),
        "html_link": created_event.get("htmlLink"),
        "status": "created"
    }

@router.post("/sync-time-entry")
async def sync_time_entry_to_calendar(
    data: SyncTimeEntryRequest,
    user_id: str,
    request: Request = None
):
    """Sync a time entry to Google Calendar"""
    db = request.app.state.db
    
    # Get time entry
    time_entry = await db.time_entries.find_one(
        {"entry_id": data.time_entry_id},
        {"_id": 0}
    )
    
    if not time_entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    # Create calendar event from time entry
    event = CalendarEvent(
        summary=f"Work: {data.project_name or 'Time Entry'}",
        description=data.description or f"Time tracked via WorkMonitor\nEntry ID: {data.time_entry_id}",
        start_time=time_entry["start_time"],
        end_time=time_entry.get("end_time") or datetime.now(timezone.utc).isoformat(),
        reminder_minutes=0
    )
    
    return await create_calendar_event(event, user_id, request)

@router.delete("/disconnect")
async def disconnect_calendar(user_id: str, request: Request = None):
    """Disconnect Google Calendar"""
    db = request.app.state.db
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user or not user.get("google_email"):
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.calendar_connections.delete_one({"google_email": user["google_email"]})
    
    return {"status": "disconnected"}

@router.get("/status")
async def get_calendar_status(user_id: str, request: Request = None):
    """Check calendar connection status"""
    db = request.app.state.db
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("google_email"):
        return {"connected": False, "reason": "No Google account linked"}
    
    connection = await db.calendar_connections.find_one(
        {"google_email": user["google_email"]},
        {"_id": 0, "access_token": 0, "refresh_token": 0}
    )
    
    if not connection:
        return {"connected": False, "reason": "Calendar not connected"}
    
    return {
        "connected": True,
        "google_email": connection.get("google_email"),
        "connected_at": connection.get("connected_at")
    }

async def refresh_token_if_needed(db, connection):
    """Refresh access token if expired"""
    token_expiry = datetime.fromisoformat(connection.get("token_expiry", "2000-01-01T00:00:00+00:00").replace('Z', '+00:00'))
    
    if datetime.now(timezone.utc) < token_expiry - timedelta(minutes=5):
        return connection["access_token"]
    
    # Refresh token
    if not connection.get("refresh_token"):
        raise HTTPException(status_code=401, detail="Calendar authorization expired. Please reconnect.")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "refresh_token": connection["refresh_token"],
                "grant_type": "refresh_token"
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Failed to refresh token. Please reconnect calendar.")
        
        tokens = response.json()
    
    # Update stored tokens
    await db.calendar_connections.update_one(
        {"google_email": connection["google_email"]},
        {"$set": {
            "access_token": tokens["access_token"],
            "token_expiry": (datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))).isoformat()
        }}
    )
    
    return tokens["access_token"]

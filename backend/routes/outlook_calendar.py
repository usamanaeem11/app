"""
Outlook Calendar Integration
============================
Microsoft Graph API integration for Outlook Calendar
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import os
import httpx
import uuid
import logging

router = APIRouter(prefix="/outlook", tags=["outlook"])
logger = logging.getLogger(__name__)

# Microsoft OAuth configuration
MS_CLIENT_ID = os.environ.get('MS_CLIENT_ID')
MS_CLIENT_SECRET = os.environ.get('MS_CLIENT_SECRET')
MS_REDIRECT_URI = os.environ.get('MS_REDIRECT_URI', 'http://localhost:8001/api/outlook/callback')
MS_TENANT_ID = os.environ.get('MS_TENANT_ID', 'common')  # 'common' for multi-tenant

MS_AUTH_URL = f"https://login.microsoftonline.com/{MS_TENANT_ID}/oauth2/v2.0/authorize"
MS_TOKEN_URL = f"https://login.microsoftonline.com/{MS_TENANT_ID}/oauth2/v2.0/token"
MS_GRAPH_API = "https://graph.microsoft.com/v1.0"

# Required scopes
MS_SCOPES = [
    "offline_access",
    "User.Read",
    "Calendars.ReadWrite"
]

class OutlookEvent(BaseModel):
    subject: str
    body: Optional[str] = None
    start_time: str
    end_time: str
    attendees: Optional[List[str]] = None
    location: Optional[str] = None
    is_online_meeting: bool = False

class SyncTimeEntryRequest(BaseModel):
    time_entry_id: str
    project_name: Optional[str] = None
    description: Optional[str] = None

@router.get("/connect")
async def connect_outlook_calendar(request: Request):
    """Initiate Outlook Calendar OAuth flow"""
    if not MS_CLIENT_ID:
        raise HTTPException(
            status_code=503,
            detail="Outlook integration not configured. Set MS_CLIENT_ID and MS_CLIENT_SECRET."
        )
    
    state = f"outlook_{uuid.uuid4().hex[:12]}"
    
    params = {
        "client_id": MS_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": MS_REDIRECT_URI,
        "scope": " ".join(MS_SCOPES),
        "state": state,
        "response_mode": "query"
    }
    
    auth_url = f"{MS_AUTH_URL}?{'&'.join(f'{k}={v}' for k, v in params.items())}"
    return {"auth_url": auth_url}

@router.get("/callback")
async def outlook_callback(code: str, state: str = None, request: Request = None):
    """Handle Outlook OAuth callback"""
    if not MS_CLIENT_ID or not MS_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Outlook not configured")
    
    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            MS_TOKEN_URL,
            data={
                "client_id": MS_CLIENT_ID,
                "client_secret": MS_CLIENT_SECRET,
                "code": code,
                "redirect_uri": MS_REDIRECT_URI,
                "grant_type": "authorization_code"
            }
        )
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get tokens")
        
        tokens = token_response.json()
    
    db = request.app.state.db
    
    # Get user info from Microsoft Graph
    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            f"{MS_GRAPH_API}/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )
        ms_user = user_response.json()
    
    # Store connection
    await db.outlook_connections.update_one(
        {"ms_email": ms_user.get("mail") or ms_user.get("userPrincipalName")},
        {"$set": {
            "ms_email": ms_user.get("mail") or ms_user.get("userPrincipalName"),
            "ms_user_id": ms_user.get("id"),
            "display_name": ms_user.get("displayName"),
            "access_token": tokens.get("access_token"),
            "refresh_token": tokens.get("refresh_token"),
            "token_expiry": (datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))).isoformat(),
            "connected_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    return RedirectResponse(f"{frontend_url}/settings?outlook=connected")

@router.get("/events")
async def get_outlook_events(
    user_id: str,
    start_date: str = None,
    end_date: str = None,
    request: Request = None
):
    """Get calendar events from Outlook"""
    db = request.app.state.db
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    connection = await db.outlook_connections.find_one(
        {"ms_email": user.get("email")},
        {"_id": 0}
    )
    
    if not connection:
        raise HTTPException(status_code=404, detail="Outlook not connected")
    
    access_token = await refresh_outlook_token_if_needed(db, connection)
    
    # Default to current week
    if not start_date:
        start_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    if not end_date:
        end_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{MS_GRAPH_API}/me/calendarview",
            headers={"Authorization": f"Bearer {access_token}"},
            params={
                "startdatetime": start_date,
                "enddatetime": end_date,
                "$orderby": "start/dateTime",
                "$top": 50
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to fetch events")
        
        data = response.json()
    
    events = []
    for item in data.get("value", []):
        events.append({
            "id": item.get("id"),
            "subject": item.get("subject"),
            "body": item.get("bodyPreview"),
            "start": item.get("start", {}).get("dateTime"),
            "end": item.get("end", {}).get("dateTime"),
            "location": item.get("location", {}).get("displayName"),
            "is_online_meeting": item.get("isOnlineMeeting"),
            "web_link": item.get("webLink")
        })
    
    return {"events": events, "count": len(events)}

@router.post("/events")
async def create_outlook_event(
    event: OutlookEvent,
    user_id: str,
    request: Request = None
):
    """Create an event in Outlook Calendar"""
    db = request.app.state.db
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    connection = await db.outlook_connections.find_one(
        {"ms_email": user.get("email")},
        {"_id": 0}
    )
    
    if not connection:
        raise HTTPException(status_code=404, detail="Outlook not connected")
    
    access_token = await refresh_outlook_token_if_needed(db, connection)
    
    # Build event payload
    event_body = {
        "subject": event.subject,
        "body": {
            "contentType": "HTML",
            "content": event.body or ""
        },
        "start": {
            "dateTime": event.start_time,
            "timeZone": "UTC"
        },
        "end": {
            "dateTime": event.end_time,
            "timeZone": "UTC"
        },
        "isOnlineMeeting": event.is_online_meeting
    }
    
    if event.attendees:
        event_body["attendees"] = [
            {"emailAddress": {"address": email}, "type": "required"}
            for email in event.attendees
        ]
    
    if event.location:
        event_body["location"] = {"displayName": event.location}
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{MS_GRAPH_API}/me/events",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json=event_body
        )
        
        if response.status_code not in [200, 201]:
            raise HTTPException(status_code=500, detail="Failed to create event")
        
        created_event = response.json()
    
    return {
        "event_id": created_event.get("id"),
        "web_link": created_event.get("webLink"),
        "status": "created"
    }

@router.post("/sync-time-entry")
async def sync_time_entry_to_outlook(
    data: SyncTimeEntryRequest,
    user_id: str,
    request: Request = None
):
    """Sync a time entry to Outlook Calendar"""
    db = request.app.state.db
    
    time_entry = await db.time_entries.find_one(
        {"entry_id": data.time_entry_id},
        {"_id": 0}
    )
    
    if not time_entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    event = OutlookEvent(
        subject=f"Work: {data.project_name or 'Time Entry'}",
        body=data.description or f"Time tracked via WorkMonitor\nEntry ID: {data.time_entry_id}",
        start_time=time_entry["start_time"],
        end_time=time_entry.get("end_time") or datetime.now(timezone.utc).isoformat()
    )
    
    return await create_outlook_event(event, user_id, request)

@router.delete("/disconnect")
async def disconnect_outlook(user_id: str, request: Request = None):
    """Disconnect Outlook Calendar"""
    db = request.app.state.db
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.outlook_connections.delete_one({"ms_email": user.get("email")})
    
    return {"status": "disconnected"}

@router.get("/status")
async def get_outlook_status(user_id: str, request: Request = None):
    """Check Outlook connection status"""
    db = request.app.state.db
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    connection = await db.outlook_connections.find_one(
        {"ms_email": user.get("email")},
        {"_id": 0, "access_token": 0, "refresh_token": 0}
    )
    
    if not connection:
        return {"connected": False}
    
    return {
        "connected": True,
        "ms_email": connection.get("ms_email"),
        "display_name": connection.get("display_name"),
        "connected_at": connection.get("connected_at")
    }

async def refresh_outlook_token_if_needed(db, connection):
    """Refresh Outlook access token if expired"""
    token_expiry = datetime.fromisoformat(connection.get("token_expiry", "2000-01-01T00:00:00+00:00").replace('Z', '+00:00'))
    
    if datetime.now(timezone.utc) < token_expiry - timedelta(minutes=5):
        return connection["access_token"]
    
    if not connection.get("refresh_token"):
        raise HTTPException(status_code=401, detail="Outlook authorization expired. Please reconnect.")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            MS_TOKEN_URL,
            data={
                "client_id": MS_CLIENT_ID,
                "client_secret": MS_CLIENT_SECRET,
                "refresh_token": connection["refresh_token"],
                "grant_type": "refresh_token"
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Failed to refresh token. Please reconnect.")
        
        tokens = response.json()
    
    await db.outlook_connections.update_one(
        {"ms_email": connection["ms_email"]},
        {"$set": {
            "access_token": tokens["access_token"],
            "refresh_token": tokens.get("refresh_token", connection["refresh_token"]),
            "token_expiry": (datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))).isoformat()
        }}
    )
    
    return tokens["access_token"]

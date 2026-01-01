"""
Team Chat & AI Support Chatbot
==============================
Real-time team messaging with AI-powered support
"""

from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid
import os
import json
import logging

# Import LLM for AI chatbot
from emergentintegrations.llm.chat import LlmChat, UserMessage

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class SendMessageRequest(BaseModel):
    channel_id: str
    content: str
    reply_to: Optional[str] = None
    attachments: Optional[List[dict]] = None

class CreateChannelRequest(BaseModel):
    name: str
    channel_type: str = "team"  # team, direct, support
    company_id: Optional[str] = None
    members: Optional[List[str]] = None
    is_private: bool = False

class AIQueryRequest(BaseModel):
    query: str
    context: Optional[str] = None

# ==================== WEBSOCKET MANAGER ====================

class ChatConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}  # channel_id -> connections
        self.user_connections: Dict[str, WebSocket] = {}  # user_id -> connection
    
    async def connect(self, websocket: WebSocket, channel_id: str, user_id: str):
        await websocket.accept()
        if channel_id not in self.active_connections:
            self.active_connections[channel_id] = []
        self.active_connections[channel_id].append(websocket)
        self.user_connections[user_id] = websocket
    
    def disconnect(self, websocket: WebSocket, channel_id: str, user_id: str):
        if channel_id in self.active_connections:
            if websocket in self.active_connections[channel_id]:
                self.active_connections[channel_id].remove(websocket)
        if user_id in self.user_connections:
            del self.user_connections[user_id]
    
    async def broadcast_to_channel(self, channel_id: str, message: dict):
        if channel_id in self.active_connections:
            for connection in self.active_connections[channel_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass
    
    async def send_to_user(self, user_id: str, message: dict):
        if user_id in self.user_connections:
            try:
                await self.user_connections[user_id].send_json(message)
            except:
                pass

chat_manager = ChatConnectionManager()

# ==================== AI CHATBOT ====================

AI_SYSTEM_PROMPT = """You are Working Tracker AI Assistant, an expert support chatbot for the Working Tracker employee time tracking and monitoring platform.

You have comprehensive knowledge about:

1. **Time Tracking Features:**
   - Automatic time tracking with desktop app
   - Manual timer for quick entries
   - Timesheets and weekly reports
   - Idle and break detection
   - Activity level monitoring

2. **Monitoring Capabilities:**
   - Screenshot capture (configurable intervals)
   - App and website usage tracking
   - Video screenshots (Business plan)
   - Live monitoring (Business plan)
   - Silent/background tracking (Pro+)

3. **Project Management:**
   - Creating and managing projects
   - Task assignments and tracking
   - Project budgets and time estimates
   - Client access portals

4. **HR & Management:**
   - Attendance tracking with clock in/out
   - Leave management and approvals
   - Shift scheduling
   - Timesheet approvals workflow
   - Payroll generation
   - Invoice creation

5. **Analytics & Reports:**
   - Productivity metrics and scores
   - AI-powered time categorization
   - Unusual activity detection
   - Workforce analytics (Business plan)
   - Benchmarks and leaderboards
   - Work-life balance insights
   - Custom report builder

6. **Subscription Plans:**
   - Starter ($2.99/user/month): Basic tracking, limited screenshots
   - Pro ($4.99/user/month): Unlimited screenshots, HR features, payroll
   - Business ($6.99/user/month): Video screenshots, SSO, API, white-label

7. **Integrations:**
   - Google Calendar sync
   - Outlook Calendar (coming soon)
   - SAML SSO for enterprise
   - API and webhooks
   - Browser extensions

8. **Desktop & Mobile Apps:**
   - Windows, macOS, Linux desktop tracker
   - iOS and Android mobile apps
   - Chrome, Firefox, Edge browser extensions

9. **Troubleshooting Common Issues:**
   - Screenshot not capturing: Check permissions
   - Timer not syncing: Check internet connection
   - Activity not recording: Verify tracker is running
   - Login issues: Clear cache, reset password

Always be helpful, concise, and professional. If you don't know something, suggest contacting support at support@workingtracker.com.
"""

async def get_ai_response(query: str, context: str = None) -> str:
    """Get AI response for user query"""
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        return "AI support is currently unavailable. Please contact support@workingtracker.com for assistance."
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"support-{uuid.uuid4().hex[:8]}",
            system_message=AI_SYSTEM_PROMPT
        ).with_model("openai", "gpt-5.2")
        
        full_query = query
        if context:
            full_query = f"Context: {context}\n\nUser Question: {query}"
        
        response = await chat.send_message(UserMessage(text=full_query))
        return response
        
    except Exception as e:
        logger.error(f"AI chatbot error: {str(e)}")
        return "I'm having trouble processing your request. Please try again or contact support@workingtracker.com."

# ==================== API ENDPOINTS ====================

@router.post("/channels")
async def create_channel(data: CreateChannelRequest, request: Request):
    """Create a new chat channel"""
    db = request.app.state.db
    
    channel_id = f"ch_{uuid.uuid4().hex[:12]}"
    
    channel = {
        "channel_id": channel_id,
        "name": data.name,
        "type": data.channel_type,
        "members": data.members or [],
        "is_private": data.is_private,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_message_at": None
    }
    
    # Store company_id if provided in the request
    if hasattr(data, 'company_id') and data.company_id:
        channel["company_id"] = data.company_id
    
    await db.chat_channels.insert_one(channel)
    
    return {"channel_id": channel_id, "name": data.name}

@router.get("/channels")
async def get_channels(company_id: str, request: Request):
    """Get all channels for a company"""
    db = request.app.state.db
    
    # Get team channels
    channels = await db.chat_channels.find(
        {"company_id": company_id},
        {"_id": 0}
    ).to_list(100)
    
    # Add default support channel if not exists
    support_channel = await db.chat_channels.find_one(
        {"company_id": company_id, "type": "support"},
        {"_id": 0}
    )
    
    if not support_channel:
        support_channel = {
            "channel_id": f"ch_support_{company_id[:8]}",
            "name": "AI Support",
            "type": "support",
            "company_id": company_id,
            "is_ai": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_channels.insert_one(support_channel)
        # Remove _id from the dict before returning
        support_channel_clean = {k: v for k, v in support_channel.items() if k != '_id'}
        channels.append(support_channel_clean)
    
    return {"channels": channels}

@router.get("/channels/{channel_id}/messages")
async def get_channel_messages(
    channel_id: str,
    limit: int = 50,
    before: str = None,
    request: Request = None
):
    """Get messages from a channel"""
    db = request.app.state.db
    
    query = {"channel_id": channel_id}
    if before:
        query["created_at"] = {"$lt": before}
    
    messages = await db.chat_messages.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Reverse to get chronological order
    messages.reverse()
    
    return {"messages": messages}

@router.post("/messages")
async def send_message(data: SendMessageRequest, request: Request):
    """Send a message to a channel"""
    db = request.app.state.db
    
    # Get user from auth
    auth_header = request.headers.get('Authorization', '')
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    
    message = {
        "message_id": message_id,
        "channel_id": data.channel_id,
        "content": data.content,
        "reply_to": data.reply_to,
        "attachments": data.attachments,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_messages.insert_one(message)
    
    # Update channel last message time
    await db.chat_channels.update_one(
        {"channel_id": data.channel_id},
        {"$set": {"last_message_at": message["created_at"]}}
    )
    
    # Broadcast to channel
    await chat_manager.broadcast_to_channel(data.channel_id, {
        "type": "new_message",
        "message": message
    })
    
    return {"message_id": message_id, "status": "sent"}

@router.post("/ai/query")
async def query_ai_chatbot(data: AIQueryRequest, request: Request):
    """Query the AI support chatbot"""
    response = await get_ai_response(data.query, data.context)
    
    # Store the conversation
    db = request.app.state.db
    
    conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
    
    await db.ai_conversations.insert_one({
        "conversation_id": conversation_id,
        "query": data.query,
        "context": data.context,
        "response": response,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "response": response,
        "conversation_id": conversation_id
    }

@router.websocket("/ws/{channel_id}/{user_id}")
async def chat_websocket(websocket: WebSocket, channel_id: str, user_id: str):
    """WebSocket endpoint for real-time chat"""
    await chat_manager.connect(websocket, channel_id, user_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "message":
                # Handle new message
                message = {
                    "message_id": f"msg_{uuid.uuid4().hex[:12]}",
                    "channel_id": channel_id,
                    "user_id": user_id,
                    "content": data.get("content"),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await chat_manager.broadcast_to_channel(channel_id, {
                    "type": "new_message",
                    "message": message
                })
                
            elif data.get("type") == "typing":
                # Broadcast typing indicator
                await chat_manager.broadcast_to_channel(channel_id, {
                    "type": "typing",
                    "user_id": user_id
                })
                
            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        chat_manager.disconnect(websocket, channel_id, user_id)

@router.delete("/messages/{message_id}")
async def delete_message(message_id: str, request: Request):
    """Delete a message"""
    db = request.app.state.db
    
    result = await db.chat_messages.update_one(
        {"message_id": message_id},
        {"$set": {
            "deleted": True,
            "deleted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"status": "deleted", "message_id": message_id}

@router.put("/messages/{message_id}")
async def edit_message(message_id: str, content: str, request: Request):
    """Edit a message"""
    db = request.app.state.db
    
    result = await db.chat_messages.update_one(
        {"message_id": message_id},
        {"$set": {
            "content": content,
            "edited": True,
            "edited_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"status": "edited", "message_id": message_id}

@router.post("/channels/{channel_id}/members")
async def add_channel_member(channel_id: str, user_id: str, request: Request):
    """Add a member to a channel"""
    db = request.app.state.db
    
    result = await db.chat_channels.update_one(
        {"channel_id": channel_id},
        {"$addToSet": {"members": user_id}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    return {"status": "added", "channel_id": channel_id, "user_id": user_id}

@router.delete("/channels/{channel_id}/members/{user_id}")
async def remove_channel_member(channel_id: str, user_id: str, request: Request):
    """Remove a member from a channel"""
    db = request.app.state.db
    
    result = await db.chat_channels.update_one(
        {"channel_id": channel_id},
        {"$pull": {"members": user_id}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    return {"status": "removed", "channel_id": channel_id, "user_id": user_id}

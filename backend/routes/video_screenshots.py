"""
Video Screenshots Feature
=========================
Provides video screenshot recording for Business tier users.
Short video clips instead of static screenshots for better context.
"""

from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import os

router = APIRouter(prefix="/video-screenshots", tags=["video-screenshots"])

class VideoScreenshotCreate(BaseModel):
    time_entry_id: Optional[str] = None
    duration_seconds: int = 30  # Default 30 second clips
    app_name: Optional[str] = None
    window_title: Optional[str] = None
    s3_url: Optional[str] = None

class VideoScreenshotSettings(BaseModel):
    enabled: bool = False
    duration_seconds: int = 30  # 10-60 seconds
    interval_minutes: int = 10  # How often to capture
    quality: str = "medium"  # low, medium, high
    include_audio: bool = False
    blur_sensitive: bool = True

@router.get("/settings/{company_id}")
async def get_video_settings(company_id: str, request: Request):
    """Get company video screenshot settings"""
    db = request.app.state.db
    
    # Check Business tier
    subscription = await db.subscriptions.find_one(
        {"company_id": company_id},
        {"_id": 0}
    )
    
    plan = subscription.get("plan") if subscription else "starter"
    if plan != "business":
        return {
            "enabled": False,
            "feature_available": False,
            "required_plan": "Business",
            "message": "Video screenshots require the Business plan"
        }
    
    settings = await db.video_screenshot_settings.find_one(
        {"company_id": company_id},
        {"_id": 0}
    )
    
    if not settings:
        return {
            "enabled": False,
            "feature_available": True,
            "duration_seconds": 30,
            "interval_minutes": 10,
            "quality": "medium",
            "include_audio": False,
            "blur_sensitive": True
        }
    
    return {**settings, "feature_available": True}

@router.post("/settings/{company_id}")
async def update_video_settings(
    company_id: str,
    settings: VideoScreenshotSettings,
    request: Request
):
    """Update video screenshot settings (Business tier only)"""
    db = request.app.state.db
    
    # Check Business tier
    subscription = await db.subscriptions.find_one(
        {"company_id": company_id},
        {"_id": 0}
    )
    
    plan = subscription.get("plan") if subscription else "starter"
    if plan != "business":
        raise HTTPException(
            status_code=403,
            detail={
                "error": "feature_not_available",
                "feature": "video_screenshots",
                "required_plan": "Business",
                "message": "Video screenshots require the Business plan."
            }
        )
    
    # Validate settings
    if settings.duration_seconds < 10 or settings.duration_seconds > 60:
        raise HTTPException(status_code=400, detail="Duration must be between 10-60 seconds")
    if settings.interval_minutes < 5 or settings.interval_minutes > 60:
        raise HTTPException(status_code=400, detail="Interval must be between 5-60 minutes")
    if settings.quality not in ["low", "medium", "high"]:
        raise HTTPException(status_code=400, detail="Quality must be low, medium, or high")
    
    doc = {
        "company_id": company_id,
        **settings.dict(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.video_screenshot_settings.update_one(
        {"company_id": company_id},
        {"$set": doc},
        upsert=True
    )
    
    return {"status": "updated", "settings": doc}

@router.post("/capture")
async def create_video_screenshot(
    video: VideoScreenshotCreate,
    request: Request
):
    """Create a new video screenshot record"""
    db = request.app.state.db
    
    video_id = f"video_{uuid.uuid4().hex[:12]}"
    
    doc = {
        "video_id": video_id,
        "time_entry_id": video.time_entry_id,
        "duration_seconds": video.duration_seconds,
        "app_name": video.app_name,
        "window_title": video.window_title,
        "s3_url": video.s3_url,
        "status": "pending" if not video.s3_url else "uploaded",
        "captured_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.video_screenshots.insert_one(doc)
    
    return {"video_id": video_id, "status": doc["status"]}

@router.post("/upload/{video_id}")
async def upload_video(
    video_id: str,
    request: Request,
    file: UploadFile = File(...)
):
    """Upload video file for a screenshot record"""
    db = request.app.state.db
    
    # Validate file type
    allowed_types = ["video/mp4", "video/webm", "video/quicktime"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid video format. Use MP4, WebM, or MOV")
    
    # Validate file size (max 50MB)
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB")
    
    # In production, upload to S3 here
    # For now, we'll store a reference
    
    await db.video_screenshots.update_one(
        {"video_id": video_id},
        {"$set": {
            "status": "uploaded",
            "file_size": len(content),
            "content_type": file.content_type,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"status": "uploaded", "video_id": video_id, "file_size": len(content)}

@router.get("/list")
async def list_video_screenshots(
    request: Request,
    user_id: Optional[str] = None,
    time_entry_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 50
):
    """List video screenshots with filters"""
    db = request.app.state.db
    
    query = {}
    
    if user_id:
        query["user_id"] = user_id
    if time_entry_id:
        query["time_entry_id"] = time_entry_id
    if start_date:
        query["captured_at"] = {"$gte": start_date}
    if end_date:
        if "captured_at" in query:
            query["captured_at"]["$lte"] = end_date
        else:
            query["captured_at"] = {"$lte": end_date}
    
    videos = await db.video_screenshots.find(
        query,
        {"_id": 0}
    ).sort("captured_at", -1).limit(limit).to_list(limit)
    
    return {"videos": videos, "count": len(videos)}

@router.get("/{video_id}")
async def get_video_screenshot(video_id: str, request: Request):
    """Get a specific video screenshot"""
    db = request.app.state.db
    
    video = await db.video_screenshots.find_one(
        {"video_id": video_id},
        {"_id": 0}
    )
    
    if not video:
        raise HTTPException(status_code=404, detail="Video screenshot not found")
    
    return video

@router.delete("/{video_id}")
async def delete_video_screenshot(video_id: str, request: Request):
    """Delete a video screenshot"""
    db = request.app.state.db
    
    result = await db.video_screenshots.delete_one({"video_id": video_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video screenshot not found")
    
    return {"status": "deleted", "video_id": video_id}

@router.get("/stats/{company_id}")
async def get_video_stats(company_id: str, request: Request):
    """Get video screenshot statistics for a company"""
    db = request.app.state.db
    
    # Count videos
    total_count = await db.video_screenshots.count_documents({"company_id": company_id})
    
    # Calculate total duration
    pipeline = [
        {"$match": {"company_id": company_id}},
        {"$group": {
            "_id": None,
            "total_duration": {"$sum": "$duration_seconds"},
            "total_size": {"$sum": "$file_size"}
        }}
    ]
    
    stats = await db.video_screenshots.aggregate(pipeline).to_list(1)
    
    return {
        "total_videos": total_count,
        "total_duration_seconds": stats[0]["total_duration"] if stats else 0,
        "total_size_bytes": stats[0]["total_size"] if stats else 0,
        "total_size_mb": round((stats[0]["total_size"] if stats else 0) / (1024 * 1024), 2)
    }

"""
Screen Recordings Routes
Handles 30-second screen recordings (Business plan only)
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from utils.id_generator import generate_id
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class ScreenRecordingCreate(BaseModel):
    entry_id: Optional[str] = None
    recording_url: str
    duration: int = 30
    file_size: Optional[int] = None
    thumbnail_url: Optional[str] = None
    metadata: Optional[dict] = None


@router.post("")
async def create_recording(data: ScreenRecordingCreate, request: Request, user: dict):
    """Create a new screen recording entry"""
    from db import SupabaseDB
    from utils.consent_checker import ConsentChecker

    db = SupabaseDB.get_db()

    try:
        # Check screen recording consent (Business plan + full-time + consent)
        consent_result = await ConsentChecker.check_screen_recording_consent(db, user["user_id"], user["company_id"])

        if not consent_result["has_consent"]:
            raise HTTPException(
                status_code=403,
                detail=f"Screen recording not allowed: {consent_result['reason']}"
            )

        recording_id = generate_id("recording")

        recording_doc = {
            "recording_id": recording_id,
            "company_id": user["company_id"],
            "user_id": user["user_id"],
            "entry_id": data.entry_id,
            "recording_url": data.recording_url,
            "duration": data.duration,
            "file_size": data.file_size,
            "thumbnail_url": data.thumbnail_url,
            "metadata": data.metadata or {},
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        await db.screen_recordings.insert_one(recording_doc)

        # Create activity history entry
        from routes.activity_history import create_activity_entry
        await create_activity_entry(
            db=db,
            company_id=user["company_id"],
            user_id=user["user_id"],
            entry_id=data.entry_id,
            activity_type="recording_captured",
            description=f"Screen recording captured ({data.duration}s)",
            metadata={"recording_id": recording_id}
        )

        # Notify manager
        manager_assignment = await db.manager_assignments.find_one({
            "employee_id": user["user_id"],
            "active": True
        })

        if manager_assignment:
            from routes.notifications import create_notification
            await create_notification(
                db=db,
                company_id=user["company_id"],
                user_id=manager_assignment["manager_id"],
                notification_type="recording_captured",
                title="Screen Recording Captured",
                message=f"{user.get('name', 'Employee')} - {data.duration}s recording",
                data={"recording_id": recording_id, "employee_id": user["user_id"]},
                priority="low"
            )

        return {"success": True, "recording_id": recording_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating screen recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def get_recordings(
    request: Request,
    user: dict,
    employee_id: Optional[str] = None,
    entry_id: Optional[str] = None,
    limit: int = 50
):
    """Get screen recordings"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        query = {"company_id": user["company_id"]}

        # Role-based filtering
        if user["role"] == "employee":
            # Employees see their own recordings
            query["user_id"] = user["user_id"]
        elif user["role"] == "manager":
            # Managers see their assigned employees' recordings
            if employee_id:
                # Check if manager is assigned to this employee
                assignment = await db.manager_assignments.find_one({
                    "manager_id": user["user_id"],
                    "employee_id": employee_id,
                    "active": True
                })
                if not assignment:
                    raise HTTPException(status_code=403, detail="Access denied")
                query["user_id"] = employee_id
            else:
                # Get all assigned employees
                assigned_employees = await db.manager_assignments.find({
                    "manager_id": user["user_id"],
                    "active": True
                })
                employee_ids = [a["employee_id"] for a in assigned_employees]
                query["user_id"] = {"$in": employee_ids}
        else:
            # Admins see all company recordings
            if employee_id:
                query["user_id"] = employee_id

        # Filter by entry_id if specified
        if entry_id:
            query["entry_id"] = entry_id

        recordings = await db.screen_recordings.find(
            query,
            sort=[("created_at", -1)],
            limit=limit
        )

        # Enrich with user names
        for recording in recordings:
            employee = await db.users.find_one({"user_id": recording["user_id"]})
            recording["user_name"] = employee.get("name", "Unknown") if employee else "Unknown"

        return {"success": True, "data": recordings}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching screen recordings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{recording_id}")
async def get_recording(recording_id: str, request: Request, user: dict):
    """Get a specific screen recording"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        recording = await db.screen_recordings.find_one({"recording_id": recording_id})

        if not recording:
            raise HTTPException(status_code=404, detail="Recording not found")

        # Check access permissions
        has_access = False
        if user["role"] in ["admin", "hr"]:
            has_access = recording["company_id"] == user["company_id"]
        elif user["role"] == "manager":
            # Check if manager is assigned to employee
            assignment = await db.manager_assignments.find_one({
                "manager_id": user["user_id"],
                "employee_id": recording["user_id"],
                "active": True
            })
            has_access = assignment is not None
        elif user["user_id"] == recording["user_id"]:
            has_access = True

        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get user name
        employee = await db.users.find_one({"user_id": recording["user_id"]})
        recording["user_name"] = employee.get("name", "Unknown") if employee else "Unknown"

        return {"success": True, "data": recording}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{recording_id}")
async def delete_recording(recording_id: str, request: Request, user: dict):
    """Delete a screen recording (admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        if user["role"] not in ["admin", "hr"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        recording = await db.screen_recordings.find_one({"recording_id": recording_id})

        if not recording:
            raise HTTPException(status_code=404, detail="Recording not found")

        if recording["company_id"] != user["company_id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        await db.screen_recordings.delete_one({"recording_id": recording_id})

        return {"success": True, "message": "Recording deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))

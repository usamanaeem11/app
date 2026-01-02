"""
Notifications Routes
Handles user notifications for screenshots, recordings, submissions, etc.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from utils.id_generator import generate_id
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class NotificationMarkRead(BaseModel):
    notification_ids: list[str]


async def create_notification(
    db,
    company_id: str,
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    data: Optional[dict] = None,
    priority: str = "normal"
):
    """Helper function to create a notification"""
    try:
        notification_id = generate_id("notification")

        notification_doc = {
            "notification_id": notification_id,
            "company_id": company_id,
            "user_id": user_id,
            "notification_type": notification_type,
            "title": title,
            "message": message,
            "data": data or {},
            "read": False,
            "priority": priority,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        await db.notifications.insert_one(notification_doc)
        logger.info(f"Created notification {notification_id} for user {user_id}")

        return notification_id

    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        return None


@router.get("")
async def get_notifications(request: Request, user: dict, unread_only: Optional[bool] = False):
    """Get user notifications"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        query = {
            "user_id": user["user_id"],
            "company_id": user["company_id"]
        }

        if unread_only:
            query["read"] = False

        notifications = await db.notifications.find(query, sort=[("created_at", -1)], limit=100)

        return {"success": True, "data": notifications}

    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unread-count")
async def get_unread_count(request: Request, user: dict):
    """Get count of unread notifications"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        count = await db.notifications.count({
            "user_id": user["user_id"],
            "company_id": user["company_id"],
            "read": False
        })

        return {"success": True, "count": count}

    except Exception as e:
        logger.error(f"Error fetching unread count: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/mark-read")
async def mark_notifications_read(data: NotificationMarkRead, request: Request, user: dict):
    """Mark notifications as read"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        # Update all specified notifications
        await db.notifications.update_many(
            {
                "notification_id": {"$in": data.notification_ids},
                "user_id": user["user_id"]
            },
            {
                "$set": {
                    "read": True,
                    "read_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

        return {"success": True, "message": "Notifications marked as read"}

    except Exception as e:
        logger.error(f"Error marking notifications as read: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/mark-all-read")
async def mark_all_notifications_read(request: Request, user: dict):
    """Mark all notifications as read"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        await db.notifications.update_many(
            {
                "user_id": user["user_id"],
                "company_id": user["company_id"],
                "read": False
            },
            {
                "$set": {
                    "read": True,
                    "read_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

        return {"success": True, "message": "All notifications marked as read"}

    except Exception as e:
        logger.error(f"Error marking all notifications as read: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, request: Request, user: dict):
    """Delete a notification"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        result = await db.notifications.delete_one({
            "notification_id": notification_id,
            "user_id": user["user_id"]
        })

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")

        return {"success": True, "message": "Notification deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

"""
Activity History Routes
Tracks employee activity for manager/admin viewing
"""
from fastapi import APIRouter, HTTPException, Request
from typing import Optional
from datetime import datetime, timezone
from utils.id_generator import generate_id
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


async def create_activity_entry(
    db,
    company_id: str,
    user_id: str,
    activity_type: str,
    description: str,
    entry_id: Optional[str] = None,
    metadata: Optional[dict] = None
):
    """Helper function to create an activity history entry"""
    try:
        history_id = generate_id("history")

        activity_doc = {
            "history_id": history_id,
            "company_id": company_id,
            "user_id": user_id,
            "entry_id": entry_id,
            "activity_type": activity_type,
            "description": description,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        await db.activity_history.insert_one(activity_doc)
        logger.info(f"Created activity history entry {history_id} for user {user_id}")

        return history_id

    except Exception as e:
        logger.error(f"Error creating activity entry: {e}")
        return None


@router.get("")
async def get_activity_history(
    request: Request,
    user: dict,
    employee_id: Optional[str] = None,
    activity_type: Optional[str] = None,
    limit: int = 100
):
    """Get activity history (manager/admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        query = {"company_id": user["company_id"]}

        # Role-based filtering
        if user["role"] == "employee":
            # Employees see their own activity
            query["user_id"] = user["user_id"]
        elif user["role"] == "manager":
            # Managers see their assigned employees' activity
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
                employee_ids.append(user["user_id"])  # Include manager's own activity
                query["user_id"] = {"$in": employee_ids}
        else:
            # Admins see all company activity
            if employee_id:
                query["user_id"] = employee_id

        # Filter by activity type if specified
        if activity_type:
            query["activity_type"] = activity_type

        activities = await db.activity_history.find(
            query,
            sort=[("created_at", -1)],
            limit=limit
        )

        # Enrich with user names
        for activity in activities:
            employee = await db.users.find_one({"user_id": activity["user_id"]})
            activity["user_name"] = employee.get("name", "Unknown") if employee else "Unknown"

        return {"success": True, "data": activities}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching activity history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/employee/{employee_id}")
async def get_employee_activity(employee_id: str, request: Request, user: dict, limit: int = 50):
    """Get activity history for a specific employee (manager/admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        # Check permissions
        has_access = False
        if user["role"] in ["admin", "hr"]:
            # Check if employee is in same company
            employee = await db.users.find_one({"user_id": employee_id})
            has_access = employee and employee["company_id"] == user["company_id"]
        elif user["role"] == "manager":
            # Check if manager is assigned to employee
            assignment = await db.manager_assignments.find_one({
                "manager_id": user["user_id"],
                "employee_id": employee_id,
                "active": True
            })
            has_access = assignment is not None
        elif user["user_id"] == employee_id:
            has_access = True

        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")

        activities = await db.activity_history.find(
            {
                "user_id": employee_id,
                "company_id": user["company_id"]
            },
            sort=[("created_at", -1)],
            limit=limit
        )

        # Get employee info
        employee = await db.users.find_one({"user_id": employee_id})
        employee_name = employee.get("name", "Unknown") if employee else "Unknown"

        return {
            "success": True,
            "employee_id": employee_id,
            "employee_name": employee_name,
            "data": activities
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching employee activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_activity_stats(request: Request, user: dict):
    """Get activity statistics (manager/admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        query = {"company_id": user["company_id"]}

        # Role-based filtering
        if user["role"] == "manager":
            assigned_employees = await db.manager_assignments.find({
                "manager_id": user["user_id"],
                "active": True
            })
            employee_ids = [a["employee_id"] for a in assigned_employees]
            query["user_id"] = {"$in": employee_ids}
        elif user["role"] == "employee":
            raise HTTPException(status_code=403, detail="Access denied")

        # Count by activity type
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": "$activity_type",
                "count": {"$sum": 1}
            }}
        ]

        stats = await db.activity_history.aggregate(pipeline)

        return {"success": True, "data": stats}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching activity stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

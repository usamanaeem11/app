"""
Scheduled Timers Routes
Handles automatic timer scheduling for employees
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, time
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/scheduled-timers", tags=["Scheduled Timers"])


class ScheduledTimerCreate(BaseModel):
    employee_id: str
    agreement_id: Optional[str] = None
    project_id: Optional[str] = None
    schedule_type: str = "daily"  # once, daily, weekly, monthly
    start_time: str  # HH:MM format
    end_time: Optional[str] = None  # HH:MM format
    days_of_week: List[int] = []  # 0=Monday, 6=Sunday
    timezone: str = "UTC"
    auto_start_enabled: bool = True
    auto_stop_enabled: bool = False
    notes: Optional[str] = None


class ScheduledTimerUpdate(BaseModel):
    schedule_type: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    days_of_week: Optional[List[int]] = None
    timezone: Optional[str] = None
    auto_start_enabled: Optional[bool] = None
    auto_stop_enabled: Optional[bool] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


async def get_current_user(request):
    """Get current user from request - placeholder"""
    return request.state.user if hasattr(request.state, 'user') else None


@router.post("")
async def create_scheduled_timer(
    data: ScheduledTimerCreate,
    request,
    user: dict = Depends(get_current_user)
):
    """
    Create a scheduled timer (Admin/Manager only, Full-time employees only)
    """
    from utils.id_generator import generate_id
    from utils.consent_checker import ConsentChecker

    if user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only admins and managers can create scheduled timers")

    db = request.app.state.db

    # Check if employee exists
    employee = await db.users.find_one({
        "user_id": data.employee_id,
        "company_id": user["company_id"]
    })
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check employment type - only full-time employees can have scheduled timers
    employment_type = employee.get("employment_type", "freelancer")
    if employment_type != "full_time":
        raise HTTPException(
            status_code=403,
            detail="Scheduled timers are only available for full-time employees. This employee is a freelancer."
        )

    # Check if employee has given consent for auto timers
    consent_result = await ConsentChecker.check_auto_timer_consent(db, data.employee_id)
    if not consent_result["has_consent"]:
        raise HTTPException(
            status_code=403,
            detail=f"Employee has not given consent for automatic timers. Reason: {consent_result['reason']}"
        )

    # Check if manager is assigned to employee
    if user["role"] == "manager":
        assignment = await db.manager_assignments.find_one({
            "manager_id": user["user_id"],
            "employee_id": data.employee_id
        })
        if not assignment:
            raise HTTPException(status_code=403, detail="You are not assigned to this employee")

    # Validate agreement if provided
    if data.agreement_id:
        agreement = await db.work_agreements.find_one({
            "agreement_id": data.agreement_id,
            "employee_id": data.employee_id,
            "status": "active"
        })
        if not agreement:
            raise HTTPException(status_code=404, detail="Active agreement not found")

    # Validate project if provided
    if data.project_id:
        project = await db.projects.find_one({
            "project_id": data.project_id,
            "company_id": user["company_id"]
        })
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    # Create scheduled timer
    schedule_id = generate_id("schedule")
    schedule_doc = {
        "schedule_id": schedule_id,
        "company_id": user["company_id"],
        "employee_id": data.employee_id,
        "agreement_id": data.agreement_id,
        "project_id": data.project_id,
        "schedule_type": data.schedule_type,
        "start_time": data.start_time,
        "end_time": data.end_time,
        "days_of_week": data.days_of_week,
        "timezone": data.timezone,
        "is_active": True,
        "auto_start_enabled": data.auto_start_enabled,
        "auto_stop_enabled": data.auto_stop_enabled,
        "notes": data.notes,
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.scheduled_timers.insert_one(schedule_doc)

    logger.info(f"Scheduled timer {schedule_id} created for employee {data.employee_id}")

    return {
        "schedule_id": schedule_id,
        "message": "Scheduled timer created successfully"
    }


@router.get("")
async def get_scheduled_timers(
    request,
    user: dict = Depends(get_current_user),
    employee_id: Optional[str] = None,
    is_active: Optional[bool] = None
):
    """
    Get scheduled timers
    - Admins/Managers see all timers in company
    - Employees see only their timers
    """
    db = request.app.state.db

    query = {"company_id": user["company_id"]}

    # Filter by role
    if user["role"] == "employee":
        query["employee_id"] = user["user_id"]
    elif user["role"] == "manager":
        # Get assigned employees
        assignments = await db.manager_assignments.find({
            "manager_id": user["user_id"]
        })
        assigned_employee_ids = [a["employee_id"] for a in assignments]
        query["employee_id"] = {"$in": assigned_employee_ids}

    # Filter by employee_id if provided
    if employee_id and user["role"] in ["admin", "manager"]:
        query["employee_id"] = employee_id

    # Filter by active status
    if is_active is not None:
        query["is_active"] = is_active

    timers = await db.scheduled_timers.find(query)

    # Enrich with user data
    enriched_timers = []
    for timer in timers:
        # Get employee info
        employee = await db.users.find_one(
            {"user_id": timer["employee_id"]},
            projection={"user_id": 1, "name": 1, "email": 1}
        )

        # Get agreement info if exists
        agreement = None
        if timer.get("agreement_id"):
            agreement = await db.work_agreements.find_one(
                {"agreement_id": timer["agreement_id"]},
                projection={"agreement_id": 1, "title": 1, "status": 1}
            )

        # Get project info if exists
        project = None
        if timer.get("project_id"):
            project = await db.projects.find_one(
                {"project_id": timer["project_id"]},
                projection={"project_id": 1, "name": 1, "status": 1}
            )

        enriched_timers.append({
            **timer,
            "employee": employee,
            "agreement": agreement,
            "project": project
        })

    return enriched_timers


@router.get("/{schedule_id}")
async def get_scheduled_timer(
    schedule_id: str,
    request,
    user: dict = Depends(get_current_user)
):
    """
    Get a specific scheduled timer
    """
    db = request.app.state.db

    timer = await db.scheduled_timers.find_one({
        "schedule_id": schedule_id
    })
    if not timer:
        raise HTTPException(status_code=404, detail="Scheduled timer not found")

    # Check permission
    if timer["company_id"] != user["company_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    if user["role"] == "employee" and timer["employee_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get employee info
    employee = await db.users.find_one(
        {"user_id": timer["employee_id"]},
        projection={"user_id": 1, "name": 1, "email": 1}
    )

    return {
        **timer,
        "employee": employee
    }


@router.put("/{schedule_id}")
async def update_scheduled_timer(
    schedule_id: str,
    data: ScheduledTimerUpdate,
    request,
    user: dict = Depends(get_current_user)
):
    """
    Update a scheduled timer (Admin/Manager only)
    """
    db = request.app.state.db

    timer = await db.scheduled_timers.find_one({
        "schedule_id": schedule_id
    })
    if not timer:
        raise HTTPException(status_code=404, detail="Scheduled timer not found")

    # Only creator or admin can update
    if user["role"] not in ["admin"] and timer["created_by"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Build update data
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}

    if data.schedule_type is not None:
        update_data["schedule_type"] = data.schedule_type
    if data.start_time is not None:
        update_data["start_time"] = data.start_time
    if data.end_time is not None:
        update_data["end_time"] = data.end_time
    if data.days_of_week is not None:
        update_data["days_of_week"] = data.days_of_week
    if data.timezone is not None:
        update_data["timezone"] = data.timezone
    if data.auto_start_enabled is not None:
        update_data["auto_start_enabled"] = data.auto_start_enabled
    if data.auto_stop_enabled is not None:
        update_data["auto_stop_enabled"] = data.auto_stop_enabled
    if data.is_active is not None:
        update_data["is_active"] = data.is_active
    if data.notes is not None:
        update_data["notes"] = data.notes

    await db.scheduled_timers.update_one(
        {"schedule_id": schedule_id},
        {"$set": update_data}
    )

    return {"message": "Scheduled timer updated successfully"}


@router.delete("/{schedule_id}")
async def delete_scheduled_timer(
    schedule_id: str,
    request,
    user: dict = Depends(get_current_user)
):
    """
    Delete a scheduled timer (Admin/Manager only)
    """
    db = request.app.state.db

    timer = await db.scheduled_timers.find_one({
        "schedule_id": schedule_id
    })
    if not timer:
        raise HTTPException(status_code=404, detail="Scheduled timer not found")

    # Only creator or admin can delete
    if user["role"] not in ["admin"] and timer["created_by"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.scheduled_timers.delete_one({"schedule_id": schedule_id})

    return {"message": "Scheduled timer deleted successfully"}


@router.get("/{schedule_id}/executions")
async def get_timer_executions(
    schedule_id: str,
    request,
    user: dict = Depends(get_current_user),
    limit: int = 50
):
    """
    Get execution history for a scheduled timer
    """
    db = request.app.state.db

    timer = await db.scheduled_timers.find_one({
        "schedule_id": schedule_id
    })
    if not timer:
        raise HTTPException(status_code=404, detail="Scheduled timer not found")

    # Check permission
    if timer["company_id"] != user["company_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    executions = await db.timer_execution_log.find(
        {"schedule_id": schedule_id},
        sort=[("scheduled_time", -1)],
        limit=limit
    )

    return executions

"""
Work Submissions Routes
Handles work submission and approval workflow
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from utils.id_generator import generate_id
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class WorkSubmissionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: Optional[str] = None
    task_id: Optional[str] = None
    time_entries: Optional[List[str]] = []
    total_hours: Optional[float] = 0
    attachments: Optional[dict] = None


class WorkSubmissionReview(BaseModel):
    status: str  # accepted, rejected, needs_improvement, under_consideration, assigned_to_admin
    review_notes: Optional[str] = None


@router.post("")
async def create_submission(data: WorkSubmissionCreate, request: Request, user: dict):
    """Create a new work submission"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        submission_id = generate_id("submission")

        # Get assigned manager (if any)
        manager_assignment = await db.manager_assignments.find_one({
            "employee_id": user["user_id"],
            "active": True
        })

        manager_id = manager_assignment.get("manager_id") if manager_assignment else None

        submission_doc = {
            "submission_id": submission_id,
            "company_id": user["company_id"],
            "employee_id": user["user_id"],
            "manager_id": manager_id,
            "project_id": data.project_id,
            "task_id": data.task_id,
            "title": data.title,
            "description": data.description,
            "time_entries": data.time_entries or [],
            "total_hours": data.total_hours or 0,
            "attachments": data.attachments,
            "status": "pending",
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        await db.work_submissions.insert_one(submission_doc)

        # Create activity history entry
        from routes.activity_history import create_activity_entry
        await create_activity_entry(
            db=db,
            company_id=user["company_id"],
            user_id=user["user_id"],
            activity_type="work_submitted",
            description=f"Submitted work: {data.title}",
            metadata={"submission_id": submission_id}
        )

        # Create notification for manager
        if manager_id:
            from routes.notifications import create_notification
            await create_notification(
                db=db,
                company_id=user["company_id"],
                user_id=manager_id,
                notification_type="work_submission",
                title="New Work Submission",
                message=f"{user.get('name', 'Employee')} submitted work: {data.title}",
                data={"submission_id": submission_id, "employee_id": user["user_id"]},
                priority="normal"
            )

        return {"success": True, "submission_id": submission_id, "data": submission_doc}

    except Exception as e:
        logger.error(f"Error creating work submission: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def get_submissions(request: Request, user: dict, status: Optional[str] = None):
    """Get work submissions (filtered by role)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        query = {"company_id": user["company_id"]}

        # Filter by status if provided
        if status:
            query["status"] = status

        # Role-based filtering
        if user["role"] == "employee":
            # Employees see their own submissions
            query["employee_id"] = user["user_id"]
        elif user["role"] == "manager":
            # Managers see their assigned employees' submissions
            assigned_employees = await db.manager_assignments.find({
                "manager_id": user["user_id"],
                "active": True
            })
            employee_ids = [a["employee_id"] for a in assigned_employees]
            employee_ids.append(user["user_id"])  # Include manager's own if they submit
            query["employee_id"] = {"$in": employee_ids}
        # Admins and HR see all company submissions (no additional filter)

        submissions = await db.work_submissions.find(query, sort=[("submitted_at", -1)])

        # Enrich with employee names
        for submission in submissions:
            employee = await db.users.find_one({"user_id": submission["employee_id"]})
            submission["employee_name"] = employee.get("name", "Unknown") if employee else "Unknown"

            if submission.get("manager_id"):
                manager = await db.users.find_one({"user_id": submission["manager_id"]})
                submission["manager_name"] = manager.get("name", "Unknown") if manager else "Unknown"

        return {"success": True, "data": submissions}

    except Exception as e:
        logger.error(f"Error fetching work submissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{submission_id}")
async def get_submission(submission_id: str, request: Request, user: dict):
    """Get a specific work submission"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        submission = await db.work_submissions.find_one({"submission_id": submission_id})

        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")

        # Check access permissions
        has_access = False
        if user["role"] in ["admin", "hr"]:
            has_access = submission["company_id"] == user["company_id"]
        elif user["role"] == "manager":
            # Check if manager is assigned to employee
            assignment = await db.manager_assignments.find_one({
                "manager_id": user["user_id"],
                "employee_id": submission["employee_id"],
                "active": True
            })
            has_access = assignment is not None
        elif user["user_id"] == submission["employee_id"]:
            has_access = True

        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")

        # Enrich with employee and manager names
        employee = await db.users.find_one({"user_id": submission["employee_id"]})
        submission["employee_name"] = employee.get("name", "Unknown") if employee else "Unknown"

        if submission.get("manager_id"):
            manager = await db.users.find_one({"user_id": submission["manager_id"]})
            submission["manager_name"] = manager.get("name", "Unknown") if manager else "Unknown"

        return {"success": True, "data": submission}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching submission: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{submission_id}/review")
async def review_submission(submission_id: str, data: WorkSubmissionReview, request: Request, user: dict):
    """Review and update submission status (manager/admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        # Validate status
        valid_statuses = ["accepted", "rejected", "needs_improvement", "under_consideration", "assigned_to_admin"]
        if data.status not in valid_statuses:
            raise HTTPException(status_code=400, detail="Invalid status")

        submission = await db.work_submissions.find_one({"submission_id": submission_id})

        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")

        # Check permissions
        can_review = False
        if user["role"] in ["admin", "hr"]:
            can_review = submission["company_id"] == user["company_id"]
        elif user["role"] == "manager":
            # Check if manager is assigned to employee
            assignment = await db.manager_assignments.find_one({
                "manager_id": user["user_id"],
                "employee_id": submission["employee_id"],
                "active": True
            })
            can_review = assignment is not None

        if not can_review:
            raise HTTPException(status_code=403, detail="You don't have permission to review this submission")

        # Update submission
        await db.work_submissions.update_one(
            {"submission_id": submission_id},
            {
                "$set": {
                    "status": data.status,
                    "review_notes": data.review_notes,
                    "reviewed_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

        # Create activity history entry
        from routes.activity_history import create_activity_entry
        await create_activity_entry(
            db=db,
            company_id=submission["company_id"],
            user_id=user["user_id"],
            activity_type="work_reviewed",
            description=f"Reviewed work submission: {submission['title']} - Status: {data.status}",
            metadata={"submission_id": submission_id, "status": data.status}
        )

        # Create notification for employee
        from routes.notifications import create_notification
        priority = "high" if data.status == "rejected" else "normal"
        await create_notification(
            db=db,
            company_id=submission["company_id"],
            user_id=submission["employee_id"],
            notification_type="work_reviewed",
            title=f"Work Submission {data.status.replace('_', ' ').title()}",
            message=f"Your submission '{submission['title']}' has been {data.status.replace('_', ' ')}",
            data={"submission_id": submission_id, "status": data.status},
            priority=priority
        )

        # If assigned to admin, notify admins
        if data.status == "assigned_to_admin":
            admins = await db.users.find({
                "company_id": submission["company_id"],
                "role": "admin"
            })
            for admin in admins:
                await create_notification(
                    db=db,
                    company_id=submission["company_id"],
                    user_id=admin["user_id"],
                    notification_type="work_submission",
                    title="Work Submission Assigned to Admin",
                    message=f"Manager assigned submission '{submission['title']}' for admin review",
                    data={"submission_id": submission_id},
                    priority="high"
                )

        return {"success": True, "message": "Submission reviewed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reviewing submission: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{submission_id}")
async def delete_submission(submission_id: str, request: Request, user: dict):
    """Delete a work submission (employee own submission or admin)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        submission = await db.work_submissions.find_one({"submission_id": submission_id})

        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")

        # Check permissions
        can_delete = False
        if user["role"] in ["admin", "hr"]:
            can_delete = submission["company_id"] == user["company_id"]
        elif user["user_id"] == submission["employee_id"] and submission["status"] == "pending":
            can_delete = True

        if not can_delete:
            raise HTTPException(status_code=403, detail="Cannot delete this submission")

        await db.work_submissions.delete_one({"submission_id": submission_id})

        return {"success": True, "message": "Submission deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting submission: {e}")
        raise HTTPException(status_code=500, detail=str(e))

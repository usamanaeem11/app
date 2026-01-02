"""
Project Assignments Routes
Handles assigning employees to projects with project-specific wages
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from utils.id_generator import generate_id
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class ProjectAssignmentCreate(BaseModel):
    project_id: str
    employee_id: str
    project_wage_amount: Optional[float] = None
    notes: Optional[str] = None


class ProjectWageApproval(BaseModel):
    approved: bool


@router.post("")
async def create_project_assignment(data: ProjectAssignmentCreate, request: Request, user: dict):
    """Assign an employee to a project (admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        if user["role"] not in ["admin", "hr"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        # Check if project exists
        project = await db.projects.find_one({"project_id": data.project_id})
        if not project or project["company_id"] != user["company_id"]:
            raise HTTPException(status_code=404, detail="Project not found")

        # Check if employee exists
        employee = await db.users.find_one({"user_id": data.employee_id})
        if not employee or employee["company_id"] != user["company_id"]:
            raise HTTPException(status_code=404, detail="Employee not found")

        # Check if already assigned
        existing = await db.project_assignments.find_one({
            "project_id": data.project_id,
            "employee_id": data.employee_id,
            "is_active": True
        })

        if existing:
            raise HTTPException(status_code=400, detail="Employee already assigned to this project")

        assignment_id = generate_id("proj_assignment")

        assignment_doc = {
            "assignment_id": assignment_id,
            "company_id": user["company_id"],
            "project_id": data.project_id,
            "employee_id": data.employee_id,
            "assigned_by": user["user_id"],
            "assigned_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True,
            "project_wage_amount": data.project_wage_amount,
            "wage_approved_by_admin": True if data.project_wage_amount else False,
            "wage_approved_by_employee": False if data.project_wage_amount else False,
            "notes": data.notes
        }

        await db.project_assignments.insert_one(assignment_doc)

        # Create notification
        if data.project_wage_amount:
            from routes.notifications import create_notification
            await create_notification(
                db=db,
                company_id=user["company_id"],
                user_id=data.employee_id,
                notification_type="project_assignment",
                title="Assigned to Project",
                message=f"You've been assigned to {project.get('name')} with project wage ${data.project_wage_amount}. Please approve.",
                data={"assignment_id": assignment_id, "project_id": data.project_id},
                priority="normal"
            )
        else:
            from routes.notifications import create_notification
            await create_notification(
                db=db,
                company_id=user["company_id"],
                user_id=data.employee_id,
                notification_type="project_assignment",
                title="Assigned to Project",
                message=f"You've been assigned to {project.get('name')}",
                data={"assignment_id": assignment_id, "project_id": data.project_id},
                priority="normal"
            )

        return {"success": True, "assignment_id": assignment_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating project assignment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def get_project_assignments(
    request: Request,
    user: dict,
    project_id: Optional[str] = None,
    employee_id: Optional[str] = None
):
    """Get project assignments"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        query = {"company_id": user["company_id"], "is_active": True}

        if project_id:
            query["project_id"] = project_id

        # Role-based filtering
        if user["role"] == "employee":
            query["employee_id"] = user["user_id"]
        elif user["role"] == "manager":
            # Managers see their assigned employees
            if employee_id:
                assignment = await db.manager_assignments.find_one({
                    "manager_id": user["user_id"],
                    "employee_id": employee_id,
                    "active": True
                })
                if not assignment:
                    raise HTTPException(status_code=403, detail="Access denied")
                query["employee_id"] = employee_id
            else:
                assignments = await db.manager_assignments.find({
                    "manager_id": user["user_id"],
                    "active": True
                })
                employee_ids = [a["employee_id"] for a in assignments]
                query["employee_id"] = {"$in": employee_ids}
        elif user["role"] in ["admin", "hr"]:
            if employee_id:
                query["employee_id"] = employee_id

        assignments = await db.project_assignments.find(query)

        # Enrich with details
        for assignment in assignments:
            project = await db.projects.find_one({"project_id": assignment["project_id"]})
            assignment["project_name"] = project.get("name") if project else "Unknown"

            employee = await db.users.find_one({"user_id": assignment["employee_id"]})
            assignment["employee_name"] = employee.get("name") if employee else "Unknown"

        return {"success": True, "data": assignments}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching project assignments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{assignment_id}/approve-wage")
async def approve_project_wage(assignment_id: str, data: ProjectWageApproval, request: Request, user: dict):
    """Approve project-specific wage (employee only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        assignment = await db.project_assignments.find_one({"assignment_id": assignment_id})

        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")

        # Only the assigned employee can approve
        if user["user_id"] != assignment["employee_id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        await db.project_assignments.update_one(
            {"assignment_id": assignment_id},
            {"$set": {"wage_approved_by_employee": data.approved}}
        )

        # Notify admin
        from routes.notifications import create_notification
        admins = await db.users.find({
            "company_id": assignment["company_id"],
            "role": "admin"
        })
        for admin in admins:
            await create_notification(
                db=db,
                company_id=assignment["company_id"],
                user_id=admin["user_id"],
                notification_type="project_wage_approved",
                title="Project Wage Response",
                message=f"Employee {'approved' if data.approved else 'rejected'} project wage",
                data={"assignment_id": assignment_id},
                priority="normal"
            )

        return {"success": True, "message": "Project wage approval updated"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving project wage: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{assignment_id}")
async def remove_project_assignment(assignment_id: str, request: Request, user: dict):
    """Remove employee from project (admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        if user["role"] not in ["admin", "hr"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        assignment = await db.project_assignments.find_one({"assignment_id": assignment_id})

        if not assignment or assignment["company_id"] != user["company_id"]:
            raise HTTPException(status_code=404, detail="Assignment not found")

        await db.project_assignments.update_one(
            {"assignment_id": assignment_id},
            {"$set": {"is_active": False}}
        )

        return {"success": True, "message": "Project assignment removed"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing project assignment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

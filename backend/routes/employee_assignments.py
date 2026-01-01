"""
Employee Assignment Routes
Handles employee assignment requests and acceptance
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/employee-assignments", tags=["Employee Assignments"])


class AssignmentRequestCreate(BaseModel):
    employee_id: str
    message: Optional[str] = None


class AssignmentRequestResponse(BaseModel):
    request_id: str
    status: str


class AssignmentRequestUpdate(BaseModel):
    status: str  # 'accepted' or 'rejected'


async def get_current_user(request):
    """Get current user from request - placeholder"""
    # This should be implemented based on your auth system
    return request.state.user if hasattr(request.state, 'user') else None


@router.post("")
async def create_assignment_request(
    data: AssignmentRequestCreate,
    request,
    user: dict = Depends(get_current_user)
):
    """
    Create an employee assignment request (Admin/Manager to Employee)
    """
    from utils.id_generator import generate_id

    if user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only admins and managers can create assignment requests")

    db = request.app.state.db

    # Check if employee exists
    employee = await db.users.find_one({
        "user_id": data.employee_id,
        "company_id": user["company_id"]
    })
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check if request already exists
    existing = await db.employee_assignment_requests.find_one({
        "manager_id": user["user_id"],
        "employee_id": data.employee_id,
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Assignment request already exists")

    # Create request
    request_id = generate_id("req")
    request_doc = {
        "request_id": request_id,
        "company_id": user["company_id"],
        "manager_id": user["user_id"],
        "employee_id": data.employee_id,
        "status": "pending",
        "message": data.message,
        "requested_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.employee_assignment_requests.insert_one(request_doc)

    logger.info(f"Assignment request {request_id} created by {user['user_id']} for {data.employee_id}")

    return {
        "request_id": request_id,
        "message": "Assignment request sent successfully",
        "status": "pending"
    }


@router.get("")
async def get_assignment_requests(
    request,
    user: dict = Depends(get_current_user)
):
    """
    Get assignment requests
    - Employees see requests sent to them
    - Admins/Managers see requests they created
    """
    db = request.app.state.db

    if user["role"] in ["admin", "manager"]:
        # Get requests created by this manager
        requests = await db.employee_assignment_requests.find({
            "manager_id": user["user_id"]
        })
    else:
        # Get requests for this employee
        requests = await db.employee_assignment_requests.find({
            "employee_id": user["user_id"]
        })

    # Enrich with user data
    enriched_requests = []
    for req in requests:
        # Get manager info
        manager = await db.users.find_one(
            {"user_id": req["manager_id"]},
            projection={"user_id": 1, "name": 1, "email": 1, "role": 1}
        )

        # Get employee info
        employee = await db.users.find_one(
            {"user_id": req["employee_id"]},
            projection={"user_id": 1, "name": 1, "email": 1, "role": 1}
        )

        enriched_requests.append({
            **req,
            "manager": manager,
            "employee": employee
        })

    return enriched_requests


@router.put("/{request_id}")
async def update_assignment_request(
    request_id: str,
    data: AssignmentRequestUpdate,
    request,
    user: dict = Depends(get_current_user)
):
    """
    Update assignment request status (Employee accepts/rejects)
    """
    db = request.app.state.db

    # Get request
    assignment_request = await db.employee_assignment_requests.find_one({
        "request_id": request_id
    })
    if not assignment_request:
        raise HTTPException(status_code=404, detail="Assignment request not found")

    # Only employee can respond
    if assignment_request["employee_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only the assigned employee can respond to this request")

    # Update status
    update_data = {
        "status": data.status,
        "responded_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.employee_assignment_requests.update_one(
        {"request_id": request_id},
        {"$set": update_data}
    )

    # If accepted, create manager assignment
    if data.status == "accepted":
        from utils.id_generator import generate_assignment_id

        # Check if assignment already exists
        existing_assignment = await db.manager_assignments.find_one({
            "manager_id": assignment_request["manager_id"],
            "employee_id": assignment_request["employee_id"]
        })

        if not existing_assignment:
            assignment_id = generate_assignment_id()
            assignment_doc = {
                "assignment_id": assignment_id,
                "company_id": assignment_request["company_id"],
                "manager_id": assignment_request["manager_id"],
                "employee_id": assignment_request["employee_id"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.manager_assignments.insert_one(assignment_doc)

    logger.info(f"Assignment request {request_id} updated to {data.status}")

    return {
        "message": f"Assignment request {data.status}",
        "status": data.status
    }


@router.delete("/{request_id}")
async def cancel_assignment_request(
    request_id: str,
    request,
    user: dict = Depends(get_current_user)
):
    """
    Cancel assignment request (Manager only)
    """
    db = request.app.state.db

    assignment_request = await db.employee_assignment_requests.find_one({
        "request_id": request_id
    })
    if not assignment_request:
        raise HTTPException(status_code=404, detail="Assignment request not found")

    # Only manager who created it can cancel
    if assignment_request["manager_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only the manager who created this request can cancel it")

    # Update status to cancelled
    await db.employee_assignment_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "cancelled",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {"message": "Assignment request cancelled"}

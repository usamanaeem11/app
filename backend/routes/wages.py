"""
Wage Management Routes
Handles employee wages, mutual approval system, and wage change requests
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, date
from utils.id_generator import generate_id
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class EmployeeWageCreate(BaseModel):
    employee_id: str
    wage_type: str  # hourly, monthly, project
    wage_amount: float
    currency: str = "USD"
    effective_from: date


class EmployeeWageApproval(BaseModel):
    approved: bool
    notes: Optional[str] = None


class WageChangeRequestCreate(BaseModel):
    employee_id: str
    new_wage_type: str
    new_wage_amount: float
    currency: str = "USD"
    reason: Optional[str] = None
    effective_from: Optional[date] = None


class WageChangeRequestApproval(BaseModel):
    approved: bool
    notes: Optional[str] = None


@router.post("/employee-wages")
async def create_employee_wage(data: EmployeeWageCreate, request: Request, user: dict):
    """Create a new employee wage (requires mutual approval)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        # Only admin can create wages
        if user["role"] not in ["admin", "hr"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        # Validate wage type
        if data.wage_type not in ["hourly", "monthly", "project"]:
            raise HTTPException(status_code=400, detail="Invalid wage type")

        # Check if employee exists and is in same company
        employee = await db.users.find_one({"user_id": data.employee_id})
        if not employee or employee["company_id"] != user["company_id"]:
            raise HTTPException(status_code=404, detail="Employee not found")

        # Check if employee already has an active wage
        existing_wage = await db.employee_wages.find_one({
            "employee_id": data.employee_id,
            "is_active": True
        })

        if existing_wage:
            raise HTTPException(
                status_code=400,
                detail="Employee already has an active wage. Create a wage change request instead."
            )

        wage_id = generate_id("wage")

        wage_doc = {
            "wage_id": wage_id,
            "company_id": user["company_id"],
            "employee_id": data.employee_id,
            "wage_type": data.wage_type,
            "wage_amount": data.wage_amount,
            "currency": data.currency,
            "approved_by_admin": True,  # Admin creating it, auto-approved by admin
            "approved_by_employee": False,  # Employee needs to approve
            "effective_from": data.effective_from.isoformat(),
            "is_active": True,
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        await db.employee_wages.insert_one(wage_doc)

        # Create notification for employee
        from routes.notifications import create_notification
        await create_notification(
            db=db,
            company_id=user["company_id"],
            user_id=data.employee_id,
            notification_type="wage_approval_required",
            title="Wage Agreement Requires Your Approval",
            message=f"Admin has set your wage to {data.currency} {data.wage_amount}/{data.wage_type}. Please review and approve.",
            data={"wage_id": wage_id, "wage_type": data.wage_type, "wage_amount": data.wage_amount},
            priority="high"
        )

        return {"success": True, "wage_id": wage_id, "message": "Wage created, awaiting employee approval"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating employee wage: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/employee-wages")
async def get_employee_wages(request: Request, user: dict, employee_id: Optional[str] = None):
    """Get employee wages based on user role"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        query = {"company_id": user["company_id"]}

        # Role-based filtering
        if user["role"] == "employee" or user["role"] == "manager":
            # Employees see only their own wages
            if employee_id and employee_id != user["user_id"]:
                # Check if user is a manager with expense access
                if user["role"] == "manager":
                    access = await db.manager_expense_access.find_one({
                        "manager_id": user["user_id"],
                        "is_active": True
                    })
                    if not access:
                        raise HTTPException(status_code=403, detail="Access denied")

                    # Check if employee is assigned to this manager
                    assignment = await db.manager_assignments.find_one({
                        "manager_id": user["user_id"],
                        "employee_id": employee_id,
                        "active": True
                    })
                    if not assignment:
                        raise HTTPException(status_code=403, detail="Access denied")
                else:
                    raise HTTPException(status_code=403, detail="Access denied")
            else:
                query["employee_id"] = user["user_id"]
        elif user["role"] in ["admin", "hr"]:
            # Admins see all or specific employee wages
            if employee_id:
                query["employee_id"] = employee_id

        wages = await db.employee_wages.find(query, sort=[("created_at", -1)])

        # Enrich with employee names
        for wage in wages:
            employee = await db.users.find_one({"user_id": wage["employee_id"]})
            wage["employee_name"] = employee.get("name", "Unknown") if employee else "Unknown"

        return {"success": True, "data": wages}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching employee wages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/employee-wages/{wage_id}/approve")
async def approve_employee_wage(wage_id: str, data: EmployeeWageApproval, request: Request, user: dict):
    """Approve or reject an employee wage"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        wage = await db.employee_wages.find_one({"wage_id": wage_id})

        if not wage:
            raise HTTPException(status_code=404, detail="Wage not found")

        # Check permissions
        is_admin = user["role"] in ["admin", "hr"] and wage["company_id"] == user["company_id"]
        is_employee = user["user_id"] == wage["employee_id"]

        if not (is_admin or is_employee):
            raise HTTPException(status_code=403, detail="Access denied")

        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}

        if is_admin:
            update_data["approved_by_admin"] = data.approved
            if not data.approved:
                update_data["is_active"] = False
        elif is_employee:
            update_data["approved_by_employee"] = data.approved
            if not data.approved:
                update_data["is_active"] = False

        # If both parties approved, set approved_at
        if (wage.get("approved_by_admin") or is_admin and data.approved) and \
           (wage.get("approved_by_employee") or is_employee and data.approved):
            update_data["approved_at"] = datetime.now(timezone.utc).isoformat()

        await db.employee_wages.update_one(
            {"wage_id": wage_id},
            {"$set": update_data}
        )

        # Create notifications
        from routes.notifications import create_notification

        if is_employee:
            # Notify admin
            admins = await db.users.find({
                "company_id": wage["company_id"],
                "role": "admin"
            })
            for admin in admins:
                await create_notification(
                    db=db,
                    company_id=wage["company_id"],
                    user_id=admin["user_id"],
                    notification_type="wage_approved",
                    title="Employee Wage Response",
                    message=f"Employee {'approved' if data.approved else 'rejected'} the wage agreement",
                    data={"wage_id": wage_id},
                    priority="normal"
                )
        elif is_admin:
            # Notify employee
            await create_notification(
                db=db,
                company_id=wage["company_id"],
                user_id=wage["employee_id"],
                notification_type="wage_approved",
                title="Wage Agreement Response",
                message=f"Admin {'approved' if data.approved else 'rejected'} the wage agreement",
                data={"wage_id": wage_id},
                priority="high"
            )

        return {"success": True, "message": "Wage approval updated"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving wage: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/wage-change-requests")
async def create_wage_change_request(data: WageChangeRequestCreate, request: Request, user: dict):
    """Create a wage change request (requires mutual approval)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        # Validate wage type
        if data.new_wage_type not in ["hourly", "monthly", "project"]:
            raise HTTPException(status_code=400, detail="Invalid wage type")

        # Check if employee exists
        employee = await db.users.find_one({"user_id": data.employee_id})
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")

        # Only admin or the employee themselves can request wage changes
        is_admin = user["role"] in ["admin", "hr"] and employee["company_id"] == user["company_id"]
        is_employee = user["user_id"] == data.employee_id

        if not (is_admin or is_employee):
            raise HTTPException(status_code=403, detail="Access denied")

        # Get current wage
        current_wage = await db.employee_wages.find_one({
            "employee_id": data.employee_id,
            "is_active": True
        })

        # Also check work agreement for wage
        agreement = await db.work_agreements.find_one({
            "employee_id": data.employee_id,
            "status": "active"
        })

        request_id = generate_id("wage_request")
        request_doc = {
            "request_id": request_id,
            "company_id": employee["company_id"],
            "employee_id": data.employee_id,
            "requested_by": user["user_id"],
            "request_type": "agreement_wage" if agreement else "standalone_wage",
            "current_wage_type": current_wage.get("wage_type") if current_wage else None,
            "current_wage_amount": current_wage.get("wage_amount") if current_wage else None,
            "new_wage_type": data.new_wage_type,
            "new_wage_amount": data.new_wage_amount,
            "currency": data.currency,
            "reason": data.reason,
            "status": "pending",
            "admin_approved": is_admin,  # Auto-approve if requested by admin
            "employee_approved": is_employee,  # Auto-approve if requested by employee
            "admin_approved_at": datetime.now(timezone.utc).isoformat() if is_admin else None,
            "employee_approved_at": datetime.now(timezone.utc).isoformat() if is_employee else None,
            "effective_from": data.effective_from.isoformat() if data.effective_from else None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        await db.wage_change_requests.insert_one(request_doc)

        # Create notifications
        from routes.notifications import create_notification

        if is_admin:
            # Notify employee
            await create_notification(
                db=db,
                company_id=employee["company_id"],
                user_id=data.employee_id,
                notification_type="wage_change_request",
                title="Wage Change Request",
                message=f"Admin requested to change your wage to {data.currency} {data.new_wage_amount}/{data.new_wage_type}",
                data={"request_id": request_id},
                priority="high"
            )
        else:
            # Notify admins
            admins = await db.users.find({
                "company_id": employee["company_id"],
                "role": "admin"
            })
            for admin in admins:
                await create_notification(
                    db=db,
                    company_id=employee["company_id"],
                    user_id=admin["user_id"],
                    notification_type="wage_change_request",
                    title="Wage Change Request",
                    message=f"Employee {employee.get('name')} requested wage change to {data.currency} {data.new_wage_amount}/{data.new_wage_type}",
                    data={"request_id": request_id},
                    priority="high"
                )

        return {"success": True, "request_id": request_id, "message": "Wage change request created"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating wage change request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/wage-change-requests")
async def get_wage_change_requests(
    request: Request,
    user: dict,
    status: Optional[str] = None,
    employee_id: Optional[str] = None
):
    """Get wage change requests"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        query = {"company_id": user["company_id"]}

        if status:
            query["status"] = status

        # Role-based filtering
        if user["role"] == "employee":
            query["employee_id"] = user["user_id"]
        elif user["role"] == "manager":
            # Managers don't see wage requests unless they're an employee
            query["employee_id"] = user["user_id"]
        elif user["role"] in ["admin", "hr"]:
            if employee_id:
                query["employee_id"] = employee_id

        requests = await db.wage_change_requests.find(query, sort=[("created_at", -1)])

        # Enrich with names
        for req in requests:
            employee = await db.users.find_one({"user_id": req["employee_id"]})
            req["employee_name"] = employee.get("name", "Unknown") if employee else "Unknown"

            requester = await db.users.find_one({"user_id": req["requested_by"]})
            req["requested_by_name"] = requester.get("name", "Unknown") if requester else "Unknown"

        return {"success": True, "data": requests}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching wage change requests: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/wage-change-requests/{request_id}/approve")
async def approve_wage_change_request(
    request_id: str,
    data: WageChangeRequestApproval,
    request: Request,
    user: dict
):
    """Approve or reject a wage change request"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        wage_request = await db.wage_change_requests.find_one({"request_id": request_id})

        if not wage_request:
            raise HTTPException(status_code=404, detail="Request not found")

        if wage_request["status"] != "pending":
            raise HTTPException(status_code=400, detail="Request already processed")

        # Check permissions
        is_admin = user["role"] in ["admin", "hr"] and wage_request["company_id"] == user["company_id"]
        is_employee = user["user_id"] == wage_request["employee_id"]

        if not (is_admin or is_employee):
            raise HTTPException(status_code=403, detail="Access denied")

        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}

        if is_admin:
            update_data["admin_approved"] = data.approved
            update_data["admin_notes"] = data.notes
            if data.approved:
                update_data["admin_approved_at"] = datetime.now(timezone.utc).isoformat()
            else:
                update_data["status"] = "rejected"
        elif is_employee:
            update_data["employee_approved"] = data.approved
            update_data["employee_notes"] = data.notes
            if data.approved:
                update_data["employee_approved_at"] = datetime.now(timezone.utc).isoformat()
            else:
                update_data["status"] = "rejected"

        # If both parties approved, apply the wage change
        both_approved = (
            (wage_request.get("admin_approved") or (is_admin and data.approved)) and
            (wage_request.get("employee_approved") or (is_employee and data.approved))
        )

        if both_approved:
            update_data["status"] = "approved"

            # Deactivate old wage
            await db.employee_wages.update_many(
                {
                    "employee_id": wage_request["employee_id"],
                    "is_active": True
                },
                {"$set": {"is_active": False, "effective_until": datetime.now(timezone.utc).date().isoformat()}}
            )

            # Create new wage
            new_wage_id = generate_id("wage")
            new_wage_doc = {
                "wage_id": new_wage_id,
                "company_id": wage_request["company_id"],
                "employee_id": wage_request["employee_id"],
                "wage_type": wage_request["new_wage_type"],
                "wage_amount": wage_request["new_wage_amount"],
                "currency": wage_request["currency"],
                "approved_by_admin": True,
                "approved_by_employee": True,
                "approved_at": datetime.now(timezone.utc).isoformat(),
                "effective_from": wage_request.get("effective_from") or datetime.now(timezone.utc).date().isoformat(),
                "is_active": True,
                "created_by": user["user_id"],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }

            await db.employee_wages.insert_one(new_wage_doc)

        await db.wage_change_requests.update_one(
            {"request_id": request_id},
            {"$set": update_data}
        )

        # Create notifications
        from routes.notifications import create_notification

        if is_employee:
            # Notify admin
            admins = await db.users.find({
                "company_id": wage_request["company_id"],
                "role": "admin"
            })
            for admin in admins:
                await create_notification(
                    db=db,
                    company_id=wage_request["company_id"],
                    user_id=admin["user_id"],
                    notification_type="wage_change_response",
                    title="Wage Change Response",
                    message=f"Employee {'approved' if data.approved else 'rejected'} the wage change request",
                    data={"request_id": request_id},
                    priority="high"
                )
        elif is_admin:
            # Notify employee
            await create_notification(
                db=db,
                company_id=wage_request["company_id"],
                user_id=wage_request["employee_id"],
                notification_type="wage_change_response",
                title="Wage Change Response",
                message=f"Admin {'approved' if data.approved else 'rejected'} the wage change request",
                data={"request_id": request_id},
                priority="high"
            )

        if both_approved:
            # Notify both parties that wage is now active
            await create_notification(
                db=db,
                company_id=wage_request["company_id"],
                user_id=wage_request["employee_id"],
                notification_type="wage_changed",
                title="Wage Changed Successfully",
                message=f"Your wage has been updated to {wage_request['currency']} {wage_request['new_wage_amount']}/{wage_request['new_wage_type']}",
                data={"request_id": request_id},
                priority="high"
            )

        return {"success": True, "message": "Wage change request processed"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving wage change request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my-wage")
async def get_my_current_wage(request: Request, user: dict):
    """Get current user's active wage"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        # Check employee_wages first
        wage = await db.employee_wages.find_one({
            "employee_id": user["user_id"],
            "is_active": True,
            "approved_by_admin": True,
            "approved_by_employee": True
        })

        # If not found, check work agreement
        if not wage:
            agreement = await db.work_agreements.find_one({
                "employee_id": user["user_id"],
                "status": "active"
            })

            if agreement and agreement.get("wage_type"):
                wage = {
                    "source": "agreement",
                    "agreement_id": agreement["agreement_id"],
                    "wage_type": agreement.get("wage_type"),
                    "wage_amount": agreement.get("wage_amount"),
                    "currency": agreement.get("wage_currency", "USD"),
                    "approved_by_admin": agreement.get("wage_approved_by_admin", False),
                    "approved_by_employee": agreement.get("wage_approved_by_employee", False)
                }
            else:
                return {"success": True, "data": None, "message": "No wage configured"}
        else:
            wage["source"] = "standalone"

        return {"success": True, "data": wage}

    except Exception as e:
        logger.error(f"Error fetching current wage: {e}")
        raise HTTPException(status_code=500, detail=str(e))

"""
Escrow Management Routes
Handles escrow accounts for secure payment holds until work completion
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, date
from utils.id_generator import generate_id
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class EscrowCreate(BaseModel):
    employee_id: str
    project_id: Optional[str] = None
    amount: float
    currency: str = "USD"
    release_condition: str  # manual_approval, project_completion, work_submission_approval, time_based, milestone_based
    auto_release_on_approval: bool = False
    release_date: Optional[date] = None
    work_completion_required: bool = True
    agreement_id: Optional[str] = None
    terms: Optional[str] = None


class EscrowFund(BaseModel):
    funding_source_id: str


class EscrowRelease(BaseModel):
    release_notes: Optional[str] = None


class EscrowRefund(BaseModel):
    refund_reason: str


@router.post("")
async def create_escrow(data: EscrowCreate, request: Request, user: dict):
    """Create an escrow account (admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        if user["role"] not in ["admin", "hr"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        # Validate release condition
        valid_conditions = ["manual_approval", "project_completion", "work_submission_approval", "time_based", "milestone_based"]
        if data.release_condition not in valid_conditions:
            raise HTTPException(status_code=400, detail="Invalid release condition")

        # Check if employee exists
        employee = await db.users.find_one({"user_id": data.employee_id})
        if not employee or employee["company_id"] != user["company_id"]:
            raise HTTPException(status_code=404, detail="Employee not found")

        # Check if project exists
        if data.project_id:
            project = await db.projects.find_one({"project_id": data.project_id})
            if not project or project["company_id"] != user["company_id"]:
                raise HTTPException(status_code=404, detail="Project not found")

        escrow_id = generate_id("escrow")

        escrow_doc = {
            "escrow_id": escrow_id,
            "company_id": user["company_id"],
            "admin_id": user["user_id"],
            "employee_id": data.employee_id,
            "project_id": data.project_id,
            "amount": data.amount,
            "currency": data.currency,
            "status": "pending_funding",
            "release_condition": data.release_condition,
            "auto_release_on_approval": data.auto_release_on_approval,
            "release_date": data.release_date.isoformat() if data.release_date else None,
            "work_completion_required": data.work_completion_required,
            "agreement_id": data.agreement_id,
            "terms": data.terms,
            "is_disputed": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        await db.escrow_accounts.insert_one(escrow_doc)

        # Create notification
        from routes.notifications import create_notification
        await create_notification(
            db=db,
            company_id=user["company_id"],
            user_id=data.employee_id,
            notification_type="escrow_created",
            title="Escrow Account Created",
            message=f"An escrow account of {data.currency} {data.amount} has been created for your work",
            data={"escrow_id": escrow_id, "amount": data.amount},
            priority="high"
        )

        return {"success": True, "escrow_id": escrow_id, "message": "Escrow account created"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating escrow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{escrow_id}/fund")
async def fund_escrow(escrow_id: str, data: EscrowFund, request: Request, user: dict):
    """Fund an escrow account (admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        escrow = await db.escrow_accounts.find_one({"escrow_id": escrow_id})

        if not escrow:
            raise HTTPException(status_code=404, detail="Escrow account not found")

        if user["role"] not in ["admin", "hr"] or escrow["company_id"] != user["company_id"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        if escrow["status"] != "pending_funding":
            raise HTTPException(status_code=400, detail="Escrow already funded or in invalid state")

        # Verify funding source
        funding_source = await db.bank_accounts.find_one({"account_id": data.funding_source_id})
        if not funding_source or funding_source["user_id"] != user["user_id"]:
            raise HTTPException(status_code=404, detail="Funding source not found")

        await db.escrow_accounts.update_one(
            {"escrow_id": escrow_id},
            {
                "$set": {
                    "status": "funded",
                    "funded_by": user["user_id"],
                    "funded_at": datetime.now(timezone.utc).isoformat(),
                    "funding_source_id": data.funding_source_id,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

        # Notify employee
        from routes.notifications import create_notification
        await create_notification(
            db=db,
            company_id=escrow["company_id"],
            user_id=escrow["employee_id"],
            notification_type="escrow_funded",
            title="Escrow Account Funded",
            message=f"Escrow account of {escrow['currency']} {escrow['amount']} has been funded",
            data={"escrow_id": escrow_id},
            priority="high"
        )

        return {"success": True, "message": "Escrow account funded"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error funding escrow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{escrow_id}/release")
async def release_escrow(escrow_id: str, data: EscrowRelease, request: Request, user: dict):
    """Release escrow to employee (admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        escrow = await db.escrow_accounts.find_one({"escrow_id": escrow_id})

        if not escrow:
            raise HTTPException(status_code=404, detail="Escrow account not found")

        if user["role"] not in ["admin", "hr"] or escrow["company_id"] != user["company_id"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        if escrow["status"] != "funded":
            raise HTTPException(status_code=400, detail="Escrow must be funded before release")

        if escrow["is_disputed"]:
            raise HTTPException(status_code=400, detail="Cannot release disputed escrow")

        # Check work completion if required
        if escrow.get("work_completion_required") and escrow.get("project_id"):
            # Check if project has completed work submissions
            submissions = await db.work_submissions.find({
                "project_id": escrow["project_id"],
                "employee_id": escrow["employee_id"],
                "status": "approved"
            })
            if not submissions:
                raise HTTPException(
                    status_code=400,
                    detail="Work completion required before escrow release"
                )

        # Get employee's bank account
        employee_account = await db.bank_accounts.find_one({
            "user_id": escrow["employee_id"],
            "is_primary": True,
            "is_active": True
        })

        await db.escrow_accounts.update_one(
            {"escrow_id": escrow_id},
            {
                "$set": {
                    "status": "released",
                    "released_to": escrow["employee_id"],
                    "released_at": datetime.now(timezone.utc).isoformat(),
                    "released_by": user["user_id"],
                    "release_notes": data.release_notes,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

        # Create payout record
        payout_id = generate_id("payout")
        payout_doc = {
            "payout_id": payout_id,
            "company_id": escrow["company_id"],
            "from_user_id": escrow["admin_id"],
            "to_user_id": escrow["employee_id"],
            "to_account_id": employee_account["account_id"] if employee_account else None,
            "amount": escrow["amount"],
            "currency": escrow["currency"],
            "payout_type": "project",
            "payment_method": "escrow_release",
            "status": "approved",
            "escrow_id": escrow_id,
            "project_id": escrow.get("project_id"),
            "notes": data.release_notes,
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payouts.insert_one(payout_doc)

        # Notify employee
        from routes.notifications import create_notification
        await create_notification(
            db=db,
            company_id=escrow["company_id"],
            user_id=escrow["employee_id"],
            notification_type="escrow_released",
            title="Escrow Released",
            message=f"Escrow of {escrow['currency']} {escrow['amount']} has been released to you",
            data={"escrow_id": escrow_id, "payout_id": payout_id},
            priority="high"
        )

        return {
            "success": True,
            "message": "Escrow released",
            "payout_id": payout_id,
            "reminder": "This creates a payout record. You must complete the actual transfer."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error releasing escrow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{escrow_id}/refund")
async def refund_escrow(escrow_id: str, data: EscrowRefund, request: Request, user: dict):
    """Refund escrow to admin (admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        escrow = await db.escrow_accounts.find_one({"escrow_id": escrow_id})

        if not escrow:
            raise HTTPException(status_code=404, detail="Escrow account not found")

        if user["role"] not in ["admin", "hr"] or escrow["company_id"] != user["company_id"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        if escrow["status"] not in ["funded", "held"]:
            raise HTTPException(status_code=400, detail="Invalid escrow state for refund")

        await db.escrow_accounts.update_one(
            {"escrow_id": escrow_id},
            {
                "$set": {
                    "status": "refunded",
                    "refunded_to": escrow["admin_id"],
                    "refunded_at": datetime.now(timezone.utc).isoformat(),
                    "refund_reason": data.refund_reason,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

        # Notify employee
        from routes.notifications import create_notification
        await create_notification(
            db=db,
            company_id=escrow["company_id"],
            user_id=escrow["employee_id"],
            notification_type="escrow_refunded",
            title="Escrow Refunded",
            message=f"Escrow of {escrow['currency']} {escrow['amount']} has been refunded. Reason: {data.refund_reason}",
            data={"escrow_id": escrow_id},
            priority="high"
        )

        return {"success": True, "message": "Escrow refunded"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refunding escrow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def get_escrow_accounts(
    request: Request,
    user: dict,
    status: Optional[str] = None,
    project_id: Optional[str] = None
):
    """Get escrow accounts"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        query = {"company_id": user["company_id"]}

        if status:
            query["status"] = status

        if project_id:
            query["project_id"] = project_id

        # Role-based filtering
        if user["role"] in ["employee", "manager"]:
            query["$or"] = [
                {"admin_id": user["user_id"]},
                {"employee_id": user["user_id"]}
            ]
        # Admins see all

        escrows = await db.escrow_accounts.find(query, sort=[("created_at", -1)])

        # Enrich with details
        for escrow in escrows:
            admin = await db.users.find_one({"user_id": escrow["admin_id"]})
            escrow["admin_name"] = admin.get("name", "Unknown") if admin else "Unknown"

            employee = await db.users.find_one({"user_id": escrow["employee_id"]})
            escrow["employee_name"] = employee.get("name", "Unknown") if employee else "Unknown"

            if escrow.get("project_id"):
                project = await db.projects.find_one({"project_id": escrow["project_id"]})
                escrow["project_name"] = project.get("name") if project else "Unknown"

        return {"success": True, "data": escrows}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching escrow accounts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{escrow_id}")
async def get_escrow_details(escrow_id: str, request: Request, user: dict):
    """Get escrow account details"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        escrow = await db.escrow_accounts.find_one({"escrow_id": escrow_id})

        if not escrow:
            raise HTTPException(status_code=404, detail="Escrow account not found")

        # Check permissions
        is_involved = user["user_id"] in [escrow["admin_id"], escrow["employee_id"]]
        is_admin = user["role"] in ["admin", "hr"] and escrow["company_id"] == user["company_id"]

        if not (is_involved or is_admin):
            raise HTTPException(status_code=403, detail="Access denied")

        # Enrich with details
        admin = await db.users.find_one({"user_id": escrow["admin_id"]})
        escrow["admin_name"] = admin.get("name", "Unknown") if admin else "Unknown"

        employee = await db.users.find_one({"user_id": escrow["employee_id"]})
        escrow["employee_name"] = employee.get("name", "Unknown") if employee else "Unknown"

        if escrow.get("project_id"):
            project = await db.projects.find_one({"project_id": escrow["project_id"]})
            escrow["project_name"] = project.get("name") if project else "Unknown"

        # Get related payouts
        payouts = await db.payouts.find({"escrow_id": escrow_id})
        escrow["payouts"] = payouts

        return {"success": True, "data": escrow}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching escrow details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{escrow_id}/dispute")
async def dispute_escrow(escrow_id: str, request: Request, user: dict):
    """Raise a dispute on escrow (employee or admin)"""
    from db import SupabaseDB
    from pydantic import BaseModel

    class DisputeData(BaseModel):
        dispute_type: str
        reason: str
        description: Optional[str] = None

    data = DisputeData(**request.json())
    db = SupabaseDB.get_db()

    try:
        escrow = await db.escrow_accounts.find_one({"escrow_id": escrow_id})

        if not escrow:
            raise HTTPException(status_code=404, detail="Escrow account not found")

        # Check permissions
        is_involved = user["user_id"] in [escrow["admin_id"], escrow["employee_id"]]
        if not is_involved:
            raise HTTPException(status_code=403, detail="Access denied")

        if escrow["status"] not in ["funded", "held"]:
            raise HTTPException(status_code=400, detail="Cannot dispute escrow in current state")

        # Create dispute
        dispute_id = generate_id("dispute")
        against_user = escrow["employee_id"] if user["user_id"] == escrow["admin_id"] else escrow["admin_id"]

        dispute_doc = {
            "dispute_id": dispute_id,
            "company_id": escrow["company_id"],
            "escrow_id": escrow_id,
            "raised_by": user["user_id"],
            "against_user": against_user,
            "dispute_type": data.dispute_type,
            "amount_disputed": escrow["amount"],
            "currency": escrow["currency"],
            "reason": data.reason,
            "description": data.description,
            "status": "open",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_disputes.insert_one(dispute_doc)

        # Update escrow
        await db.escrow_accounts.update_one(
            {"escrow_id": escrow_id},
            {
                "$set": {
                    "is_disputed": True,
                    "dispute_id": dispute_id,
                    "dispute_raised_at": datetime.now(timezone.utc).isoformat(),
                    "status": "disputed",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

        # Notify other party
        from routes.notifications import create_notification
        await create_notification(
            db=db,
            company_id=escrow["company_id"],
            user_id=against_user,
            notification_type="escrow_disputed",
            title="Escrow Disputed",
            message=f"An escrow of {escrow['currency']} {escrow['amount']} has been disputed",
            data={"escrow_id": escrow_id, "dispute_id": dispute_id},
            priority="urgent"
        )

        return {"success": True, "dispute_id": dispute_id, "message": "Dispute raised"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disputing escrow: {e}")
        raise HTTPException(status_code=500, detail=str(e))

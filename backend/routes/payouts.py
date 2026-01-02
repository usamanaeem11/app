"""
Payout Management Routes
Handles payout creation, processing, and tracking

IMPORTANT DISCLAIMER:
Working Tracker is a tracking and management platform only.
We DO NOT process actual payment transactions.
Both parties are solely responsible for completing payments and resolving any payment disputes.
The platform facilitates agreement and tracking but has NO LIABILITY for payment issues.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, date, timedelta
from utils.id_generator import generate_id
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

PAYOUT_DISCLAIMER = """
IMPORTANT PAYMENT DISCLAIMER:

Working Tracker is a work tracking and management platform. We DO NOT process, hold, or transfer any actual money.

The payout system is for TRACKING PURPOSES ONLY. It helps both parties:
- Track agreed payment amounts
- Schedule payment dates
- Maintain payment records
- Monitor payment status

RESPONSIBILITY:
- Both parties are 100% responsible for completing actual money transfers through their banks or payment processors
- Working Tracker has NO LIABILITY for payment disputes, non-payment, or any payment-related issues
- Any disputes must be resolved directly between the parties or through appropriate legal channels
- We do not mediate, arbitrate, or intervene in payment matters

By using this payout system, both parties acknowledge they understand and accept these terms.
"""


class PayoutCreate(BaseModel):
    to_user_id: str
    amount: float
    currency: str = "USD"
    payout_type: str  # salary, hourly, project, bonus, reimbursement, advance
    payment_method: str = "bank_transfer"
    from_account_id: Optional[str] = None
    to_account_id: Optional[str] = None
    expense_calculation_id: Optional[str] = None
    project_id: Optional[str] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    scheduled_for: Optional[datetime] = None
    notes: Optional[str] = None
    escrow_id: Optional[str] = None


class PayoutUpdate(BaseModel):
    status: Optional[str] = None
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None
    admin_notes: Optional[str] = None


@router.get("/disclaimer")
async def get_payout_disclaimer():
    """Get the payout system disclaimer"""
    return {
        "success": True,
        "disclaimer": PAYOUT_DISCLAIMER
    }


@router.post("")
async def create_payout(data: PayoutCreate, request: Request, user: dict):
    """Create a new payout (admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        if user["role"] not in ["admin", "hr"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        # Validate payout type
        if data.payout_type not in ["salary", "hourly", "project", "bonus", "reimbursement", "advance"]:
            raise HTTPException(status_code=400, detail="Invalid payout type")

        # Validate payment method
        if data.payment_method not in ["bank_transfer", "escrow_release", "manual", "check", "cash"]:
            raise HTTPException(status_code=400, detail="Invalid payment method")

        # Check if recipient exists
        recipient = await db.users.find_one({"user_id": data.to_user_id})
        if not recipient or recipient["company_id"] != user["company_id"]:
            raise HTTPException(status_code=404, detail="Recipient not found")

        # Validate bank accounts if specified
        if data.from_account_id:
            from_account = await db.bank_accounts.find_one({"account_id": data.from_account_id})
            if not from_account or from_account["user_id"] != user["user_id"]:
                raise HTTPException(status_code=404, detail="Source bank account not found")

        if data.to_account_id:
            to_account = await db.bank_accounts.find_one({"account_id": data.to_account_id})
            if not to_account or to_account["user_id"] != data.to_user_id:
                raise HTTPException(status_code=404, detail="Destination bank account not found")

        # Validate escrow if specified
        if data.escrow_id:
            escrow = await db.escrow_accounts.find_one({"escrow_id": data.escrow_id})
            if not escrow:
                raise HTTPException(status_code=404, detail="Escrow account not found")
            if escrow["status"] != "funded":
                raise HTTPException(status_code=400, detail="Escrow must be funded before payout")

        payout_id = generate_id("payout")

        payout_doc = {
            "payout_id": payout_id,
            "company_id": user["company_id"],
            "from_user_id": user["user_id"],
            "to_user_id": data.to_user_id,
            "from_account_id": data.from_account_id,
            "to_account_id": data.to_account_id,
            "amount": data.amount,
            "currency": data.currency,
            "payout_type": data.payout_type,
            "payment_method": data.payment_method,
            "status": "pending",
            "expense_calculation_id": data.expense_calculation_id,
            "project_id": data.project_id,
            "escrow_id": data.escrow_id,
            "period_start": data.period_start.isoformat() if data.period_start else None,
            "period_end": data.period_end.isoformat() if data.period_end else None,
            "scheduled_for": data.scheduled_for.isoformat() if data.scheduled_for else datetime.now(timezone.utc).isoformat(),
            "notes": data.notes,
            "is_recurring": False,
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        await db.payouts.insert_one(payout_doc)

        # Create notification
        from routes.notifications import create_notification
        await create_notification(
            db=db,
            company_id=user["company_id"],
            user_id=data.to_user_id,
            notification_type="payout_created",
            title="Payout Scheduled",
            message=f"A payout of {data.currency} {data.amount} has been scheduled for you",
            data={"payout_id": payout_id, "amount": data.amount, "currency": data.currency},
            priority="high"
        )

        return {
            "success": True,
            "payout_id": payout_id,
            "disclaimer": "Remember: Working Tracker tracks payments but does not process them. You are responsible for completing the actual transfer."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating payout: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def get_payouts(
    request: Request,
    user: dict,
    status: Optional[str] = None,
    user_id: Optional[str] = None
):
    """Get payouts based on user role"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        query = {"company_id": user["company_id"]}

        if status:
            query["status"] = status

        # Role-based filtering
        if user["role"] in ["employee", "manager"]:
            # Users see payouts they send or receive
            query["$or"] = [
                {"from_user_id": user["user_id"]},
                {"to_user_id": user["user_id"]}
            ]
        elif user["role"] in ["admin", "hr"]:
            # Admins can filter by user
            if user_id:
                query["$or"] = [
                    {"from_user_id": user_id},
                    {"to_user_id": user_id}
                ]

        payouts = await db.payouts.find(query, sort=[("created_at", -1)])

        # Enrich with user names
        for payout in payouts:
            from_user = await db.users.find_one({"user_id": payout["from_user_id"]})
            payout["from_user_name"] = from_user.get("name", "Unknown") if from_user else "Unknown"

            to_user = await db.users.find_one({"user_id": payout["to_user_id"]})
            payout["to_user_name"] = to_user.get("name", "Unknown") if to_user else "Unknown"

            # Add bank account info (masked)
            if payout.get("from_account_id"):
                from_account = await db.bank_accounts.find_one({"account_id": payout["from_account_id"]})
                if from_account:
                    payout["from_account_info"] = {
                        "bank_name": from_account.get("bank_name"),
                        "last4": from_account.get("account_number_last4")
                    }

            if payout.get("to_account_id"):
                to_account = await db.bank_accounts.find_one({"account_id": payout["to_account_id"]})
                if to_account:
                    payout["to_account_info"] = {
                        "bank_name": to_account.get("bank_name"),
                        "last4": to_account.get("account_number_last4")
                    }

        return {"success": True, "data": payouts}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching payouts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{payout_id}")
async def get_payout(payout_id: str, request: Request, user: dict):
    """Get payout details"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        payout = await db.payouts.find_one({"payout_id": payout_id})

        if not payout:
            raise HTTPException(status_code=404, detail="Payout not found")

        # Check permissions
        is_involved = user["user_id"] in [payout["from_user_id"], payout["to_user_id"]]
        is_admin = user["role"] in ["admin", "hr"] and payout["company_id"] == user["company_id"]

        if not (is_involved or is_admin):
            raise HTTPException(status_code=403, detail="Access denied")

        # Enrich with details
        from_user = await db.users.find_one({"user_id": payout["from_user_id"]})
        payout["from_user_name"] = from_user.get("name", "Unknown") if from_user else "Unknown"

        to_user = await db.users.find_one({"user_id": payout["to_user_id"]})
        payout["to_user_name"] = to_user.get("name", "Unknown") if to_user else "Unknown"

        return {"success": True, "data": payout}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching payout: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{payout_id}")
async def update_payout(
    payout_id: str,
    data: PayoutUpdate,
    request: Request,
    user: dict
):
    """Update payout status (admin or involved parties)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        payout = await db.payouts.find_one({"payout_id": payout_id})

        if not payout:
            raise HTTPException(status_code=404, detail="Payout not found")

        # Check permissions
        is_from_user = user["user_id"] == payout["from_user_id"]
        is_to_user = user["user_id"] == payout["to_user_id"]
        is_admin = user["role"] in ["admin", "hr"] and payout["company_id"] == user["company_id"]

        if not (is_from_user or is_to_user or is_admin):
            raise HTTPException(status_code=403, detail="Access denied")

        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}

        # Status updates
        if data.status:
            allowed_statuses = ["pending", "approved", "processing", "completed", "failed", "cancelled"]
            if data.status not in allowed_statuses:
                raise HTTPException(status_code=400, detail="Invalid status")

            # Only admin or from_user can update status to most states
            if data.status in ["approved", "cancelled"] and not (is_admin or is_from_user):
                raise HTTPException(status_code=403, detail="Not authorized to change status")

            # Both parties can mark as completed
            if data.status == "completed":
                update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
            elif data.status == "failed":
                update_data["failed_at"] = datetime.now(timezone.utc).isoformat()
            elif data.status == "processing":
                update_data["processed_at"] = datetime.now(timezone.utc).isoformat()

            update_data["status"] = data.status

        if data.transaction_reference is not None:
            update_data["transaction_reference"] = data.transaction_reference

        if data.notes is not None and (is_to_user or is_from_user):
            update_data["notes"] = data.notes

        if data.admin_notes is not None and is_admin:
            update_data["admin_notes"] = data.admin_notes

        await db.payouts.update_one(
            {"payout_id": payout_id},
            {"$set": update_data}
        )

        # Create notifications
        from routes.notifications import create_notification

        if data.status == "completed":
            # Notify both parties
            await create_notification(
                db=db,
                company_id=payout["company_id"],
                user_id=payout["to_user_id"],
                notification_type="payout_completed",
                title="Payout Completed",
                message=f"Payout of {payout['currency']} {payout['amount']} marked as completed",
                data={"payout_id": payout_id},
                priority="high"
            )

            if is_to_user:
                # Notify admin/from_user
                await create_notification(
                    db=db,
                    company_id=payout["company_id"],
                    user_id=payout["from_user_id"],
                    notification_type="payout_completed",
                    title="Payout Completed",
                    message=f"Recipient confirmed payout of {payout['currency']} {payout['amount']}",
                    data={"payout_id": payout_id},
                    priority="normal"
                )

        return {"success": True, "message": "Payout updated"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating payout: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary/stats")
async def get_payout_stats(request: Request, user: dict):
    """Get payout statistics for the user"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        # Get payouts sent (if admin)
        sent_query = {
            "company_id": user["company_id"],
            "from_user_id": user["user_id"]
        }

        # Get payouts received
        received_query = {
            "company_id": user["company_id"],
            "to_user_id": user["user_id"]
        }

        sent_payouts = await db.payouts.find(sent_query)
        received_payouts = await db.payouts.find(received_query)

        # Calculate totals
        sent_total = sum(p["amount"] for p in sent_payouts)
        received_total = sum(p["amount"] for p in received_payouts)

        # Count by status
        sent_pending = len([p for p in sent_payouts if p["status"] == "pending"])
        received_pending = len([p for p in received_payouts if p["status"] == "pending"])

        sent_completed = len([p for p in sent_payouts if p["status"] == "completed"])
        received_completed = len([p for p in received_payouts if p["status"] == "completed"])

        return {
            "success": True,
            "data": {
                "sent": {
                    "total_amount": sent_total,
                    "count": len(sent_payouts),
                    "pending": sent_pending,
                    "completed": sent_completed
                },
                "received": {
                    "total_amount": received_total,
                    "count": len(received_payouts),
                    "pending": received_pending,
                    "completed": received_completed
                }
            }
        }

    except Exception as e:
        logger.error(f"Error fetching payout stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{payout_id}")
async def cancel_payout(payout_id: str, request: Request, user: dict):
    """Cancel a payout (admin only, only if not completed)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        payout = await db.payouts.find_one({"payout_id": payout_id})

        if not payout:
            raise HTTPException(status_code=404, detail="Payout not found")

        if user["role"] not in ["admin", "hr"] or payout["company_id"] != user["company_id"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        if payout["status"] in ["completed", "cancelled"]:
            raise HTTPException(status_code=400, detail=f"Cannot cancel {payout['status']} payout")

        await db.payouts.update_one(
            {"payout_id": payout_id},
            {
                "$set": {
                    "status": "cancelled",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

        # Notify recipient
        from routes.notifications import create_notification
        await create_notification(
            db=db,
            company_id=payout["company_id"],
            user_id=payout["to_user_id"],
            notification_type="payout_cancelled",
            title="Payout Cancelled",
            message=f"Payout of {payout['currency']} {payout['amount']} has been cancelled",
            data={"payout_id": payout_id},
            priority="high"
        )

        return {"success": True, "message": "Payout cancelled"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling payout: {e}")
        raise HTTPException(status_code=500, detail=str(e))

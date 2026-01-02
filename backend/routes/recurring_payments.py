"""
Recurring Payment Schedules Routes
Handles automated recurring payments for permanent employees
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, date, timedelta
from dateutil.relativedelta import relativedelta
from utils.id_generator import generate_id
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class RecurringScheduleCreate(BaseModel):
    employee_id: str
    amount: float
    currency: str = "USD"
    frequency: str  # weekly, bi_weekly, semi_monthly, monthly, quarterly, yearly
    start_date: date
    end_date: Optional[date] = None
    wage_id: Optional[str] = None
    from_account_id: Optional[str] = None
    to_account_id: Optional[str] = None
    notes: Optional[str] = None


class RecurringScheduleUpdate(BaseModel):
    amount: Optional[float] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class PauseSchedule(BaseModel):
    pause_reason: str


def calculate_next_payment_date(current_date: date, frequency: str) -> date:
    """Calculate the next payment date based on frequency"""
    if frequency == "weekly":
        return current_date + timedelta(days=7)
    elif frequency == "bi_weekly":
        return current_date + timedelta(days=14)
    elif frequency == "semi_monthly":
        # 15th and last day of month
        if current_date.day < 15:
            return current_date.replace(day=15)
        else:
            next_month = current_date + relativedelta(months=1)
            return next_month.replace(day=1)
    elif frequency == "monthly":
        return current_date + relativedelta(months=1)
    elif frequency == "quarterly":
        return current_date + relativedelta(months=3)
    elif frequency == "yearly":
        return current_date + relativedelta(years=1)
    else:
        return current_date


@router.post("")
async def create_recurring_schedule(data: RecurringScheduleCreate, request: Request, user: dict):
    """Create a recurring payment schedule (admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        if user["role"] not in ["admin", "hr"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        # Validate frequency
        valid_frequencies = ["weekly", "bi_weekly", "semi_monthly", "monthly", "quarterly", "yearly"]
        if data.frequency not in valid_frequencies:
            raise HTTPException(status_code=400, detail="Invalid frequency")

        # Check if employee exists
        employee = await db.users.find_one({"user_id": data.employee_id})
        if not employee or employee["company_id"] != user["company_id"]:
            raise HTTPException(status_code=404, detail="Employee not found")

        # Check if employee already has an active schedule
        existing = await db.recurring_payment_schedules.find_one({
            "employee_id": data.employee_id,
            "is_active": True
        })

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Employee already has an active recurring payment schedule"
            )

        schedule_id = generate_id("rec_schedule")
        next_payment = calculate_next_payment_date(data.start_date, data.frequency)

        schedule_doc = {
            "schedule_id": schedule_id,
            "company_id": user["company_id"],
            "admin_id": user["user_id"],
            "employee_id": data.employee_id,
            "amount": data.amount,
            "currency": data.currency,
            "frequency": data.frequency,
            "start_date": data.start_date.isoformat(),
            "end_date": data.end_date.isoformat() if data.end_date else None,
            "next_payment_date": next_payment.isoformat(),
            "is_active": True,
            "is_paused": False,
            "wage_id": data.wage_id,
            "from_account_id": data.from_account_id,
            "to_account_id": data.to_account_id,
            "total_payments_made": 0,
            "notes": data.notes,
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        await db.recurring_payment_schedules.insert_one(schedule_doc)

        # Create notification
        from routes.notifications import create_notification
        await create_notification(
            db=db,
            company_id=user["company_id"],
            user_id=data.employee_id,
            notification_type="recurring_payment_created",
            title="Recurring Payment Schedule Created",
            message=f"A {data.frequency} recurring payment of {data.currency} {data.amount} has been set up",
            data={"schedule_id": schedule_id, "amount": data.amount, "frequency": data.frequency},
            priority="normal"
        )

        return {"success": True, "schedule_id": schedule_id, "next_payment_date": next_payment.isoformat()}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating recurring schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def get_recurring_schedules(
    request: Request,
    user: dict,
    employee_id: Optional[str] = None,
    is_active: Optional[bool] = None
):
    """Get recurring payment schedules"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        query = {"company_id": user["company_id"]}

        if is_active is not None:
            query["is_active"] = is_active

        # Role-based filtering
        if user["role"] in ["employee", "manager"]:
            query["employee_id"] = user["user_id"]
        elif user["role"] in ["admin", "hr"]:
            if employee_id:
                query["employee_id"] = employee_id

        schedules = await db.recurring_payment_schedules.find(query, sort=[("created_at", -1)])

        # Enrich with employee names
        for schedule in schedules:
            employee = await db.users.find_one({"user_id": schedule["employee_id"]})
            schedule["employee_name"] = employee.get("name", "Unknown") if employee else "Unknown"

        return {"success": True, "data": schedules}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching recurring schedules: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{schedule_id}")
async def update_recurring_schedule(
    schedule_id: str,
    data: RecurringScheduleUpdate,
    request: Request,
    user: dict
):
    """Update recurring payment schedule (admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        schedule = await db.recurring_payment_schedules.find_one({"schedule_id": schedule_id})

        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")

        if user["role"] not in ["admin", "hr"] or schedule["company_id"] != user["company_id"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}

        if data.amount is not None:
            update_data["amount"] = data.amount
        if data.end_date is not None:
            update_data["end_date"] = data.end_date.isoformat()
        if data.is_active is not None:
            update_data["is_active"] = data.is_active
        if data.notes is not None:
            update_data["notes"] = data.notes

        await db.recurring_payment_schedules.update_one(
            {"schedule_id": schedule_id},
            {"$set": update_data}
        )

        # Notify employee if amount changed
        if data.amount is not None:
            from routes.notifications import create_notification
            await create_notification(
                db=db,
                company_id=schedule["company_id"],
                user_id=schedule["employee_id"],
                notification_type="recurring_payment_updated",
                title="Recurring Payment Updated",
                message=f"Your recurring payment has been updated to {schedule['currency']} {data.amount}",
                data={"schedule_id": schedule_id},
                priority="normal"
            )

        return {"success": True, "message": "Schedule updated"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating recurring schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{schedule_id}/pause")
async def pause_recurring_schedule(
    schedule_id: str,
    data: PauseSchedule,
    request: Request,
    user: dict
):
    """Pause a recurring payment schedule (admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        schedule = await db.recurring_payment_schedules.find_one({"schedule_id": schedule_id})

        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")

        if user["role"] not in ["admin", "hr"] or schedule["company_id"] != user["company_id"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        if schedule["is_paused"]:
            raise HTTPException(status_code=400, detail="Schedule already paused")

        await db.recurring_payment_schedules.update_one(
            {"schedule_id": schedule_id},
            {
                "$set": {
                    "is_paused": True,
                    "paused_at": datetime.now(timezone.utc).isoformat(),
                    "paused_by": user["user_id"],
                    "pause_reason": data.pause_reason,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

        # Notify employee
        from routes.notifications import create_notification
        await create_notification(
            db=db,
            company_id=schedule["company_id"],
            user_id=schedule["employee_id"],
            notification_type="recurring_payment_paused",
            title="Recurring Payment Paused",
            message=f"Your recurring payment has been paused. Reason: {data.pause_reason}",
            data={"schedule_id": schedule_id},
            priority="high"
        )

        return {"success": True, "message": "Schedule paused"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pausing recurring schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{schedule_id}/resume")
async def resume_recurring_schedule(schedule_id: str, request: Request, user: dict):
    """Resume a paused recurring payment schedule (admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        schedule = await db.recurring_payment_schedules.find_one({"schedule_id": schedule_id})

        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")

        if user["role"] not in ["admin", "hr"] or schedule["company_id"] != user["company_id"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        if not schedule["is_paused"]:
            raise HTTPException(status_code=400, detail="Schedule is not paused")

        # Calculate new next payment date
        next_payment = calculate_next_payment_date(date.today(), schedule["frequency"])

        await db.recurring_payment_schedules.update_one(
            {"schedule_id": schedule_id},
            {
                "$set": {
                    "is_paused": False,
                    "paused_at": None,
                    "paused_by": None,
                    "pause_reason": None,
                    "next_payment_date": next_payment.isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

        # Notify employee
        from routes.notifications import create_notification
        await create_notification(
            db=db,
            company_id=schedule["company_id"],
            user_id=schedule["employee_id"],
            notification_type="recurring_payment_resumed",
            title="Recurring Payment Resumed",
            message=f"Your recurring payment has been resumed. Next payment: {next_payment.isoformat()}",
            data={"schedule_id": schedule_id},
            priority="normal"
        )

        return {"success": True, "message": "Schedule resumed", "next_payment_date": next_payment.isoformat()}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resuming recurring schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{schedule_id}/process")
async def process_scheduled_payment(schedule_id: str, request: Request, user: dict):
    """Manually trigger a scheduled payment (admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        schedule = await db.recurring_payment_schedules.find_one({"schedule_id": schedule_id})

        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")

        if user["role"] not in ["admin", "hr"] or schedule["company_id"] != user["company_id"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        if not schedule["is_active"] or schedule["is_paused"]:
            raise HTTPException(status_code=400, detail="Schedule is not active")

        # Create payout
        payout_id = generate_id("payout")
        payout_doc = {
            "payout_id": payout_id,
            "company_id": schedule["company_id"],
            "from_user_id": schedule["admin_id"],
            "to_user_id": schedule["employee_id"],
            "from_account_id": schedule.get("from_account_id"),
            "to_account_id": schedule.get("to_account_id"),
            "amount": schedule["amount"],
            "currency": schedule["currency"],
            "payout_type": "salary",
            "payment_method": "bank_transfer",
            "status": "approved",
            "is_recurring": True,
            "recurring_schedule_id": schedule_id,
            "scheduled_for": datetime.now(timezone.utc).isoformat(),
            "notes": f"Recurring payment - {schedule['frequency']}",
            "created_by": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payouts.insert_one(payout_doc)

        # Update schedule
        next_payment = calculate_next_payment_date(date.today(), schedule["frequency"])
        await db.recurring_payment_schedules.update_one(
            {"schedule_id": schedule_id},
            {
                "$set": {
                    "total_payments_made": schedule.get("total_payments_made", 0) + 1,
                    "last_payment_date": date.today().isoformat(),
                    "last_payout_id": payout_id,
                    "next_payment_date": next_payment.isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

        # Notify employee
        from routes.notifications import create_notification
        await create_notification(
            db=db,
            company_id=schedule["company_id"],
            user_id=schedule["employee_id"],
            notification_type="recurring_payment_processed",
            title="Recurring Payment Processed",
            message=f"Your {schedule['frequency']} payment of {schedule['currency']} {schedule['amount']} has been processed",
            data={"schedule_id": schedule_id, "payout_id": payout_id},
            priority="high"
        )

        return {
            "success": True,
            "payout_id": payout_id,
            "next_payment_date": next_payment.isoformat(),
            "message": "Payment processed"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing scheduled payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{schedule_id}")
async def delete_recurring_schedule(schedule_id: str, request: Request, user: dict):
    """Delete (deactivate) a recurring payment schedule (admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        schedule = await db.recurring_payment_schedules.find_one({"schedule_id": schedule_id})

        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")

        if user["role"] not in ["admin", "hr"] or schedule["company_id"] != user["company_id"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        await db.recurring_payment_schedules.update_one(
            {"schedule_id": schedule_id},
            {
                "$set": {
                    "is_active": False,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

        # Notify employee
        from routes.notifications import create_notification
        await create_notification(
            db=db,
            company_id=schedule["company_id"],
            user_id=schedule["employee_id"],
            notification_type="recurring_payment_cancelled",
            title="Recurring Payment Cancelled",
            message=f"Your recurring payment of {schedule['currency']} {schedule['amount']} has been cancelled",
            data={"schedule_id": schedule_id},
            priority="high"
        )

        return {"success": True, "message": "Schedule deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting recurring schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

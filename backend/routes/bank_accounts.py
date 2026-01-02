"""
Bank Account Management Routes
Handles secure bank account information for payouts
NOTE: Actual encryption should be implemented in production
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from utils.id_generator import generate_id
import logging
import hashlib

router = APIRouter()
logger = logging.getLogger(__name__)


class BankAccountCreate(BaseModel):
    account_holder_name: str
    account_type: str  # checking, savings, business, escrow
    bank_name: Optional[str] = None
    account_number: str
    routing_number: Optional[str] = None
    swift_code: Optional[str] = None
    iban: Optional[str] = None
    country: str = "US"
    currency: str = "USD"
    is_primary: bool = False


class BankAccountUpdate(BaseModel):
    account_holder_name: Optional[str] = None
    bank_name: Optional[str] = None
    is_primary: Optional[bool] = None
    is_active: Optional[bool] = None


def encrypt_sensitive_data(data: str) -> str:
    """
    Placeholder encryption function
    In production, use proper encryption library (e.g., cryptography, Fernet)
    """
    return hashlib.sha256(data.encode()).hexdigest()


def get_last_4_digits(account_number: str) -> str:
    """Get last 4 digits of account number for display"""
    return account_number[-4:] if len(account_number) >= 4 else account_number


@router.post("")
async def add_bank_account(data: BankAccountCreate, request: Request, user: dict):
    """Add a bank account for the user"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        # Validate account type
        if data.account_type not in ["checking", "savings", "business", "escrow"]:
            raise HTTPException(status_code=400, detail="Invalid account type")

        # If setting as primary, unset other primary accounts
        if data.is_primary:
            await db.bank_accounts.update_many(
                {
                    "user_id": user["user_id"],
                    "is_primary": True
                },
                {"$set": {"is_primary": False}}
            )

        account_id = generate_id("bank")

        # Encrypt sensitive data (in production, use proper encryption)
        account_doc = {
            "account_id": account_id,
            "company_id": user["company_id"],
            "user_id": user["user_id"],
            "account_holder_name": data.account_holder_name,
            "account_type": data.account_type,
            "bank_name": data.bank_name,
            "account_number_last4": get_last_4_digits(data.account_number),
            "routing_number_encrypted": encrypt_sensitive_data(data.routing_number) if data.routing_number else None,
            "account_number_encrypted": encrypt_sensitive_data(data.account_number),
            "swift_code": data.swift_code,
            "iban": data.iban,
            "country": data.country,
            "currency": data.currency,
            "is_primary": data.is_primary,
            "is_verified": False,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        await db.bank_accounts.insert_one(account_doc)

        # Remove sensitive data from response
        response_data = {k: v for k, v in account_doc.items()
                        if k not in ["account_number_encrypted", "routing_number_encrypted"]}

        return {"success": True, "account_id": account_id, "data": response_data}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding bank account: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def get_bank_accounts(request: Request, user: dict, user_id: Optional[str] = None):
    """Get bank accounts for user"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        # Check if requesting another user's accounts (admin only)
        if user_id and user_id != user["user_id"]:
            if user["role"] not in ["admin", "hr"]:
                raise HTTPException(status_code=403, detail="Admin access required")

            # Check if user is in same company
            target_user = await db.users.find_one({"user_id": user_id})
            if not target_user or target_user["company_id"] != user["company_id"]:
                raise HTTPException(status_code=404, detail="User not found")
        else:
            user_id = user["user_id"]

        accounts = await db.bank_accounts.find({
            "user_id": user_id,
            "is_active": True
        })

        # Remove sensitive data
        for account in accounts:
            account.pop("account_number_encrypted", None)
            account.pop("routing_number_encrypted", None)

        return {"success": True, "data": accounts}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching bank accounts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{account_id}")
async def update_bank_account(
    account_id: str,
    data: BankAccountUpdate,
    request: Request,
    user: dict
):
    """Update bank account information"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        account = await db.bank_accounts.find_one({"account_id": account_id})

        if not account:
            raise HTTPException(status_code=404, detail="Bank account not found")

        # Check permissions
        is_owner = user["user_id"] == account["user_id"]
        is_admin = user["role"] in ["admin", "hr"] and user["company_id"] == account["company_id"]

        if not (is_owner or is_admin):
            raise HTTPException(status_code=403, detail="Access denied")

        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}

        if data.account_holder_name is not None:
            update_data["account_holder_name"] = data.account_holder_name
        if data.bank_name is not None:
            update_data["bank_name"] = data.bank_name
        if data.is_primary is not None:
            # If setting as primary, unset other primary accounts
            if data.is_primary:
                await db.bank_accounts.update_many(
                    {
                        "user_id": account["user_id"],
                        "is_primary": True
                    },
                    {"$set": {"is_primary": False}}
                )
            update_data["is_primary"] = data.is_primary
        if data.is_active is not None:
            update_data["is_active"] = data.is_active

        await db.bank_accounts.update_one(
            {"account_id": account_id},
            {"$set": update_data}
        )

        return {"success": True, "message": "Bank account updated"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating bank account: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{account_id}")
async def delete_bank_account(account_id: str, request: Request, user: dict):
    """Delete (deactivate) a bank account"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        account = await db.bank_accounts.find_one({"account_id": account_id})

        if not account:
            raise HTTPException(status_code=404, detail="Bank account not found")

        if user["user_id"] != account["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Check if account is used in active payouts or escrow
        active_payouts = await db.payouts.count_documents({
            "$or": [
                {"from_account_id": account_id},
                {"to_account_id": account_id}
            ],
            "status": {"$in": ["pending", "approved", "processing"]}
        })

        if active_payouts > 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete account with active payouts. Please wait for payouts to complete."
            )

        # Soft delete
        await db.bank_accounts.update_one(
            {"account_id": account_id},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )

        return {"success": True, "message": "Bank account deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting bank account: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{account_id}/verify")
async def verify_bank_account(account_id: str, request: Request, user: dict):
    """Mark bank account as verified (admin only or manual verification)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        account = await db.bank_accounts.find_one({"account_id": account_id})

        if not account:
            raise HTTPException(status_code=404, detail="Bank account not found")

        # Check permissions
        is_owner = user["user_id"] == account["user_id"]
        is_admin = user["role"] in ["admin", "hr"] and user["company_id"] == account["company_id"]

        if not (is_owner or is_admin):
            raise HTTPException(status_code=403, detail="Access denied")

        await db.bank_accounts.update_one(
            {"account_id": account_id},
            {
                "$set": {
                    "is_verified": True,
                    "verification_method": "manual",
                    "verified_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

        return {"success": True, "message": "Bank account verified"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying bank account: {e}")
        raise HTTPException(status_code=500, detail=str(e))

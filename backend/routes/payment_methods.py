"""
Payment Methods Integration
===========================
Supports: Card (Stripe), PayPal, Payoneer, Wise
With auto-recurring payment option
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import os
import uuid
import logging

router = APIRouter(prefix="/payment-methods", tags=["payment-methods"])
logger = logging.getLogger(__name__)

# ==================== CONFIGURATION ====================

class PaymentProvider(str, Enum):
    CARD = "card"  # Stripe
    PAYPAL = "paypal"
    PAYONEER = "payoneer"
    WISE = "wise"

# Provider configurations from environment
PAYMENT_CONFIGS = {
    "card": {
        "provider": "stripe",
        "api_key": os.environ.get("STRIPE_API_KEY"),
        "enabled": True
    },
    "paypal": {
        "client_id": os.environ.get("PAYPAL_CLIENT_ID"),
        "client_secret": os.environ.get("PAYPAL_CLIENT_SECRET"),
        "mode": os.environ.get("PAYPAL_MODE", "sandbox"),  # sandbox or live
        "enabled": bool(os.environ.get("PAYPAL_CLIENT_ID"))
    },
    "payoneer": {
        "partner_id": os.environ.get("PAYONEER_PARTNER_ID"),
        "api_password": os.environ.get("PAYONEER_API_PASSWORD"),
        "enabled": bool(os.environ.get("PAYONEER_PARTNER_ID"))
    },
    "wise": {
        "api_token": os.environ.get("WISE_API_TOKEN"),
        "profile_id": os.environ.get("WISE_PROFILE_ID"),
        "enabled": bool(os.environ.get("WISE_API_TOKEN"))
    }
}

# Supported currencies
SUPPORTED_CURRENCIES = [
    {"code": "USD", "symbol": "$", "name": "US Dollar"},
    {"code": "EUR", "symbol": "€", "name": "Euro"},
    {"code": "GBP", "symbol": "£", "name": "British Pound"},
    {"code": "CAD", "symbol": "C$", "name": "Canadian Dollar"},
    {"code": "AUD", "symbol": "A$", "name": "Australian Dollar"},
    {"code": "INR", "symbol": "₹", "name": "Indian Rupee"},
    {"code": "JPY", "symbol": "¥", "name": "Japanese Yen"},
    {"code": "CNY", "symbol": "¥", "name": "Chinese Yuan"},
    {"code": "BRL", "symbol": "R$", "name": "Brazilian Real"},
    {"code": "MXN", "symbol": "$", "name": "Mexican Peso"},
]

# ==================== MODELS ====================

class PaymentMethodInfo(BaseModel):
    provider: str
    last_four: Optional[str] = None  # For cards
    email: Optional[str] = None  # For PayPal/Payoneer/Wise
    is_default: bool = False
    auto_recurring: bool = True

class AddPaymentMethodRequest(BaseModel):
    provider: str
    token: Optional[str] = None  # Payment provider token
    email: Optional[str] = None  # For PayPal/Payoneer/Wise
    auto_recurring: bool = True
    set_as_default: bool = False

class CreatePaymentRequest(BaseModel):
    amount: float
    currency: str
    payment_method_id: str
    description: Optional[str] = None
    metadata: Optional[dict] = None

class UpdateAutoRecurringRequest(BaseModel):
    payment_method_id: str
    auto_recurring: bool

# ==================== ENDPOINTS ====================

@router.get("/available")
async def get_available_payment_methods():
    """Get list of available payment methods"""
    methods = []
    
    # Card (Stripe)
    methods.append({
        "id": "card",
        "name": "Credit/Debit Card",
        "provider": "stripe",
        "icon": "credit-card",
        "enabled": PAYMENT_CONFIGS["card"]["enabled"],
        "supports_recurring": True,
        "description": "Pay with Visa, Mastercard, or American Express"
    })
    
    # PayPal
    methods.append({
        "id": "paypal",
        "name": "PayPal",
        "provider": "paypal",
        "icon": "paypal",
        "enabled": PAYMENT_CONFIGS["paypal"]["enabled"],
        "supports_recurring": True,
        "description": "Pay securely with your PayPal account"
    })
    
    # Payoneer
    methods.append({
        "id": "payoneer",
        "name": "Payoneer",
        "provider": "payoneer",
        "icon": "payoneer",
        "enabled": PAYMENT_CONFIGS["payoneer"]["enabled"],
        "supports_recurring": True,
        "description": "Pay with Payoneer balance"
    })
    
    # Wise
    methods.append({
        "id": "wise",
        "name": "Wise",
        "provider": "wise",
        "icon": "wise",
        "enabled": PAYMENT_CONFIGS["wise"]["enabled"],
        "supports_recurring": False,  # Wise doesn't support auto-recurring directly
        "description": "Pay with Wise (TransferWise)"
    })
    
    return {
        "methods": methods,
        "currencies": SUPPORTED_CURRENCIES
    }

@router.get("/user/{user_id}")
async def get_user_payment_methods(user_id: str, request: Request):
    """Get saved payment methods for a user"""
    db = request.app.state.db
    
    methods = await db.payment_methods.find(
        {"user_id": user_id, "status": "active"},
        {"_id": 0}
    ).to_list(100)
    
    return {"payment_methods": methods}

@router.post("/add")
async def add_payment_method(data: AddPaymentMethodRequest, request: Request):
    """Add a new payment method"""
    db = request.app.state.db
    
    # Get user from auth
    auth_header = request.headers.get('Authorization', '')
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Validate provider
    if data.provider not in ["card", "paypal", "payoneer", "wise"]:
        raise HTTPException(status_code=400, detail="Invalid payment provider")
    
    if not PAYMENT_CONFIGS[data.provider]["enabled"]:
        raise HTTPException(status_code=503, detail=f"{data.provider} is not configured")
    
    payment_method_id = f"pm_{uuid.uuid4().hex[:12]}"
    
    # Process based on provider
    payment_method = {
        "payment_method_id": payment_method_id,
        "provider": data.provider,
        "auto_recurring": data.auto_recurring,
        "is_default": data.set_as_default,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if data.provider == "card":
        # In production, this would verify the card with Stripe
        payment_method["card_brand"] = "visa"  # Would come from Stripe
        payment_method["last_four"] = "4242"  # Would come from Stripe
        payment_method["exp_month"] = 12
        payment_method["exp_year"] = 2027
        
    elif data.provider in ["paypal", "payoneer", "wise"]:
        if not data.email:
            raise HTTPException(status_code=400, detail="Email required for this payment method")
        payment_method["email"] = data.email
    
    # If setting as default, unset other defaults
    if data.set_as_default:
        await db.payment_methods.update_many(
            {"status": "active"},
            {"$set": {"is_default": False}}
        )
    
    await db.payment_methods.insert_one(payment_method)
    
    return {
        "payment_method_id": payment_method_id,
        "provider": data.provider,
        "status": "added",
        "auto_recurring": data.auto_recurring
    }

@router.put("/auto-recurring")
async def update_auto_recurring(data: UpdateAutoRecurringRequest, request: Request):
    """Update auto-recurring setting for a payment method"""
    db = request.app.state.db
    
    result = await db.payment_methods.update_one(
        {"payment_method_id": data.payment_method_id},
        {"$set": {
            "auto_recurring": data.auto_recurring,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Payment method not found")
    
    return {
        "payment_method_id": data.payment_method_id,
        "auto_recurring": data.auto_recurring,
        "message": f"Auto-recurring {'enabled' if data.auto_recurring else 'disabled'}"
    }

@router.delete("/{payment_method_id}")
async def remove_payment_method(payment_method_id: str, request: Request):
    """Remove a payment method"""
    db = request.app.state.db
    
    result = await db.payment_methods.update_one(
        {"payment_method_id": payment_method_id},
        {"$set": {
            "status": "removed",
            "removed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Payment method not found")
    
    return {"status": "removed", "payment_method_id": payment_method_id}

@router.put("/default/{payment_method_id}")
async def set_default_payment_method(payment_method_id: str, request: Request):
    """Set a payment method as default"""
    db = request.app.state.db
    
    # Unset all defaults
    await db.payment_methods.update_many(
        {"status": "active"},
        {"$set": {"is_default": False}}
    )
    
    # Set new default
    result = await db.payment_methods.update_one(
        {"payment_method_id": payment_method_id, "status": "active"},
        {"$set": {"is_default": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Payment method not found")
    
    return {"status": "default_set", "payment_method_id": payment_method_id}

@router.post("/process")
async def process_payment(data: CreatePaymentRequest, request: Request):
    """Process a payment"""
    db = request.app.state.db
    
    # Get payment method
    payment_method = await db.payment_methods.find_one(
        {"payment_method_id": data.payment_method_id, "status": "active"},
        {"_id": 0}
    )
    
    if not payment_method:
        raise HTTPException(status_code=404, detail="Payment method not found")
    
    # Validate currency
    if data.currency not in [c["code"] for c in SUPPORTED_CURRENCIES]:
        raise HTTPException(status_code=400, detail="Unsupported currency")
    
    # Create payment record
    payment_id = f"pay_{uuid.uuid4().hex[:12]}"
    
    payment = {
        "payment_id": payment_id,
        "payment_method_id": data.payment_method_id,
        "provider": payment_method["provider"],
        "amount": data.amount,
        "currency": data.currency,
        "description": data.description,
        "metadata": data.metadata,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # In production, this would actually process the payment
    # For now, simulate success
    payment["status"] = "processing"
    
    await db.payments.insert_one(payment)
    
    # Return payment initiation response
    # In production, this would return provider-specific data
    # (Stripe client secret, PayPal order ID, etc.)
    
    return {
        "payment_id": payment_id,
        "status": "processing",
        "provider": payment_method["provider"],
        "amount": data.amount,
        "currency": data.currency,
        "redirect_url": None,  # Would be set for PayPal/Wise
        "client_secret": None  # Would be set for Stripe
    }

@router.get("/currencies")
async def get_supported_currencies():
    """Get list of supported currencies"""
    return {"currencies": SUPPORTED_CURRENCIES}

@router.get("/status")
async def get_payment_providers_status():
    """Get status of payment providers"""
    return {
        "providers": {
            "card": {
                "enabled": PAYMENT_CONFIGS["card"]["enabled"],
                "configured": bool(PAYMENT_CONFIGS["card"]["api_key"])
            },
            "paypal": {
                "enabled": PAYMENT_CONFIGS["paypal"]["enabled"],
                "configured": bool(PAYMENT_CONFIGS["paypal"]["client_id"]),
                "mode": PAYMENT_CONFIGS["paypal"]["mode"]
            },
            "payoneer": {
                "enabled": PAYMENT_CONFIGS["payoneer"]["enabled"],
                "configured": bool(PAYMENT_CONFIGS["payoneer"]["partner_id"])
            },
            "wise": {
                "enabled": PAYMENT_CONFIGS["wise"]["enabled"],
                "configured": bool(PAYMENT_CONFIGS["wise"]["api_token"])
            }
        }
    }

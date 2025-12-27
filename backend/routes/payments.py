from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, Dict
import os
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
import uuid

# Import Stripe checkout from emergentintegrations
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    CheckoutStatusResponse
)

router = APIRouter(prefix="/payments", tags=["payments"])

# Subscription Plans Configuration
SUBSCRIPTION_PLANS = {
    "monthly": {
        "name": "Monthly",
        "duration_months": 1,
        "base_price_per_user": 2.00,
        "discount_percent": 0,
        "price_per_user": 2.00
    },
    "quarterly": {
        "name": "Quarterly", 
        "duration_months": 3,
        "base_price_per_user": 2.00,
        "discount_percent": 5,
        "price_per_user": 1.90
    },
    "biannual": {
        "name": "6 Months",
        "duration_months": 6,
        "base_price_per_user": 2.00,
        "discount_percent": 10,
        "price_per_user": 1.80
    },
    "yearly": {
        "name": "Yearly",
        "duration_months": 12,
        "base_price_per_user": 2.00,
        "discount_percent": 20,
        "price_per_user": 1.60
    }
}

class CheckoutRequest(BaseModel):
    plan: str
    num_users: int
    origin_url: str

class CheckoutStatusRequest(BaseModel):
    session_id: str

def get_stripe_checkout(request: Request) -> StripeCheckout:
    """Initialize Stripe checkout with webhook URL"""
    api_key = os.environ.get('STRIPE_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    return StripeCheckout(api_key=api_key, webhook_url=webhook_url)

@router.post("/checkout/session")
async def create_checkout_session(
    checkout_data: CheckoutRequest,
    request: Request
):
    """Create a Stripe checkout session for subscription payment"""
    # Validate plan
    if checkout_data.plan not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan selected")
    
    if checkout_data.num_users < 1:
        raise HTTPException(status_code=400, detail="At least 1 user required")
    
    plan = SUBSCRIPTION_PLANS[checkout_data.plan]
    
    # Calculate total amount (price per user * duration * num users)
    price_per_user = plan["price_per_user"] * plan["duration_months"]
    total_amount = float(price_per_user * checkout_data.num_users)
    
    # Build URLs from frontend origin
    success_url = f"{checkout_data.origin_url}/subscription?session_id={{CHECKOUT_SESSION_ID}}&success=true"
    cancel_url = f"{checkout_data.origin_url}/subscription?cancelled=true"
    
    # Initialize Stripe checkout
    stripe_checkout = get_stripe_checkout(request)
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=total_amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "plan": checkout_data.plan,
            "plan_name": plan["name"],
            "num_users": str(checkout_data.num_users),
            "price_per_user": str(plan["price_per_user"]),
            "duration_months": str(plan["duration_months"]),
            "discount_percent": str(plan["discount_percent"])
        }
    )
    
    try:
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        return {
            "url": session.url,
            "session_id": session.session_id,
            "amount": total_amount,
            "plan": checkout_data.plan,
            "num_users": checkout_data.num_users
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")

@router.post("/checkout/status")
async def get_checkout_status(
    status_data: CheckoutStatusRequest,
    request: Request
):
    """Get the status of a checkout session"""
    stripe_checkout = get_stripe_checkout(request)
    
    try:
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(status_data.session_id)
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency,
            "metadata": status.metadata
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get checkout status: {str(e)}")

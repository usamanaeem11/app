"""
Pricing Plans & Feature Gating System
=====================================
Three-tier subscription model with feature gating
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid

router = APIRouter(prefix="/pricing", tags=["pricing"])

# ==================== PLAN DEFINITIONS ====================

class PlanTier(str, Enum):
    STARTER = "starter"
    PRO = "pro"
    BUSINESS = "business"

class BillingCycle(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"

# Complete plan definitions with all features
PRICING_PLANS = {
    "starter": {
        "id": "starter",
        "name": "Starter",
        "description": "Perfect for freelancers & small teams",
        "monthly_price": 2.99,
        "yearly_price": 28.70,  # 20% discount
        "yearly_discount_percent": 20,
        "features": {
            # Time Tracking
            "automatic_time_tracking": True,
            "manual_timer": True,
            "timesheets": True,
            "idle_break_tracking": True,
            "activity_level_tracking": True,
            
            # Monitoring
            "app_website_usage": True,
            "screenshots": True,
            "screenshot_limit": 100,  # per user per day
            "silent_tracking": False,
            "video_screenshots": False,
            "live_screenshots": False,
            
            # Projects
            "projects_tasks": True,
            "project_budgets": False,
            
            # Reports
            "basic_reports": True,
            "advanced_reports": False,
            "exportable_reports_count": 5,
            "custom_report_builder": False,
            
            # HR Features
            "attendance_management": False,
            "leave_management": False,
            "timesheet_approvals": False,
            "shift_scheduling": False,
            "payroll": False,
            "invoices": False,
            
            # Analytics
            "productivity_metrics": False,
            "ai_time_categorization": False,
            "unusual_activity_detection": False,
            "workforce_analytics": False,
            "benchmarks_leaderboards": False,
            "work_life_balance_insights": False,
            
            # Integrations
            "integrations_count": 3,
            "unlimited_integrations": False,
            "client_access": False,
            "api_webhooks": False,
            "sso": False,
            
            # Branding & Compliance
            "white_label": False,
            "hipaa_gdpr_ready": False,
            
            # Support
            "support_level": "email",
            "dedicated_onboarding": False,
            
            # Team Chat
            "team_chat": False,
            "ai_chatbot": False,
        },
        "badge": None,
        "color": "#10b981"  # Green
    },
    "pro": {
        "id": "pro",
        "name": "Pro",
        "description": "Most popular for growing teams",
        "monthly_price": 4.99,
        "yearly_price": 47.90,  # 20% discount
        "yearly_discount_percent": 20,
        "features": {
            # Time Tracking
            "automatic_time_tracking": True,
            "manual_timer": True,
            "timesheets": True,
            "idle_break_tracking": True,
            "activity_level_tracking": True,
            
            # Monitoring
            "app_website_usage": True,
            "screenshots": True,
            "screenshot_limit": -1,  # Unlimited
            "silent_tracking": True,
            "video_screenshots": False,
            "live_screenshots": False,
            
            # Projects
            "projects_tasks": True,
            "project_budgets": True,
            
            # Reports
            "basic_reports": True,
            "advanced_reports": True,
            "exportable_reports_count": 15,
            "custom_report_builder": False,
            
            # HR Features
            "attendance_management": True,
            "leave_management": True,
            "timesheet_approvals": True,
            "shift_scheduling": True,
            "payroll": True,
            "invoices": True,
            
            # Analytics
            "productivity_metrics": True,
            "ai_time_categorization": True,  # Feature flagged
            "unusual_activity_detection": True,  # Rule-based
            "workforce_analytics": False,
            "benchmarks_leaderboards": False,
            "work_life_balance_insights": False,
            
            # Integrations
            "integrations_count": -1,  # Unlimited
            "unlimited_integrations": True,
            "client_access": True,
            "api_webhooks": False,
            "sso": False,
            
            # Branding & Compliance
            "white_label": False,
            "hipaa_gdpr_ready": False,
            
            # Support
            "support_level": "priority",
            "dedicated_onboarding": False,
            
            # Team Chat
            "team_chat": True,
            "ai_chatbot": False,
        },
        "badge": "Most Popular",
        "color": "#3b82f6"  # Blue
    },
    "business": {
        "id": "business",
        "name": "Business",
        "description": "Enterprise-grade for large organizations",
        "monthly_price": 6.99,
        "yearly_price": 67.10,  # 20% discount
        "yearly_discount_percent": 20,
        "features": {
            # Time Tracking
            "automatic_time_tracking": True,
            "manual_timer": True,
            "timesheets": True,
            "idle_break_tracking": True,
            "activity_level_tracking": True,
            
            # Monitoring
            "app_website_usage": True,
            "screenshots": True,
            "screenshot_limit": -1,  # Unlimited
            "silent_tracking": True,
            "video_screenshots": True,
            "live_screenshots": True,
            
            # Projects
            "projects_tasks": True,
            "project_budgets": True,
            
            # Reports
            "basic_reports": True,
            "advanced_reports": True,
            "exportable_reports_count": -1,  # Unlimited
            "custom_report_builder": True,
            
            # HR Features
            "attendance_management": True,
            "leave_management": True,
            "timesheet_approvals": True,
            "shift_scheduling": True,
            "payroll": True,
            "invoices": True,
            
            # Analytics
            "productivity_metrics": True,
            "ai_time_categorization": True,
            "unusual_activity_detection": True,
            "workforce_analytics": True,
            "benchmarks_leaderboards": True,
            "work_life_balance_insights": True,
            
            # Integrations
            "integrations_count": -1,  # Unlimited
            "unlimited_integrations": True,
            "client_access": True,
            "api_webhooks": True,
            "sso": True,
            
            # Branding & Compliance
            "white_label": True,
            "hipaa_gdpr_ready": True,
            
            # Support
            "support_level": "premium",
            "dedicated_onboarding": True,
            
            # Team Chat
            "team_chat": True,
            "ai_chatbot": True,
        },
        "badge": "Enterprise",
        "color": "#8b5cf6"  # Purple
    }
}

# Trial configuration
TRIAL_CONFIG = {
    "duration_days": 14,
    "plan": "pro",  # Trial includes PRO features
    "requires_card": False,
    "auto_downgrade_to": "starter"
}

# Feature categories for comparison table
FEATURE_CATEGORIES = [
    {
        "name": "Time Tracking",
        "features": [
            {"key": "automatic_time_tracking", "label": "Automatic time tracking"},
            {"key": "manual_timer", "label": "Manual timer"},
            {"key": "timesheets", "label": "Timesheets"},
            {"key": "idle_break_tracking", "label": "Idle & break tracking"},
            {"key": "activity_level_tracking", "label": "Activity level tracking"},
        ]
    },
    {
        "name": "Monitoring",
        "features": [
            {"key": "app_website_usage", "label": "App & website usage"},
            {"key": "screenshots", "label": "Screenshots", "has_limit": True},
            {"key": "silent_tracking", "label": "Silent / background tracking"},
            {"key": "video_screenshots", "label": "Video screenshots"},
            {"key": "live_screenshots", "label": "Live screenshots"},
        ]
    },
    {
        "name": "Projects & Tasks",
        "features": [
            {"key": "projects_tasks", "label": "Projects & tasks"},
            {"key": "project_budgets", "label": "Project budgets"},
        ]
    },
    {
        "name": "Reports & Analytics",
        "features": [
            {"key": "basic_reports", "label": "Basic reports"},
            {"key": "advanced_reports", "label": "Advanced reports"},
            {"key": "custom_report_builder", "label": "Custom report builder"},
            {"key": "productivity_metrics", "label": "Productivity metrics"},
            {"key": "workforce_analytics", "label": "Advanced workforce analytics"},
            {"key": "benchmarks_leaderboards", "label": "Benchmarks & leaderboards"},
            {"key": "work_life_balance_insights", "label": "Work-life balance insights"},
        ]
    },
    {
        "name": "HR & Management",
        "features": [
            {"key": "attendance_management", "label": "Attendance management"},
            {"key": "leave_management", "label": "Leave management"},
            {"key": "timesheet_approvals", "label": "Timesheet approvals"},
            {"key": "shift_scheduling", "label": "Shift scheduling"},
            {"key": "payroll", "label": "Payroll"},
            {"key": "invoices", "label": "Invoices"},
        ]
    },
    {
        "name": "AI Features",
        "features": [
            {"key": "ai_time_categorization", "label": "AI time categorization"},
            {"key": "unusual_activity_detection", "label": "Unusual activity detection"},
            {"key": "ai_chatbot", "label": "AI support chatbot"},
        ]
    },
    {
        "name": "Integrations",
        "features": [
            {"key": "unlimited_integrations", "label": "Unlimited integrations"},
            {"key": "client_access", "label": "Client access"},
            {"key": "api_webhooks", "label": "API & webhooks"},
            {"key": "sso", "label": "Single sign-on (SSO)"},
        ]
    },
    {
        "name": "Branding & Compliance",
        "features": [
            {"key": "white_label", "label": "White-label branding"},
            {"key": "hipaa_gdpr_ready", "label": "HIPAA & GDPR readiness"},
        ]
    },
    {
        "name": "Communication",
        "features": [
            {"key": "team_chat", "label": "Team chat"},
        ]
    },
    {
        "name": "Support",
        "features": [
            {"key": "dedicated_onboarding", "label": "Dedicated onboarding"},
        ]
    }
]

# ==================== MODELS ====================

class StartTrialRequest(BaseModel):
    company_id: str

class SubscribeRequest(BaseModel):
    plan: str
    billing_cycle: str
    num_users: int
    payment_method: str  # card, paypal, payoneer, wise
    auto_recurring: bool = True
    currency: str = "USD"

class UpgradeDowngradeRequest(BaseModel):
    new_plan: str
    billing_cycle: Optional[str] = None

# ==================== API ENDPOINTS ====================

@router.get("/plans")
async def get_pricing_plans():
    """Get all pricing plans with features"""
    plans = []
    for plan_id, plan in PRICING_PLANS.items():
        plans.append({
            "id": plan["id"],
            "name": plan["name"],
            "description": plan["description"],
            "monthly_price": plan["monthly_price"],
            "yearly_price": plan["yearly_price"],
            "yearly_discount_percent": plan["yearly_discount_percent"],
            "features": plan["features"],
            "badge": plan["badge"],
            "color": plan["color"]
        })
    
    return {
        "plans": plans,
        "trial": TRIAL_CONFIG,
        "feature_categories": FEATURE_CATEGORIES
    }

@router.get("/plan/{plan_id}")
async def get_plan_details(plan_id: str):
    """Get details for a specific plan"""
    if plan_id not in PRICING_PLANS:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return PRICING_PLANS[plan_id]

@router.post("/trial/start")
async def start_free_trial(data: StartTrialRequest, request: Request):
    """Start a 14-day free trial with PRO features"""
    db = request.app.state.db
    
    # Check if company already has/had a trial
    existing = await db.subscriptions.find_one({
        "company_id": data.company_id,
        "is_trial": True
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Trial already used for this company")
    
    # Check for existing active subscription
    active_sub = await db.subscriptions.find_one({
        "company_id": data.company_id,
        "status": "active"
    })
    
    if active_sub:
        raise HTTPException(status_code=400, detail="Company already has an active subscription")
    
    # Create trial subscription
    trial_end = datetime.now(timezone.utc) + timedelta(days=TRIAL_CONFIG["duration_days"])
    subscription_id = f"sub_{uuid.uuid4().hex[:12]}"
    
    subscription = {
        "subscription_id": subscription_id,
        "company_id": data.company_id,
        "plan": TRIAL_CONFIG["plan"],
        "plan_name": PRICING_PLANS[TRIAL_CONFIG["plan"]]["name"],
        "billing_cycle": "monthly",
        "is_trial": True,
        "trial_end_date": trial_end.isoformat(),
        "auto_downgrade_to": TRIAL_CONFIG["auto_downgrade_to"],
        "status": "trialing",
        "features": PRICING_PLANS[TRIAL_CONFIG["plan"]]["features"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.subscriptions.insert_one(subscription)
    
    return {
        "subscription_id": subscription_id,
        "plan": TRIAL_CONFIG["plan"],
        "trial_end_date": trial_end.isoformat(),
        "features": PRICING_PLANS[TRIAL_CONFIG["plan"]]["features"],
        "message": f"Your {TRIAL_CONFIG['duration_days']}-day free trial has started!"
    }

@router.get("/subscription/{company_id}")
async def get_subscription(company_id: str, request: Request):
    """Get current subscription for a company"""
    db = request.app.state.db
    
    subscription = await db.subscriptions.find_one(
        {"company_id": company_id, "status": {"$in": ["active", "trialing"]}},
        {"_id": 0}
    )
    
    if not subscription:
        return {
            "has_subscription": False,
            "plan": None,
            "can_start_trial": True
        }
    
    # Check if trial has expired
    if subscription.get("is_trial") and subscription.get("trial_end_date"):
        trial_end = datetime.fromisoformat(subscription["trial_end_date"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > trial_end:
            # Auto-downgrade to starter
            await db.subscriptions.update_one(
                {"subscription_id": subscription["subscription_id"]},
                {"$set": {
                    "status": "expired",
                    "expired_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Create starter subscription
            new_sub_id = f"sub_{uuid.uuid4().hex[:12]}"
            starter_sub = {
                "subscription_id": new_sub_id,
                "company_id": company_id,
                "plan": "starter",
                "plan_name": "Starter",
                "billing_cycle": "monthly",
                "is_trial": False,
                "status": "active",
                "features": PRICING_PLANS["starter"]["features"],
                "downgraded_from_trial": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.subscriptions.insert_one(starter_sub)
            
            return {
                "has_subscription": True,
                "subscription": starter_sub,
                "plan": PRICING_PLANS["starter"],
                "trial_expired": True,
                "message": "Your trial has ended. You've been moved to the Starter plan."
            }
    
    plan_details = PRICING_PLANS.get(subscription.get("plan", "starter"))
    
    return {
        "has_subscription": True,
        "subscription": subscription,
        "plan": plan_details,
        "is_trial": subscription.get("is_trial", False),
        "trial_days_remaining": None if not subscription.get("is_trial") else max(0, (
            datetime.fromisoformat(subscription["trial_end_date"].replace('Z', '+00:00')) - datetime.now(timezone.utc)
        ).days) if subscription.get("trial_end_date") else 0
    }

@router.post("/subscribe")
async def create_subscription(data: SubscribeRequest, request: Request):
    """Create a new subscription (after payment)"""
    db = request.app.state.db
    
    # Get user from auth
    auth_header = request.headers.get('Authorization', '')
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Validate plan
    if data.plan not in PRICING_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    if data.billing_cycle not in ["monthly", "yearly"]:
        raise HTTPException(status_code=400, detail="Invalid billing cycle")
    
    plan = PRICING_PLANS[data.plan]
    price = plan["monthly_price"] if data.billing_cycle == "monthly" else plan["yearly_price"]
    total = price * data.num_users
    
    # This would integrate with payment provider
    # For now, create the subscription record
    subscription_id = f"sub_{uuid.uuid4().hex[:12]}"
    
    start_date = datetime.now(timezone.utc)
    if data.billing_cycle == "monthly":
        end_date = start_date + timedelta(days=30)
    else:
        end_date = start_date + timedelta(days=365)
    
    subscription = {
        "subscription_id": subscription_id,
        "plan": data.plan,
        "plan_name": plan["name"],
        "billing_cycle": data.billing_cycle,
        "num_users": data.num_users,
        "price_per_user": price,
        "total_amount": total,
        "currency": data.currency,
        "payment_method": data.payment_method,
        "auto_recurring": data.auto_recurring,
        "is_trial": False,
        "status": "pending_payment",
        "features": plan["features"],
        "starts_at": start_date.isoformat(),
        "ends_at": end_date.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    return {
        "subscription": subscription,
        "payment_required": True,
        "amount": total,
        "currency": data.currency
    }

@router.get("/features/{company_id}")
async def get_company_features(company_id: str, request: Request):
    """Get enabled features for a company based on their subscription"""
    db = request.app.state.db
    
    subscription = await db.subscriptions.find_one(
        {"company_id": company_id, "status": {"$in": ["active", "trialing"]}},
        {"_id": 0}
    )
    
    if not subscription:
        # Return starter features as default
        return {
            "plan": "starter",
            "features": PRICING_PLANS["starter"]["features"]
        }
    
    return {
        "plan": subscription.get("plan", "starter"),
        "features": subscription.get("features", PRICING_PLANS["starter"]["features"]),
        "is_trial": subscription.get("is_trial", False)
    }

@router.post("/upgrade")
async def upgrade_plan(data: UpgradeDowngradeRequest, request: Request):
    """Upgrade to a higher plan"""
    # Implementation for plan upgrade
    if data.new_plan not in PRICING_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    return {
        "status": "upgrade_initiated",
        "new_plan": data.new_plan,
        "message": "Please complete payment to upgrade your plan"
    }

@router.post("/downgrade")
async def downgrade_plan(data: UpgradeDowngradeRequest, request: Request):
    """Downgrade to a lower plan"""
    if data.new_plan not in PRICING_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    return {
        "status": "downgrade_scheduled",
        "new_plan": data.new_plan,
        "message": "Your plan will be downgraded at the end of the current billing period"
    }

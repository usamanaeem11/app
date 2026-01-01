"""
Feature Gating Middleware
=========================
Enforces feature access based on subscription plan
"""

from fastapi import HTTPException, Request
from functools import wraps
from typing import Callable, List, Optional
import logging

logger = logging.getLogger(__name__)

# Import plan definitions
from routes.pricing import PRICING_PLANS

class FeatureGate:
    """Feature gating utility class"""
    
    @staticmethod
    async def get_company_features(db, company_id: str) -> dict:
        """Get features for a company from their subscription"""
        subscription = await db.subscriptions.find_one(
            {"company_id": company_id, "status": {"$in": ["active", "trialing"]}},
            {"_id": 0}
        )
        
        if not subscription:
            # Default to starter features
            return PRICING_PLANS["starter"]["features"]
        
        return subscription.get("features", PRICING_PLANS["starter"]["features"])
    
    @staticmethod
    async def check_feature(db, company_id: str, feature: str) -> bool:
        """Check if a feature is enabled for a company"""
        features = await FeatureGate.get_company_features(db, company_id)
        return features.get(feature, False)
    
    @staticmethod
    async def check_limit(db, company_id: str, feature: str, current_count: int) -> tuple:
        """Check if a feature limit has been reached"""
        features = await FeatureGate.get_company_features(db, company_id)
        limit = features.get(feature, 0)
        
        if limit == -1:  # Unlimited
            return True, -1, "unlimited"
        
        if limit == 0:
            return False, 0, "feature_disabled"
        
        if current_count >= limit:
            return False, limit, "limit_reached"
        
        return True, limit, "ok"
    
    @staticmethod
    def get_plan_for_feature(feature: str) -> str:
        """Get the minimum plan required for a feature"""
        for plan_id in ["starter", "pro", "business"]:
            if PRICING_PLANS[plan_id]["features"].get(feature, False):
                return plan_id
        return "business"  # Default to highest plan


def require_feature(feature: str):
    """Decorator to require a specific feature"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request: Request = kwargs.get('request')
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            if not request:
                raise HTTPException(status_code=500, detail="Request object not found")
            
            # Get company_id from user or request
            user = kwargs.get('user') or getattr(request.state, 'user', None)
            if not user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            company_id = user.get('company_id')
            if not company_id:
                raise HTTPException(status_code=400, detail="Company not found")
            
            db = request.app.state.db
            has_feature = await FeatureGate.check_feature(db, company_id, feature)
            
            if not has_feature:
                required_plan = FeatureGate.get_plan_for_feature(feature)
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "feature_not_available",
                        "feature": feature,
                        "required_plan": required_plan,
                        "message": f"This feature requires the {required_plan.title()} plan or higher"
                    }
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_features(features: List[str]):
    """Decorator to require multiple features (all must be enabled)"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request: Request = kwargs.get('request')
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            if not request:
                raise HTTPException(status_code=500, detail="Request object not found")
            
            user = kwargs.get('user') or getattr(request.state, 'user', None)
            if not user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            company_id = user.get('company_id')
            db = request.app.state.db
            company_features = await FeatureGate.get_company_features(db, company_id)
            
            missing_features = []
            for feature in features:
                if not company_features.get(feature, False):
                    missing_features.append(feature)
            
            if missing_features:
                required_plans = [FeatureGate.get_plan_for_feature(f) for f in missing_features]
                highest_plan = "business" if "business" in required_plans else ("pro" if "pro" in required_plans else "starter")
                
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "features_not_available",
                        "missing_features": missing_features,
                        "required_plan": highest_plan,
                        "message": f"This feature requires the {highest_plan.title()} plan or higher"
                    }
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


async def check_screenshot_limit(db, company_id: str, user_id: str) -> dict:
    """Check screenshot upload limit for today"""
    from datetime import datetime, timezone
    
    features = await FeatureGate.get_company_features(db, company_id)
    limit = features.get("screenshot_limit", 100)
    
    if limit == -1:
        return {"allowed": True, "limit": -1, "used": 0, "remaining": -1}
    
    # Count today's screenshots for this user
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    count = await db.screenshots.count_documents({
        "user_id": user_id,
        "taken_at": {"$gte": today_start.isoformat()}
    })
    
    return {
        "allowed": count < limit,
        "limit": limit,
        "used": count,
        "remaining": max(0, limit - count)
    }


async def check_integration_limit(db, company_id: str) -> dict:
    """Check integration connection limit"""
    features = await FeatureGate.get_company_features(db, company_id)
    
    if features.get("unlimited_integrations"):
        return {"allowed": True, "limit": -1, "used": 0, "remaining": -1}
    
    limit = features.get("integrations_count", 3)
    
    # Count active integrations
    count = await db.integrations.count_documents({
        "company_id": company_id,
        "status": "active"
    })
    
    return {
        "allowed": count < limit,
        "limit": limit,
        "used": count,
        "remaining": max(0, limit - count)
    }


async def check_report_export_limit(db, company_id: str) -> dict:
    """Check report export limit for this month"""
    from datetime import datetime, timezone
    
    features = await FeatureGate.get_company_features(db, company_id)
    limit = features.get("exportable_reports_count", 5)
    
    if limit == -1:
        return {"allowed": True, "limit": -1, "used": 0, "remaining": -1}
    
    # Count this month's exports
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    count = await db.report_exports.count_documents({
        "company_id": company_id,
        "exported_at": {"$gte": month_start.isoformat()}
    })
    
    return {
        "allowed": count < limit,
        "limit": limit,
        "used": count,
        "remaining": max(0, limit - count)
    }


# Feature check functions for specific features
async def can_use_silent_tracking(db, company_id: str) -> bool:
    return await FeatureGate.check_feature(db, company_id, "silent_tracking")

async def can_use_payroll(db, company_id: str) -> bool:
    return await FeatureGate.check_feature(db, company_id, "payroll")

async def can_use_invoices(db, company_id: str) -> bool:
    return await FeatureGate.check_feature(db, company_id, "invoices")

async def can_use_sso(db, company_id: str) -> bool:
    return await FeatureGate.check_feature(db, company_id, "sso")

async def can_use_api_webhooks(db, company_id: str) -> bool:
    return await FeatureGate.check_feature(db, company_id, "api_webhooks")

async def can_use_white_label(db, company_id: str) -> bool:
    return await FeatureGate.check_feature(db, company_id, "white_label")

async def can_use_video_screenshots(db, company_id: str) -> bool:
    return await FeatureGate.check_feature(db, company_id, "video_screenshots")

async def can_use_team_chat(db, company_id: str) -> bool:
    return await FeatureGate.check_feature(db, company_id, "team_chat")

async def can_use_ai_chatbot(db, company_id: str) -> bool:
    return await FeatureGate.check_feature(db, company_id, "ai_chatbot")

async def can_use_custom_reports(db, company_id: str) -> bool:
    return await FeatureGate.check_feature(db, company_id, "custom_report_builder")

async def can_use_workforce_analytics(db, company_id: str) -> bool:
    return await FeatureGate.check_feature(db, company_id, "workforce_analytics")

async def can_use_shift_scheduling(db, company_id: str) -> bool:
    return await FeatureGate.check_feature(db, company_id, "shift_scheduling")

async def can_use_attendance(db, company_id: str) -> bool:
    return await FeatureGate.check_feature(db, company_id, "attendance_management")

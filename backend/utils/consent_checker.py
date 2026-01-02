"""
Consent Checker Utilities
Validates consent for automatic tracking features
"""
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class ConsentChecker:
    """Handles consent validation for automatic tracking features"""

    @staticmethod
    async def check_employment_type(db, user_id: str) -> str:
        """
        Get user's employment type

        Returns:
            'freelancer' or 'full_time'
        """
        user = await db.users.find_one({"user_id": user_id})
        if not user:
            return "freelancer"  # Default to freelancer

        return user.get("employment_type", "freelancer")

    @staticmethod
    async def is_full_time_employee(db, user_id: str) -> bool:
        """Check if user is a full-time employee"""
        employment_type = await ConsentChecker.check_employment_type(db, user_id)
        return employment_type == "full_time"

    @staticmethod
    async def has_active_agreement(db, user_id: str) -> Optional[Dict]:
        """
        Check if user has an active work agreement

        Returns:
            Agreement dict if active agreement exists, None otherwise
        """
        agreement = await db.work_agreements.find_one({
            "employee_id": user_id,
            "status": "active",
            "admin_signed": True,
            "employee_signed": True
        })

        return agreement

    @staticmethod
    async def check_auto_timer_consent(db, user_id: str) -> Dict:
        """
        Check if user has given consent for automatic timers

        Returns:
            {
                "has_consent": bool,
                "employment_type": str,
                "reason": str
            }
        """
        employment_type = await ConsentChecker.check_employment_type(db, user_id)

        # Freelancers control their own timers (manual only)
        if employment_type == "freelancer":
            return {
                "has_consent": False,
                "employment_type": "freelancer",
                "reason": "Freelancers use manual time tracking only"
            }

        # Full-time employees need active agreement with consent
        agreement = await ConsentChecker.has_active_agreement(db, user_id)

        if not agreement:
            return {
                "has_consent": False,
                "employment_type": "full_time",
                "reason": "No active work agreement found"
            }

        has_consent = agreement.get("auto_timer_consent", False)

        return {
            "has_consent": has_consent,
            "employment_type": "full_time",
            "agreement_id": agreement.get("agreement_id"),
            "reason": "Consent given in work agreement" if has_consent else "Consent not given in work agreement"
        }

    @staticmethod
    async def check_screenshot_consent(db, user_id: str) -> Dict:
        """
        Check if user has given consent for screenshot monitoring

        Returns:
            {
                "has_consent": bool,
                "employment_type": str,
                "reason": str
            }
        """
        employment_type = await ConsentChecker.check_employment_type(db, user_id)

        # Freelancers control their own screenshots
        if employment_type == "freelancer":
            return {
                "has_consent": True,  # Freelancers can use screenshots voluntarily
                "employment_type": "freelancer",
                "reason": "Freelancer voluntary screenshot tracking"
            }

        # Full-time employees need active agreement with consent
        agreement = await ConsentChecker.has_active_agreement(db, user_id)

        if not agreement:
            return {
                "has_consent": False,
                "employment_type": "full_time",
                "reason": "No active work agreement found"
            }

        has_consent = agreement.get("screenshot_consent", False)

        return {
            "has_consent": has_consent,
            "employment_type": "full_time",
            "agreement_id": agreement.get("agreement_id"),
            "reason": "Consent given in work agreement" if has_consent else "Consent not given in work agreement"
        }

    @staticmethod
    async def check_activity_tracking_consent(db, user_id: str) -> Dict:
        """
        Check if user has given consent for activity tracking

        Returns:
            {
                "has_consent": bool,
                "employment_type": str,
                "reason": str
            }
        """
        employment_type = await ConsentChecker.check_employment_type(db, user_id)

        # Freelancers control their own activity tracking
        if employment_type == "freelancer":
            return {
                "has_consent": True,  # Freelancers can use activity tracking voluntarily
                "employment_type": "freelancer",
                "reason": "Freelancer voluntary activity tracking"
            }

        # Full-time employees need active agreement with consent
        agreement = await ConsentChecker.has_active_agreement(db, user_id)

        if not agreement:
            return {
                "has_consent": False,
                "employment_type": "full_time",
                "reason": "No active work agreement found"
            }

        has_consent = agreement.get("activity_tracking_consent", False)

        return {
            "has_consent": has_consent,
            "employment_type": "full_time",
            "agreement_id": agreement.get("agreement_id"),
            "reason": "Consent given in work agreement" if has_consent else "Consent not given in work agreement"
        }

    @staticmethod
    async def check_screen_recording_consent(db, user_id: str, company_id: str) -> Dict:
        """
        Check if user has given consent for screen recording (Business plan only)

        Returns:
            {
                "has_consent": bool,
                "employment_type": str,
                "plan": str,
                "reason": str
            }
        """
        # Check if company has Business plan
        company = await db.companies.find_one({"company_id": company_id})
        plan = company.get("subscription_plan", "starter") if company else "starter"

        if plan != "business":
            return {
                "has_consent": False,
                "plan": plan,
                "reason": "Screen recording is only available on Business plan"
            }

        employment_type = await ConsentChecker.check_employment_type(db, user_id)

        # Freelancers don't have screen recording
        if employment_type == "freelancer":
            return {
                "has_consent": False,
                "employment_type": "freelancer",
                "plan": plan,
                "reason": "Screen recording not available for freelancers"
            }

        # Full-time employees need active agreement with consent
        agreement = await ConsentChecker.has_active_agreement(db, user_id)

        if not agreement:
            return {
                "has_consent": False,
                "employment_type": "full_time",
                "plan": plan,
                "reason": "No active work agreement found"
            }

        has_consent = agreement.get("screen_recording_consent", False)

        return {
            "has_consent": has_consent,
            "employment_type": "full_time",
            "plan": plan,
            "agreement_id": agreement.get("agreement_id"),
            "reason": "Consent given in work agreement" if has_consent else "Consent not given in work agreement"
        }

    @staticmethod
    async def log_consent_check(db, user_id: str, consent_type: str, result: Dict, ip_address: str = None, user_agent: str = None):
        """
        Log consent check for audit purposes
        """
        from utils.id_generator import generate_id
        from datetime import datetime, timezone

        try:
            log_doc = {
                "audit_id": generate_id("audit"),
                "user_id": user_id,
                "agreement_id": result.get("agreement_id"),
                "consent_type": consent_type,
                "consent_given": result.get("has_consent", False),
                "given_by": user_id,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "created_at": datetime.now(timezone.utc).isoformat()
            }

            await db.consent_audit_log.insert_one(log_doc)
            logger.info(f"Consent check logged for user {user_id}: {consent_type} = {result.get('has_consent')}")
        except Exception as e:
            logger.error(f"Failed to log consent check: {e}")

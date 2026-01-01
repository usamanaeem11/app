"""
White-Label Branding
====================
Allows Business tier customers to customize the app with their own branding.
"""

from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import base64

router = APIRouter(prefix="/branding", tags=["branding"])

class BrandingSettings(BaseModel):
    company_name: str
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: str = "#10b981"  # Default emerald
    secondary_color: str = "#3b82f6"  # Default blue
    accent_color: str = "#8b5cf6"  # Default purple
    background_color: str = "#09090b"
    text_color: str = "#fafafa"
    custom_domain: Optional[str] = None
    custom_email_domain: Optional[str] = None
    hide_powered_by: bool = False
    custom_login_message: Optional[str] = None
    custom_footer_text: Optional[str] = None

class ThemePreset(BaseModel):
    name: str
    primary_color: str
    secondary_color: str
    accent_color: str
    background_color: str
    text_color: str

# Predefined theme presets
THEME_PRESETS = {
    "default": {
        "name": "Working Tracker Default",
        "primary_color": "#10b981",
        "secondary_color": "#3b82f6",
        "accent_color": "#8b5cf6",
        "background_color": "#09090b",
        "text_color": "#fafafa"
    },
    "ocean": {
        "name": "Ocean Blue",
        "primary_color": "#0ea5e9",
        "secondary_color": "#06b6d4",
        "accent_color": "#14b8a6",
        "background_color": "#0c1222",
        "text_color": "#f0f9ff"
    },
    "sunset": {
        "name": "Sunset Orange",
        "primary_color": "#f97316",
        "secondary_color": "#ef4444",
        "accent_color": "#eab308",
        "background_color": "#1c1917",
        "text_color": "#fafaf9"
    },
    "forest": {
        "name": "Forest Green",
        "primary_color": "#22c55e",
        "secondary_color": "#16a34a",
        "accent_color": "#84cc16",
        "background_color": "#0a1f0a",
        "text_color": "#f0fdf4"
    },
    "royal": {
        "name": "Royal Purple",
        "primary_color": "#a855f7",
        "secondary_color": "#8b5cf6",
        "accent_color": "#ec4899",
        "background_color": "#1a0a2e",
        "text_color": "#faf5ff"
    },
    "corporate": {
        "name": "Corporate Gray",
        "primary_color": "#6366f1",
        "secondary_color": "#4f46e5",
        "accent_color": "#818cf8",
        "background_color": "#111827",
        "text_color": "#f9fafb"
    },
    "light": {
        "name": "Light Mode",
        "primary_color": "#059669",
        "secondary_color": "#2563eb",
        "accent_color": "#7c3aed",
        "background_color": "#ffffff",
        "text_color": "#1f2937"
    }
}

@router.get("/presets")
async def get_theme_presets():
    """Get available theme presets"""
    return {
        "presets": [
            {"id": key, **value}
            for key, value in THEME_PRESETS.items()
        ]
    }

@router.get("/settings/{company_id}")
async def get_branding_settings(company_id: str, request: Request):
    """Get company branding settings"""
    db = request.app.state.db
    
    settings = await db.branding_settings.find_one(
        {"company_id": company_id},
        {"_id": 0}
    )
    
    if not settings:
        # Return default settings
        return {
            "company_id": company_id,
            "company_name": "Working Tracker",
            **THEME_PRESETS["default"],
            "hide_powered_by": False
        }
    
    return settings

@router.post("/settings/{company_id}")
async def update_branding_settings(
    company_id: str,
    settings: BrandingSettings,
    request: Request
):
    """Update company branding settings (Business tier only)"""
    db = request.app.state.db
    
    # Check if company has Business tier subscription
    subscription = await db.subscriptions.find_one(
        {"company_id": company_id},
        {"_id": 0}
    )
    
    plan = subscription.get("plan") if subscription else "starter"
    if plan != "business":
        raise HTTPException(
            status_code=403,
            detail={
                "error": "feature_not_available",
                "feature": "white_label_branding",
                "required_plan": "Business",
                "message": "White-label branding requires the Business plan."
            }
        )
    
    # Validate colors (basic hex validation)
    for color_field in ["primary_color", "secondary_color", "accent_color", "background_color", "text_color"]:
        color = getattr(settings, color_field)
        if not color.startswith("#") or len(color) not in [4, 7]:
            raise HTTPException(status_code=400, detail=f"Invalid color format for {color_field}")
    
    doc = {
        "company_id": company_id,
        **settings.dict(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.branding_settings.update_one(
        {"company_id": company_id},
        {"$set": doc},
        upsert=True
    )
    
    return {"status": "updated", "settings": doc}

@router.post("/settings/{company_id}/logo")
async def upload_logo(
    company_id: str,
    request: Request,
    file: UploadFile = File(...)
):
    """Upload company logo"""
    db = request.app.state.db
    
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Use PNG, JPEG, SVG, or WebP")
    
    # Validate file size (max 2MB)
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 2MB")
    
    # Store as base64 (in production, upload to S3)
    logo_data = base64.b64encode(content).decode()
    logo_url = f"data:{file.content_type};base64,{logo_data}"
    
    # Update branding settings
    await db.branding_settings.update_one(
        {"company_id": company_id},
        {"$set": {
            "logo_url": logo_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"status": "uploaded", "logo_url": logo_url[:100] + "..."}

@router.post("/settings/{company_id}/apply-preset")
async def apply_theme_preset(
    company_id: str,
    preset_id: str,
    request: Request
):
    """Apply a theme preset to company branding"""
    db = request.app.state.db
    
    if preset_id not in THEME_PRESETS:
        raise HTTPException(status_code=400, detail="Invalid preset ID")
    
    preset = THEME_PRESETS[preset_id]
    
    await db.branding_settings.update_one(
        {"company_id": company_id},
        {"$set": {
            "primary_color": preset["primary_color"],
            "secondary_color": preset["secondary_color"],
            "accent_color": preset["accent_color"],
            "background_color": preset["background_color"],
            "text_color": preset["text_color"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"status": "applied", "preset": preset}

@router.get("/css/{company_id}")
async def get_custom_css(company_id: str, request: Request):
    """Generate custom CSS variables for company branding"""
    db = request.app.state.db
    
    settings = await db.branding_settings.find_one(
        {"company_id": company_id},
        {"_id": 0}
    )
    
    if not settings:
        settings = THEME_PRESETS["default"]
    
    css = f"""
:root {{
  --brand-primary: {settings.get('primary_color', '#10b981')};
  --brand-secondary: {settings.get('secondary_color', '#3b82f6')};
  --brand-accent: {settings.get('accent_color', '#8b5cf6')};
  --brand-background: {settings.get('background_color', '#09090b')};
  --brand-text: {settings.get('text_color', '#fafafa')};
}}
"""
    
    return {
        "css": css,
        "variables": {
            "primary": settings.get('primary_color', '#10b981'),
            "secondary": settings.get('secondary_color', '#3b82f6'),
            "accent": settings.get('accent_color', '#8b5cf6'),
            "background": settings.get('background_color', '#09090b'),
            "text": settings.get('text_color', '#fafafa')
        }
    }

@router.delete("/settings/{company_id}")
async def reset_branding(company_id: str, request: Request):
    """Reset branding to defaults"""
    db = request.app.state.db
    
    await db.branding_settings.delete_one({"company_id": company_id})
    
    return {"status": "reset", "message": "Branding reset to defaults"}

from fastapi import APIRouter, HTTPException, Request, Depends, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
import os
import uuid
import base64
import zlib
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode, quote
import xml.etree.ElementTree as ET
import hashlib
import hmac
import logging

router = APIRouter(prefix="/sso", tags=["sso"])
logger = logging.getLogger(__name__)

# SAML Configuration
SAML_ENTITY_ID = os.environ.get('SAML_ENTITY_ID', 'workmonitor')
SAML_ACS_URL = os.environ.get('SAML_ACS_URL', 'http://localhost:8001/api/sso/saml/acs')
SAML_SLO_URL = os.environ.get('SAML_SLO_URL', 'http://localhost:8001/api/sso/saml/slo')
SAML_IDP_SSO_URL = os.environ.get('SAML_IDP_SSO_URL')  # Identity Provider SSO URL
SAML_IDP_SLO_URL = os.environ.get('SAML_IDP_SLO_URL')  # Identity Provider SLO URL
SAML_IDP_CERT = os.environ.get('SAML_IDP_CERT')  # Base64 encoded IdP certificate

class SAMLConfig(BaseModel):
    entity_id: str
    acs_url: str
    slo_url: Optional[str] = None
    idp_sso_url: Optional[str] = None
    idp_slo_url: Optional[str] = None
    idp_cert: Optional[str] = None

class SAMLConfigRequest(BaseModel):
    idp_sso_url: str
    idp_slo_url: Optional[str] = None
    idp_cert: str  # Base64 encoded certificate
    idp_entity_id: Optional[str] = None

def generate_saml_request(acs_url: str, entity_id: str, request_id: str) -> str:
    """Generate a SAML AuthnRequest"""
    issue_instant = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    saml_request = f"""<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                    ID="{request_id}"
                    Version="2.0"
                    IssueInstant="{issue_instant}"
                    Destination="{SAML_IDP_SSO_URL or ''}"
                    AssertionConsumerServiceURL="{acs_url}"
                    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
    <saml:Issuer>{entity_id}</saml:Issuer>
    <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
</samlp:AuthnRequest>"""
    
    # Deflate and base64 encode
    deflated = zlib.compress(saml_request.encode('utf-8'))[2:-4]  # Remove zlib header/footer
    encoded = base64.b64encode(deflated).decode('utf-8')
    
    return encoded

def parse_saml_response(saml_response: str) -> dict:
    """Parse SAML Response and extract user info"""
    try:
        # Decode base64
        decoded = base64.b64decode(saml_response)
        
        # Parse XML
        root = ET.fromstring(decoded)
        
        # Define namespaces
        ns = {
            'samlp': 'urn:oasis:names:tc:SAML:2.0:protocol',
            'saml': 'urn:oasis:names:tc:SAML:2.0:assertion'
        }
        
        # Check status
        status = root.find('.//samlp:StatusCode', ns)
        if status is not None:
            status_value = status.get('Value', '')
            if 'Success' not in status_value:
                raise ValueError(f"SAML authentication failed: {status_value}")
        
        # Extract assertion
        assertion = root.find('.//saml:Assertion', ns)
        if assertion is None:
            raise ValueError("No SAML assertion found")
        
        # Extract NameID (usually email)
        name_id = assertion.find('.//saml:NameID', ns)
        email = name_id.text if name_id is not None else None
        
        # Extract attributes
        attributes = {}
        attribute_statement = assertion.find('.//saml:AttributeStatement', ns)
        if attribute_statement is not None:
            for attr in attribute_statement.findall('.//saml:Attribute', ns):
                attr_name = attr.get('Name', '').split('/')[-1]  # Get last part of URI
                values = attr.findall('.//saml:AttributeValue', ns)
                if values:
                    attributes[attr_name] = values[0].text
        
        return {
            "email": email or attributes.get('email') or attributes.get('emailaddress'),
            "name": attributes.get('displayname') or attributes.get('name') or attributes.get('givenname'),
            "first_name": attributes.get('givenname') or attributes.get('firstname'),
            "last_name": attributes.get('surname') or attributes.get('lastname'),
            "groups": attributes.get('groups', '').split(',') if attributes.get('groups') else [],
            "raw_attributes": attributes
        }
        
    except ET.ParseError as e:
        raise ValueError(f"Failed to parse SAML response: {str(e)}")

@router.get("/config")
async def get_saml_config():
    """Get SAML Service Provider configuration for IdP setup"""
    return {
        "sp_config": {
            "entity_id": SAML_ENTITY_ID,
            "acs_url": SAML_ACS_URL,
            "slo_url": SAML_SLO_URL,
            "name_id_format": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
        },
        "configured": bool(SAML_IDP_SSO_URL),
        "metadata_url": f"{SAML_ACS_URL.replace('/acs', '/metadata')}"
    }

@router.get("/metadata")
async def get_saml_metadata():
    """Get SAML SP Metadata XML for IdP configuration"""
    metadata = f"""<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="{SAML_ENTITY_ID}">
    <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"
                        AuthnRequestsSigned="false"
                        WantAssertionsSigned="true">
        <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
        <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                     Location="{SAML_ACS_URL}"
                                     index="0"
                                     isDefault="true"/>
        <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                               Location="{SAML_SLO_URL}"/>
    </md:SPSSODescriptor>
</md:EntityDescriptor>"""
    
    return Response(content=metadata, media_type="application/xml")

@router.post("/configure")
async def configure_saml(config: SAMLConfigRequest, request: Request):
    """Configure SAML Identity Provider settings"""
    db = request.app.state.db
    
    # Store SAML configuration
    await db.saml_config.update_one(
        {"type": "idp"},
        {"$set": {
            "type": "idp",
            "idp_sso_url": config.idp_sso_url,
            "idp_slo_url": config.idp_slo_url,
            "idp_cert": config.idp_cert,
            "idp_entity_id": config.idp_entity_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"status": "configured", "message": "SAML IdP configuration saved"}

@router.get("/login")
async def saml_login(request: Request, relay_state: str = None):
    """Initiate SAML SSO login"""
    db = request.app.state.db
    
    # Get IdP configuration
    saml_config = await db.saml_config.find_one({"type": "idp"}, {"_id": 0})
    
    idp_sso_url = SAML_IDP_SSO_URL or (saml_config.get("idp_sso_url") if saml_config else None)
    
    if not idp_sso_url:
        raise HTTPException(
            status_code=503,
            detail="SAML SSO not configured. Please configure IdP settings first."
        )
    
    # Generate request ID
    request_id = f"_id{uuid.uuid4().hex}"
    
    # Store request for validation
    await db.saml_requests.insert_one({
        "request_id": request_id,
        "relay_state": relay_state,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    })
    
    # Generate SAML request
    saml_request = generate_saml_request(SAML_ACS_URL, SAML_ENTITY_ID, request_id)
    
    # Build redirect URL
    params = {"SAMLRequest": saml_request}
    if relay_state:
        params["RelayState"] = relay_state
    
    redirect_url = f"{idp_sso_url}?{urlencode(params)}"
    
    return {"redirect_url": redirect_url}

@router.post("/saml/acs")
async def saml_assertion_consumer_service(request: Request):
    """Handle SAML Response from IdP (Assertion Consumer Service)"""
    db = request.app.state.db
    
    form_data = await request.form()
    saml_response = form_data.get("SAMLResponse")
    relay_state = form_data.get("RelayState")
    
    if not saml_response:
        raise HTTPException(status_code=400, detail="Missing SAML response")
    
    try:
        # Parse SAML response
        user_info = parse_saml_response(saml_response)
        
        if not user_info.get("email"):
            raise HTTPException(status_code=400, detail="No email in SAML response")
        
        # Find or create user
        existing_user = await db.users.find_one({"email": user_info["email"]}, {"_id": 0})
        
        if existing_user:
            # Update last login
            await db.users.update_one(
                {"email": user_info["email"]},
                {"$set": {
                    "last_login": datetime.now(timezone.utc).isoformat(),
                    "sso_provider": "saml"
                }}
            )
            user = existing_user
        else:
            # Create new user via SSO
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user = {
                "user_id": user_id,
                "email": user_info["email"],
                "name": user_info.get("name") or user_info["email"].split("@")[0],
                "role": "employee",
                "sso_provider": "saml",
                "sso_groups": user_info.get("groups", []),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "last_login": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user)
        
        # Create session token
        import jwt
        JWT_SECRET = os.environ.get('JWT_SECRET', 'secret-key')
        token = jwt.encode({
            "user_id": user.get("user_id"),
            "email": user["email"],
            "role": user.get("role", "employee"),
            "sso": True,
            "exp": datetime.now(timezone.utc) + timedelta(days=7)
        }, JWT_SECRET, algorithm="HS256")
        
        # Redirect to frontend with token
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        redirect_path = relay_state or "/dashboard"
        
        return RedirectResponse(
            f"{frontend_url}/sso-callback?token={token}&redirect={quote(redirect_path)}",
            status_code=302
        )
        
    except ValueError as e:
        logger.error(f"SAML parsing error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"SAML ACS error: {str(e)}")
        raise HTTPException(status_code=500, detail="SAML authentication failed")

@router.get("/saml/slo")
async def saml_single_logout(request: Request, SAMLRequest: str = None):
    """Handle SAML Single Logout"""
    # In a full implementation, you would:
    # 1. Parse the SLO request
    # 2. Invalidate the user's session
    # 3. Send an SLO response back to the IdP
    
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    return RedirectResponse(f"{frontend_url}/login?slo=true", status_code=302)

@router.get("/status")
async def get_sso_status(request: Request):
    """Check SSO configuration status"""
    db = request.app.state.db
    
    saml_config = await db.saml_config.find_one({"type": "idp"}, {"_id": 0})
    
    is_configured = bool(SAML_IDP_SSO_URL or (saml_config and saml_config.get("idp_sso_url")))
    
    return {
        "saml": {
            "configured": is_configured,
            "entity_id": SAML_ENTITY_ID,
            "acs_url": SAML_ACS_URL,
            "slo_url": SAML_SLO_URL
        }
    }

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import logging

router = APIRouter(prefix="/email", tags=["email"])
logger = logging.getLogger(__name__)

# Email Templates
TEMPLATES = {
    "welcome": {
        "subject": "Welcome to WorkMonitor!",
        "body": """
Hello {name},

Welcome to WorkMonitor! Your account has been successfully created.

You can now:
- Track your working time
- View your activity reports
- Manage your team (if you're an admin)

Get started by downloading our desktop tracker or logging into the web dashboard.

Best regards,
The WorkMonitor Team
"""
    },
    "timesheet_approval": {
        "subject": "Timesheet {status}: Week of {week_start}",
        "body": """
Hello {name},

Your timesheet for the week of {week_start} has been {status}.

Total Hours: {total_hours}
{notes}

View your timesheet: {link}

Best regards,
The WorkMonitor Team
"""
    },
    "leave_request": {
        "subject": "Leave Request {status}",
        "body": """
Hello {name},

Your leave request has been {status}.

Leave Type: {leave_type}
Start Date: {start_date}
End Date: {end_date}
{notes}

Best regards,
The WorkMonitor Team
"""
    },
    "invoice": {
        "subject": "Invoice #{invoice_number} from {company_name}",
        "body": """
Hello {client_name},

Please find attached invoice #{invoice_number} for {amount}.

Due Date: {due_date}

Payment Details:
{payment_details}

If you have any questions, please don't hesitate to contact us.

Best regards,
{company_name}
"""
    },
    "subscription_renewal": {
        "subject": "Your WorkMonitor Subscription is Expiring Soon",
        "body": """
Hello {name},

Your WorkMonitor subscription will expire on {expiry_date}.

Current Plan: {plan_name}
Users: {num_users}

To continue using WorkMonitor without interruption, please renew your subscription.

Renew Now: {renewal_link}

Best regards,
The WorkMonitor Team
"""
    },
    "password_reset": {
        "subject": "Reset Your WorkMonitor Password",
        "body": """
Hello {name},

We received a request to reset your password. Click the link below to create a new password:

{reset_link}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
The WorkMonitor Team
"""
    }
}

class EmailConfig(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str
    from_email: str
    from_name: str = "WorkMonitor"
    use_tls: bool = True

class SendEmailRequest(BaseModel):
    to_email: str
    to_name: Optional[str] = None
    template: str
    variables: dict
    attachments: Optional[List[dict]] = None  # [{filename, content_base64, content_type}]

class CustomEmailRequest(BaseModel):
    to_email: str
    to_name: Optional[str] = None
    subject: str
    body: str
    html_body: Optional[str] = None
    attachments: Optional[List[dict]] = None

def get_smtp_config():
    """Get SMTP configuration from environment variables"""
    host = os.environ.get('SMTP_HOST')
    port = int(os.environ.get('SMTP_PORT', 587))
    user = os.environ.get('SMTP_USER')
    password = os.environ.get('SMTP_PASSWORD')
    from_email = os.environ.get('SMTP_FROM_EMAIL', user)
    from_name = os.environ.get('SMTP_FROM_NAME', 'WorkMonitor')
    use_tls = os.environ.get('SMTP_USE_TLS', 'true').lower() == 'true'
    
    if not all([host, user, password]):
        return None
    
    return EmailConfig(
        smtp_host=host,
        smtp_port=port,
        smtp_user=user,
        smtp_password=password,
        from_email=from_email,
        from_name=from_name,
        use_tls=use_tls
    )

def send_email_smtp(
    config: EmailConfig,
    to_email: str,
    to_name: str,
    subject: str,
    body: str,
    html_body: str = None,
    attachments: list = None
):
    """Send email via SMTP"""
    # Create message
    msg = MIMEMultipart('alternative')
    msg['From'] = f"{config.from_name} <{config.from_email}>"
    msg['To'] = f"{to_name} <{to_email}>" if to_name else to_email
    msg['Subject'] = subject
    
    # Add text body
    msg.attach(MIMEText(body, 'plain'))
    
    # Add HTML body if provided
    if html_body:
        msg.attach(MIMEText(html_body, 'html'))
    
    # Add attachments
    if attachments:
        for attachment in attachments:
            import base64
            part = MIMEBase('application', 'octet-stream')
            content = base64.b64decode(attachment['content_base64'])
            part.set_payload(content)
            encoders.encode_base64(part)
            part.add_header(
                'Content-Disposition',
                f"attachment; filename={attachment['filename']}"
            )
            msg.attach(part)
    
    # Send email
    try:
        if config.use_tls:
            context = ssl.create_default_context()
            with smtplib.SMTP(config.smtp_host, config.smtp_port) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(config.smtp_user, config.smtp_password)
                server.sendmail(config.from_email, to_email, msg.as_string())
        else:
            with smtplib.SMTP(config.smtp_host, config.smtp_port) as server:
                server.login(config.smtp_user, config.smtp_password)
                server.sendmail(config.from_email, to_email, msg.as_string())
        
        return True
    except Exception as e:
        logger.error(f"SMTP error: {str(e)}")
        raise e

@router.post("/send")
async def send_templated_email(data: SendEmailRequest, request: Request):
    """Send an email using a predefined template"""
    config = get_smtp_config()
    
    if not config:
        raise HTTPException(
            status_code=503,
            detail="Email not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD environment variables."
        )
    
    # Get template
    template = TEMPLATES.get(data.template)
    if not template:
        raise HTTPException(status_code=400, detail=f"Unknown template: {data.template}")
    
    # Format subject and body with variables
    try:
        subject = template['subject'].format(**data.variables)
        body = template['body'].format(**data.variables)
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing template variable: {e}")
    
    try:
        send_email_smtp(
            config=config,
            to_email=data.to_email,
            to_name=data.to_name or '',
            subject=subject,
            body=body,
            attachments=data.attachments
        )
        
        # Log email to database
        db = request.app.state.db
        await db.email_logs.insert_one({
            "to_email": data.to_email,
            "template": data.template,
            "subject": subject,
            "status": "sent",
            "sent_at": __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
        })
        
        return {"status": "sent", "to": data.to_email}
        
    except Exception as e:
        # Log failed email
        db = request.app.state.db
        await db.email_logs.insert_one({
            "to_email": data.to_email,
            "template": data.template,
            "subject": subject,
            "status": "failed",
            "error": str(e),
            "sent_at": __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
        })
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@router.post("/send-custom")
async def send_custom_email(data: CustomEmailRequest, request: Request):
    """Send a custom email"""
    config = get_smtp_config()
    
    if not config:
        raise HTTPException(
            status_code=503,
            detail="Email not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD environment variables."
        )
    
    try:
        send_email_smtp(
            config=config,
            to_email=data.to_email,
            to_name=data.to_name or '',
            subject=data.subject,
            body=data.body,
            html_body=data.html_body,
            attachments=data.attachments
        )
        
        # Log email
        db = request.app.state.db
        await db.email_logs.insert_one({
            "to_email": data.to_email,
            "template": "custom",
            "subject": data.subject,
            "status": "sent",
            "sent_at": __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
        })
        
        return {"status": "sent", "to": data.to_email}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@router.get("/status")
async def get_email_status():
    """Check if email service is configured"""
    config = get_smtp_config()
    
    if not config:
        return {
            "configured": False,
            "message": "SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD environment variables."
        }
    
    return {
        "configured": True,
        "host": config.smtp_host,
        "port": config.smtp_port,
        "from_email": config.from_email,
        "use_tls": config.use_tls
    }

@router.get("/templates")
async def list_templates():
    """List available email templates"""
    return {
        "templates": list(TEMPLATES.keys()),
        "details": {
            name: {"subject": t["subject"]}
            for name, t in TEMPLATES.items()
        }
    }

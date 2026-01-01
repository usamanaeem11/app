"""
ID Generation Utilities
Generates unique IDs with custom prefixes for Supabase
"""
import uuid
import secrets

def generate_id(prefix: str) -> str:
    """
    Generate a unique ID with a custom prefix
    Format: prefix_randomstring
    Example: user_a1b2c3d4e5f6
    """
    random_part = secrets.token_hex(6)
    return f"{prefix}_{random_part}"

def generate_user_id() -> str:
    return generate_id("user")

def generate_company_id() -> str:
    return generate_id("company")

def generate_entry_id() -> str:
    return generate_id("entry")

def generate_screenshot_id() -> str:
    return generate_id("screenshot")

def generate_log_id() -> str:
    return generate_id("log")

def generate_leave_id() -> str:
    return generate_id("leave")

def generate_timesheet_id() -> str:
    return generate_id("timesheet")

def generate_payroll_id() -> str:
    return generate_id("payroll")

def generate_project_id() -> str:
    return generate_id("project")

def generate_task_id() -> str:
    return generate_id("task")

def generate_attendance_id() -> str:
    return generate_id("attendance")

def generate_shift_id() -> str:
    return generate_id("shift")

def generate_assignment_id() -> str:
    return generate_id("assign")

def generate_invoice_id() -> str:
    return generate_id("invoice")

def generate_subscription_id() -> str:
    return generate_id("sub")

def generate_channel_id() -> str:
    return generate_id("channel")

def generate_message_id() -> str:
    return generate_id("msg")

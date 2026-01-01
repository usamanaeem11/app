"""
Work Agreements Routes
Handles work agreements between admin and employees
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, date
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/work-agreements", tags=["Work Agreements"])


class AgreementFeature(BaseModel):
    name: str
    enabled: bool
    description: Optional[str] = None


class AgreementClause(BaseModel):
    title: str
    content: str
    is_mandatory: bool = False


class WorkAgreementCreate(BaseModel):
    employee_id: str
    title: str
    description: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    features: List[AgreementFeature] = []
    clauses: List[AgreementClause] = []


class WorkAgreementUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    features: Optional[List[AgreementFeature]] = None
    status: Optional[str] = None


class SignatureData(BaseModel):
    signature: str  # Base64 encoded signature image


async def get_current_user(request):
    """Get current user from request - placeholder"""
    return request.state.user if hasattr(request.state, 'user') else None


@router.post("")
async def create_work_agreement(
    data: WorkAgreementCreate,
    request,
    user: dict = Depends(get_current_user)
):
    """
    Create a work agreement (Admin only)
    """
    from utils.id_generator import generate_id

    if user["role"] not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Only admins can create work agreements")

    db = request.app.state.db

    # Check if employee exists
    employee = await db.users.find_one({
        "user_id": data.employee_id,
        "company_id": user["company_id"]
    })
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Create agreement
    agreement_id = generate_id("agreement")
    agreement_doc = {
        "agreement_id": agreement_id,
        "company_id": user["company_id"],
        "admin_id": user["user_id"],
        "employee_id": data.employee_id,
        "title": data.title,
        "description": data.description,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "status": "draft",
        "features": [f.dict() for f in data.features],
        "admin_signed": False,
        "employee_signed": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.work_agreements.insert_one(agreement_doc)

    # Create clauses
    for idx, clause in enumerate(data.clauses):
        clause_id = generate_id("clause")
        clause_doc = {
            "clause_id": clause_id,
            "agreement_id": agreement_id,
            "clause_number": idx + 1,
            "title": clause.title,
            "content": clause.content,
            "is_mandatory": clause.is_mandatory,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.agreement_clauses.insert_one(clause_doc)

    logger.info(f"Work agreement {agreement_id} created by {user['user_id']}")

    return {
        "agreement_id": agreement_id,
        "message": "Work agreement created successfully"
    }


@router.get("")
async def get_work_agreements(
    request,
    user: dict = Depends(get_current_user),
    status: Optional[str] = None
):
    """
    Get work agreements
    - Admins see all agreements in company
    - Employees see only their agreements
    """
    db = request.app.state.db

    query = {"company_id": user["company_id"]}

    if user["role"] not in ["admin", "hr"]:
        query["employee_id"] = user["user_id"]

    if status:
        query["status"] = status

    agreements = await db.work_agreements.find(query)

    # Enrich with user data and clauses
    enriched_agreements = []
    for agreement in agreements:
        # Get admin info
        admin = await db.users.find_one(
            {"user_id": agreement["admin_id"]},
            projection={"user_id": 1, "name": 1, "email": 1}
        )

        # Get employee info
        employee = await db.users.find_one(
            {"user_id": agreement["employee_id"]},
            projection={"user_id": 1, "name": 1, "email": 1}
        )

        # Get clauses
        clauses = await db.agreement_clauses.find({
            "agreement_id": agreement["agreement_id"]
        }, sort=[("clause_number", 1)])

        enriched_agreements.append({
            **agreement,
            "admin": admin,
            "employee": employee,
            "clauses": clauses
        })

    return enriched_agreements


@router.get("/{agreement_id}")
async def get_work_agreement(
    agreement_id: str,
    request,
    user: dict = Depends(get_current_user)
):
    """
    Get a specific work agreement
    """
    db = request.app.state.db

    agreement = await db.work_agreements.find_one({
        "agreement_id": agreement_id
    })
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")

    # Check permission
    if agreement["company_id"] != user["company_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    if user["role"] not in ["admin", "hr"] and agreement["employee_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get admin info
    admin = await db.users.find_one(
        {"user_id": agreement["admin_id"]},
        projection={"user_id": 1, "name": 1, "email": 1}
    )

    # Get employee info
    employee = await db.users.find_one(
        {"user_id": agreement["employee_id"]},
        projection={"user_id": 1, "name": 1, "email": 1}
    )

    # Get clauses
    clauses = await db.agreement_clauses.find({
        "agreement_id": agreement_id
    }, sort=[("clause_number", 1)])

    return {
        **agreement,
        "admin": admin,
        "employee": employee,
        "clauses": clauses
    }


@router.put("/{agreement_id}")
async def update_work_agreement(
    agreement_id: str,
    data: WorkAgreementUpdate,
    request,
    user: dict = Depends(get_current_user)
):
    """
    Update a work agreement (Admin only, before signing)
    """
    db = request.app.state.db

    agreement = await db.work_agreements.find_one({
        "agreement_id": agreement_id
    })
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")

    # Only admin can update
    if agreement["admin_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only the creator can update this agreement")

    # Cannot update after signing
    if agreement["admin_signed"] or agreement["employee_signed"]:
        raise HTTPException(status_code=400, detail="Cannot update a signed agreement")

    # Build update data
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}

    if data.title is not None:
        update_data["title"] = data.title
    if data.description is not None:
        update_data["description"] = data.description
    if data.start_date is not None:
        update_data["start_date"] = data.start_date
    if data.end_date is not None:
        update_data["end_date"] = data.end_date
    if data.features is not None:
        update_data["features"] = [f.dict() for f in data.features]
    if data.status is not None:
        update_data["status"] = data.status

    await db.work_agreements.update_one(
        {"agreement_id": agreement_id},
        {"$set": update_data}
    )

    return {"message": "Agreement updated successfully"}


@router.post("/{agreement_id}/clauses")
async def add_agreement_clause(
    agreement_id: str,
    clause: AgreementClause,
    request,
    user: dict = Depends(get_current_user)
):
    """
    Add a new clause to an agreement
    """
    from utils.id_generator import generate_id

    db = request.app.state.db

    agreement = await db.work_agreements.find_one({
        "agreement_id": agreement_id
    })
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")

    # Only admin can add clauses
    if agreement["admin_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only the creator can add clauses")

    # Cannot add clauses after signing
    if agreement["admin_signed"] or agreement["employee_signed"]:
        raise HTTPException(status_code=400, detail="Cannot modify a signed agreement")

    # Get the highest clause number
    existing_clauses = await db.agreement_clauses.find({
        "agreement_id": agreement_id
    })
    max_number = max([c.get("clause_number", 0) for c in existing_clauses], default=0)

    # Create clause
    clause_id = generate_id("clause")
    clause_doc = {
        "clause_id": clause_id,
        "agreement_id": agreement_id,
        "clause_number": max_number + 1,
        "title": clause.title,
        "content": clause.content,
        "is_mandatory": clause.is_mandatory,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.agreement_clauses.insert_one(clause_doc)

    return {
        "clause_id": clause_id,
        "message": "Clause added successfully"
    }


@router.delete("/{agreement_id}/clauses/{clause_id}")
async def delete_agreement_clause(
    agreement_id: str,
    clause_id: str,
    request,
    user: dict = Depends(get_current_user)
):
    """
    Delete a clause from an agreement
    """
    db = request.app.state.db

    agreement = await db.work_agreements.find_one({
        "agreement_id": agreement_id
    })
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")

    # Only admin can delete clauses
    if agreement["admin_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only the creator can delete clauses")

    # Cannot delete clauses after signing
    if agreement["admin_signed"] or agreement["employee_signed"]:
        raise HTTPException(status_code=400, detail="Cannot modify a signed agreement")

    await db.agreement_clauses.delete_one({"clause_id": clause_id})

    return {"message": "Clause deleted successfully"}


@router.post("/{agreement_id}/sign")
async def sign_agreement(
    agreement_id: str,
    data: SignatureData,
    request,
    user: dict = Depends(get_current_user)
):
    """
    Sign a work agreement
    """
    db = request.app.state.db

    agreement = await db.work_agreements.find_one({
        "agreement_id": agreement_id
    })
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")

    # Check if user is admin or employee
    is_admin = agreement["admin_id"] == user["user_id"]
    is_employee = agreement["employee_id"] == user["user_id"]

    if not is_admin and not is_employee:
        raise HTTPException(status_code=403, detail="Not authorized to sign this agreement")

    # Update signature
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}

    if is_admin:
        if agreement.get("admin_signed"):
            raise HTTPException(status_code=400, detail="Admin has already signed")
        update_data["admin_signed"] = True
        update_data["admin_signature"] = data.signature
        update_data["admin_signed_at"] = datetime.now(timezone.utc).isoformat()
    else:
        if agreement.get("employee_signed"):
            raise HTTPException(status_code=400, detail="Employee has already signed")
        update_data["employee_signed"] = True
        update_data["employee_signature"] = data.signature
        update_data["employee_signed_at"] = datetime.now(timezone.utc).isoformat()

    # If both signed, change status to active
    if (is_admin and agreement.get("employee_signed")) or (is_employee and agreement.get("admin_signed")):
        update_data["status"] = "active"

    await db.work_agreements.update_one(
        {"agreement_id": agreement_id},
        {"$set": update_data}
    )

    return {
        "message": "Agreement signed successfully",
        "status": update_data.get("status", agreement["status"])
    }


@router.delete("/{agreement_id}")
async def delete_agreement(
    agreement_id: str,
    request,
    user: dict = Depends(get_current_user)
):
    """
    Delete a work agreement (Admin only, before signing)
    """
    db = request.app.state.db

    agreement = await db.work_agreements.find_one({
        "agreement_id": agreement_id
    })
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")

    # Only admin can delete
    if agreement["admin_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only the creator can delete this agreement")

    # Cannot delete after signing
    if agreement["admin_signed"] or agreement["employee_signed"]:
        raise HTTPException(status_code=400, detail="Cannot delete a signed agreement")

    # Delete clauses first
    await db.agreement_clauses.delete_many({"agreement_id": agreement_id})

    # Delete agreement
    await db.work_agreements.delete_one({"agreement_id": agreement_id})

    return {"message": "Agreement deleted successfully"}

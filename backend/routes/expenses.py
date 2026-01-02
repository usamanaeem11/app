"""
Expenses and Earnings Routes
Handles expense calculations, earnings tracking, and financial reporting
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, date, timedelta
from dateutil.relativedelta import relativedelta
from utils.id_generator import generate_id
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class ExpenseCalculationRequest(BaseModel):
    period_type: str  # monthly, quarterly, yearly, custom
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    employee_id: Optional[str] = None
    project_id: Optional[str] = None


class ManagerExpenseAccessGrant(BaseModel):
    manager_id: str
    scope: str = "assigned_employees"  # assigned_employees, all_employees


@router.post("/calculate")
async def calculate_expenses(data: ExpenseCalculationRequest, request: Request, user: dict):
    """Calculate expenses for a period"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        # Determine date range
        if data.period_type == "custom":
            if not data.period_start or not data.period_end:
                raise HTTPException(status_code=400, detail="Custom period requires start and end dates")
            period_start = data.period_start
            period_end = data.period_end
        else:
            today = date.today()
            if data.period_type == "monthly":
                period_start = today.replace(day=1)
                period_end = (period_start + relativedelta(months=1)) - timedelta(days=1)
            elif data.period_type == "quarterly":
                quarter = (today.month - 1) // 3
                period_start = date(today.year, quarter * 3 + 1, 1)
                period_end = (period_start + relativedelta(months=3)) - timedelta(days=1)
            elif data.period_type == "yearly":
                period_start = date(today.year, 1, 1)
                period_end = date(today.year, 12, 31)
            else:
                raise HTTPException(status_code=400, detail="Invalid period type")

        # Check permissions
        if user["role"] == "employee":
            # Employees can only calculate their own expenses
            if data.employee_id and data.employee_id != user["user_id"]:
                raise HTTPException(status_code=403, detail="Access denied")
            data.employee_id = user["user_id"]
        elif user["role"] == "manager":
            # Managers need expense access permission
            if data.employee_id and data.employee_id != user["user_id"]:
                access = await db.manager_expense_access.find_one({
                    "manager_id": user["user_id"],
                    "is_active": True
                })
                if not access:
                    raise HTTPException(status_code=403, detail="Expense access not granted")

                # Check if employee is assigned to this manager
                assignment = await db.manager_assignments.find_one({
                    "manager_id": user["user_id"],
                    "employee_id": data.employee_id,
                    "active": True
                })
                if not assignment:
                    raise HTTPException(status_code=403, detail="Employee not assigned to you")

        # Build query for time entries
        time_query = {
            "company_id": user["company_id"],
            "start_time": {
                "$gte": datetime.combine(period_start, datetime.min.time()).isoformat(),
                "$lte": datetime.combine(period_end, datetime.max.time()).isoformat()
            },
            "status": {"$in": ["completed", "stopped"]}
        }

        if data.employee_id:
            time_query["user_id"] = data.employee_id
        if data.project_id:
            time_query["project_id"] = data.project_id

        # Get time entries for the period
        time_entries = await db.time_entries.find(time_query)

        # Group by employee
        employee_calculations = {}

        for entry in time_entries:
            employee_id = entry["user_id"]

            if employee_id not in employee_calculations:
                employee_calculations[employee_id] = {
                    "employee_id": employee_id,
                    "total_hours": 0,
                    "total_amount": 0,
                    "projects": {}
                }

            hours = entry.get("duration", 0) / 3600  # Convert seconds to hours
            employee_calculations[employee_id]["total_hours"] += hours

            # Track per project
            project_id = entry.get("project_id")
            if project_id:
                if project_id not in employee_calculations[employee_id]["projects"]:
                    employee_calculations[employee_id]["projects"][project_id] = {
                        "project_id": project_id,
                        "hours": 0,
                        "amount": 0
                    }
                employee_calculations[employee_id]["projects"][project_id]["hours"] += hours

        # Calculate amounts based on wage
        for employee_id, calc in employee_calculations.items():
            # Get employee wage
            wage = await db.employee_wages.find_one({
                "employee_id": employee_id,
                "is_active": True,
                "approved_by_admin": True,
                "approved_by_employee": True
            })

            # If not found, check work agreement
            if not wage:
                agreement = await db.work_agreements.find_one({
                    "employee_id": employee_id,
                    "status": "active"
                })
                if agreement and agreement.get("wage_type"):
                    wage = {
                        "wage_type": agreement.get("wage_type"),
                        "wage_amount": agreement.get("wage_amount"),
                        "currency": agreement.get("wage_currency", "USD")
                    }

            if wage:
                wage_type = wage["wage_type"]
                wage_amount = float(wage["wage_amount"])

                if wage_type == "hourly":
                    calc["total_amount"] = calc["total_hours"] * wage_amount
                    calc["wage_type"] = "hourly"
                    calc["hourly_rate"] = wage_amount
                elif wage_type == "monthly":
                    # For monthly, calculate pro-rata based on days in period
                    days_in_period = (period_end - period_start).days + 1
                    days_in_month = 30  # Average
                    calc["total_amount"] = (wage_amount / days_in_month) * days_in_period
                    calc["wage_type"] = "monthly"
                    calc["monthly_rate"] = wage_amount
                elif wage_type == "project":
                    # For project-based, check project assignments
                    if data.project_id:
                        assignment = await db.project_assignments.find_one({
                            "employee_id": employee_id,
                            "project_id": data.project_id,
                            "is_active": True,
                            "wage_approved_by_admin": True,
                            "wage_approved_by_employee": True
                        })
                        if assignment:
                            calc["total_amount"] = float(assignment.get("project_wage_amount", wage_amount))
                            calc["wage_type"] = "project"
                            calc["project_rate"] = float(assignment.get("project_wage_amount", wage_amount))

                calc["currency"] = wage.get("currency", "USD")

                # Calculate per-project amounts for hourly
                if wage_type == "hourly":
                    for project_id, project_calc in calc["projects"].items():
                        project_calc["amount"] = project_calc["hours"] * wage_amount

            # Get employee info
            employee = await db.users.find_one({"user_id": employee_id})
            calc["employee_name"] = employee.get("name", "Unknown") if employee else "Unknown"
            calc["employee_role"] = employee.get("role", "Unknown") if employee else "Unknown"

        # Save calculation to cache
        for employee_id, calc in employee_calculations.items():
            calculation_id = generate_id("calc")
            calc_doc = {
                "calculation_id": calculation_id,
                "company_id": user["company_id"],
                "employee_id": employee_id,
                "project_id": data.project_id,
                "period_type": data.period_type,
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "total_hours": calc["total_hours"],
                "hourly_rate": calc.get("hourly_rate"),
                "monthly_rate": calc.get("monthly_rate"),
                "project_rate": calc.get("project_rate"),
                "calculated_amount": calc["total_amount"],
                "currency": calc.get("currency", "USD"),
                "calculated_at": datetime.now(timezone.utc).isoformat(),
                "metadata": {
                    "projects": calc.get("projects", {}),
                    "wage_type": calc.get("wage_type")
                }
            }
            await db.expense_calculations.insert_one(calc_doc)

        return {
            "success": True,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "data": list(employee_calculations.values())
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating expenses: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_expense_summary(request: Request, user: dict):
    """Get expense summary for current user"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        employee_id = user["user_id"]

        # Calculate for current month
        today = date.today()
        month_start = today.replace(day=1)
        month_end = (month_start + relativedelta(months=1)) - timedelta(days=1)

        # Get or calculate monthly expenses
        calculation = await db.expense_calculations.find_one({
            "employee_id": employee_id,
            "period_type": "monthly",
            "period_start": month_start.isoformat()
        })

        if not calculation:
            # Calculate it
            from routes.expenses import ExpenseCalculationRequest
            calc_data = ExpenseCalculationRequest(
                period_type="monthly",
                employee_id=employee_id
            )
            # This will create the calculation
            result = await calculate_expenses(calc_data, request, user)
            if result["data"]:
                calculation = result["data"][0]

        # Get current wage
        wage = await db.employee_wages.find_one({
            "employee_id": employee_id,
            "is_active": True,
            "approved_by_admin": True,
            "approved_by_employee": True
        })

        if not wage:
            agreement = await db.work_agreements.find_one({
                "employee_id": employee_id,
                "status": "active"
            })
            if agreement and agreement.get("wage_type"):
                wage = {
                    "wage_type": agreement.get("wage_type"),
                    "wage_amount": agreement.get("wage_amount"),
                    "currency": agreement.get("wage_currency", "USD")
                }

        return {
            "success": True,
            "data": {
                "current_wage": wage,
                "monthly_calculation": calculation,
                "period_start": month_start.isoformat(),
                "period_end": month_end.isoformat()
            }
        }

    except Exception as e:
        logger.error(f"Error fetching expense summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all-employees")
async def get_all_employees_expenses(
    request: Request,
    user: dict,
    period_type: str = "monthly"
):
    """Get expenses for all employees (admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        # Only admin can view all expenses
        if user["role"] not in ["admin", "hr"]:
            # Check if manager has expense access
            if user["role"] == "manager":
                access = await db.manager_expense_access.find_one({
                    "manager_id": user["user_id"],
                    "is_active": True
                })
                if not access:
                    raise HTTPException(status_code=403, detail="Admin access required")
            else:
                raise HTTPException(status_code=403, detail="Admin access required")

        # Get all employees
        query = {"company_id": user["company_id"]}

        if user["role"] == "manager":
            # Get assigned employees
            assignments = await db.manager_assignments.find({
                "manager_id": user["user_id"],
                "active": True
            })
            employee_ids = [a["employee_id"] for a in assignments]
            query["user_id"] = {"$in": employee_ids}

        employees = await db.users.find(query)

        # Calculate expenses for each employee
        results = []

        for employee in employees:
            # Get current wage
            wage = await db.employee_wages.find_one({
                "employee_id": employee["user_id"],
                "is_active": True,
                "approved_by_admin": True,
                "approved_by_employee": True
            })

            if not wage:
                agreement = await db.work_agreements.find_one({
                    "employee_id": employee["user_id"],
                    "status": "active"
                })
                if agreement and agreement.get("wage_type"):
                    wage = {
                        "wage_type": agreement.get("wage_type"),
                        "wage_amount": agreement.get("wage_amount"),
                        "currency": agreement.get("wage_currency", "USD")
                    }

            # Get latest calculation
            calculation = await db.expense_calculations.find_one({
                "employee_id": employee["user_id"],
                "period_type": period_type
            }, sort=[("calculated_at", -1)])

            results.append({
                "employee_id": employee["user_id"],
                "employee_name": employee.get("name"),
                "employee_role": employee.get("role"),
                "current_wage": wage,
                "latest_calculation": calculation
            })

        return {"success": True, "data": results}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching all employees expenses: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/manager-access")
async def grant_manager_expense_access(data: ManagerExpenseAccessGrant, request: Request, user: dict):
    """Grant expense access to a manager (admin only)"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        if user["role"] not in ["admin", "hr"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        # Check if manager exists
        manager = await db.users.find_one({"user_id": data.manager_id})
        if not manager or manager["company_id"] != user["company_id"]:
            raise HTTPException(status_code=404, detail="Manager not found")

        if manager["role"] not in ["manager", "admin"]:
            raise HTTPException(status_code=400, detail="User must be a manager")

        # Check if access already exists
        existing = await db.manager_expense_access.find_one({
            "manager_id": data.manager_id,
            "is_active": True
        })

        if existing:
            # Update scope
            await db.manager_expense_access.update_one(
                {"access_id": existing["access_id"]},
                {"$set": {"scope": data.scope}}
            )
            access_id = existing["access_id"]
        else:
            # Create new access
            access_id = generate_id("access")
            access_doc = {
                "access_id": access_id,
                "company_id": user["company_id"],
                "manager_id": data.manager_id,
                "granted_by": user["user_id"],
                "granted_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True,
                "scope": data.scope
            }
            await db.manager_expense_access.insert_one(access_doc)

        # Notify manager
        from routes.notifications import create_notification
        await create_notification(
            db=db,
            company_id=user["company_id"],
            user_id=data.manager_id,
            notification_type="expense_access_granted",
            title="Expense Access Granted",
            message=f"You have been granted expense access with scope: {data.scope}",
            data={"access_id": access_id, "scope": data.scope},
            priority="normal"
        )

        return {"success": True, "access_id": access_id, "message": "Expense access granted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error granting manager expense access: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/project-costs/{project_id}")
async def get_project_costs(project_id: str, request: Request, user: dict):
    """Get collective costs for a project"""
    from db import SupabaseDB
    db = SupabaseDB.get_db()

    try:
        # Check if project exists
        project = await db.projects.find_one({"project_id": project_id})
        if not project or project["company_id"] != user["company_id"]:
            raise HTTPException(status_code=404, detail="Project not found")

        # Get all assignments for this project
        assignments = await db.project_assignments.find({
            "project_id": project_id,
            "is_active": True
        })

        total_cost = 0
        employee_costs = []

        for assignment in assignments:
            # Get employee wage
            wage = await db.employee_wages.find_one({
                "employee_id": assignment["employee_id"],
                "is_active": True,
                "approved_by_admin": True,
                "approved_by_employee": True
            })

            if not wage:
                agreement = await db.work_agreements.find_one({
                    "employee_id": assignment["employee_id"],
                    "status": "active"
                })
                if agreement and agreement.get("wage_type"):
                    wage = {
                        "wage_type": agreement.get("wage_type"),
                        "wage_amount": agreement.get("wage_amount"),
                        "currency": agreement.get("wage_currency", "USD")
                    }

            # Get employee info
            employee = await db.users.find_one({"user_id": assignment["employee_id"]})

            cost_info = {
                "employee_id": assignment["employee_id"],
                "employee_name": employee.get("name", "Unknown") if employee else "Unknown",
                "wage": wage,
                "project_wage": assignment.get("project_wage_amount")
            }

            # If project-specific wage is set and approved
            if assignment.get("project_wage_amount") and \
               assignment.get("wage_approved_by_admin") and \
               assignment.get("wage_approved_by_employee"):
                cost_info["effective_cost"] = float(assignment["project_wage_amount"])
                total_cost += float(assignment["project_wage_amount"])
            elif wage and wage["wage_type"] == "project":
                cost_info["effective_cost"] = float(wage["wage_amount"])
                total_cost += float(wage["wage_amount"])
            else:
                # For hourly/monthly, need to calculate based on time entries
                cost_info["effective_cost"] = "calculated_per_time"

            employee_costs.append(cost_info)

        return {
            "success": True,
            "project": {
                "project_id": project_id,
                "name": project.get("name"),
                "total_cost": total_cost if total_cost > 0 else "Requires time calculation",
                "employee_costs": employee_costs
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching project costs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

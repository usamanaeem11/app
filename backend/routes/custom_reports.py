"""
Custom Report Builder & Workforce Analytics
============================================
Advanced reporting with custom templates and workforce insights
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import json
import logging

router = APIRouter(prefix="/reports", tags=["reports"])
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class ReportField(BaseModel):
    field: str
    label: str
    aggregation: Optional[str] = None  # sum, avg, count, min, max
    format: Optional[str] = None  # number, currency, percentage, duration, date

class ReportFilter(BaseModel):
    field: str
    operator: str  # eq, ne, gt, lt, gte, lte, in, contains
    value: Any

class CreateReportTemplateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    report_type: str  # time, activity, productivity, attendance, payroll, custom
    fields: List[ReportField]
    filters: Optional[List[ReportFilter]] = None
    group_by: Optional[List[str]] = None
    sort_by: Optional[str] = None
    sort_order: str = "desc"
    chart_type: Optional[str] = None  # bar, line, pie, area, table

class GenerateReportRequest(BaseModel):
    template_id: Optional[str] = None
    report_type: str
    start_date: str
    end_date: str
    user_ids: Optional[List[str]] = None
    project_ids: Optional[List[str]] = None
    fields: Optional[List[ReportField]] = None
    filters: Optional[List[ReportFilter]] = None
    group_by: Optional[List[str]] = None
    export_format: Optional[str] = None  # json, csv, pdf

# ==================== PREDEFINED REPORT TYPES ====================

REPORT_TYPES = {
    "time_summary": {
        "name": "Time Summary",
        "description": "Overview of tracked time by user, project, or date",
        "fields": [
            {"field": "total_hours", "label": "Total Hours", "aggregation": "sum", "format": "duration"},
            {"field": "active_hours", "label": "Active Hours", "aggregation": "sum", "format": "duration"},
            {"field": "idle_hours", "label": "Idle Hours", "aggregation": "sum", "format": "duration"},
            {"field": "entries_count", "label": "Entries", "aggregation": "count", "format": "number"}
        ],
        "group_by": ["user", "date"],
        "chart_type": "bar"
    },
    "productivity": {
        "name": "Productivity Report",
        "description": "Productivity metrics and activity levels",
        "fields": [
            {"field": "productivity_score", "label": "Productivity %", "aggregation": "avg", "format": "percentage"},
            {"field": "activity_level", "label": "Activity Level", "aggregation": "avg", "format": "percentage"},
            {"field": "focus_time", "label": "Focus Time", "aggregation": "sum", "format": "duration"},
            {"field": "screenshots_count", "label": "Screenshots", "aggregation": "count", "format": "number"}
        ],
        "group_by": ["user"],
        "chart_type": "line"
    },
    "app_usage": {
        "name": "App & Website Usage",
        "description": "Time spent on different applications and websites",
        "fields": [
            {"field": "app_name", "label": "Application", "format": "text"},
            {"field": "time_spent", "label": "Time Spent", "aggregation": "sum", "format": "duration"},
            {"field": "percentage", "label": "% of Total", "format": "percentage"},
            {"field": "category", "label": "Category", "format": "text"}
        ],
        "group_by": ["app_name"],
        "chart_type": "pie"
    },
    "attendance": {
        "name": "Attendance Report",
        "description": "Clock in/out times and attendance status",
        "fields": [
            {"field": "date", "label": "Date", "format": "date"},
            {"field": "clock_in", "label": "Clock In", "format": "time"},
            {"field": "clock_out", "label": "Clock Out", "format": "time"},
            {"field": "work_hours", "label": "Work Hours", "format": "duration"},
            {"field": "overtime", "label": "Overtime", "format": "duration"},
            {"field": "status", "label": "Status", "format": "text"}
        ],
        "group_by": ["user", "date"],
        "chart_type": "table"
    },
    "project_time": {
        "name": "Project Time Report",
        "description": "Time tracked per project and task",
        "fields": [
            {"field": "project_name", "label": "Project", "format": "text"},
            {"field": "task_name", "label": "Task", "format": "text"},
            {"field": "hours", "label": "Hours", "aggregation": "sum", "format": "duration"},
            {"field": "budget_used", "label": "Budget Used %", "format": "percentage"},
            {"field": "billable_amount", "label": "Billable Amount", "format": "currency"}
        ],
        "group_by": ["project", "task"],
        "chart_type": "bar"
    },
    "payroll": {
        "name": "Payroll Report",
        "description": "Payroll calculations and earnings",
        "fields": [
            {"field": "employee_name", "label": "Employee", "format": "text"},
            {"field": "regular_hours", "label": "Regular Hours", "format": "duration"},
            {"field": "overtime_hours", "label": "OT Hours", "format": "duration"},
            {"field": "hourly_rate", "label": "Rate", "format": "currency"},
            {"field": "gross_pay", "label": "Gross Pay", "format": "currency"},
            {"field": "deductions", "label": "Deductions", "format": "currency"},
            {"field": "net_pay", "label": "Net Pay", "format": "currency"}
        ],
        "group_by": ["employee"],
        "chart_type": "table"
    }
}

# ==================== WORKFORCE ANALYTICS ====================

class WorkforceAnalytics:
    """Calculate workforce analytics and insights"""
    
    @staticmethod
    async def calculate_benchmarks(db, company_id: str, period_days: int = 30) -> dict:
        """Calculate team benchmarks and rankings"""
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=period_days)
        
        # Get all time entries for the period
        entries = await db.time_entries.find({
            "company_id": company_id,
            "start_time": {"$gte": start_date.isoformat(), "$lte": end_date.isoformat()}
        }, {"_id": 0}).to_list(10000)
        
        # Group by user
        user_stats = {}
        for entry in entries:
            user_id = entry.get("user_id")
            if user_id not in user_stats:
                user_stats[user_id] = {
                    "total_hours": 0,
                    "active_hours": 0,
                    "idle_hours": 0,
                    "entries_count": 0
                }
            
            duration = entry.get("duration", 0) / 3600
            idle = entry.get("idle_time", 0) / 3600
            
            user_stats[user_id]["total_hours"] += duration
            user_stats[user_id]["active_hours"] += (duration - idle)
            user_stats[user_id]["idle_hours"] += idle
            user_stats[user_id]["entries_count"] += 1
        
        # Calculate productivity scores and rankings
        rankings = []
        for user_id, stats in user_stats.items():
            productivity = (stats["active_hours"] / stats["total_hours"] * 100) if stats["total_hours"] > 0 else 0
            rankings.append({
                "user_id": user_id,
                "total_hours": round(stats["total_hours"], 2),
                "productivity_score": round(productivity, 1),
                "entries_count": stats["entries_count"]
            })
        
        # Sort by productivity
        rankings.sort(key=lambda x: x["productivity_score"], reverse=True)
        
        # Calculate team averages
        team_avg_hours = sum(r["total_hours"] for r in rankings) / len(rankings) if rankings else 0
        team_avg_productivity = sum(r["productivity_score"] for r in rankings) / len(rankings) if rankings else 0
        
        return {
            "period_days": period_days,
            "team_size": len(rankings),
            "benchmarks": {
                "avg_hours_per_user": round(team_avg_hours, 2),
                "avg_productivity": round(team_avg_productivity, 1),
                "top_performer": rankings[0] if rankings else None,
                "needs_attention": [r for r in rankings if r["productivity_score"] < 50]
            },
            "leaderboard": rankings[:10]
        }
    
    @staticmethod
    async def calculate_work_life_balance(db, user_id: str, period_days: int = 30) -> dict:
        """Calculate work-life balance insights for a user"""
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=period_days)
        
        entries = await db.time_entries.find({
            "user_id": user_id,
            "start_time": {"$gte": start_date.isoformat(), "$lte": end_date.isoformat()}
        }, {"_id": 0}).to_list(1000)
        
        # Analyze work patterns
        daily_hours = {}
        late_nights = 0  # Work after 8 PM
        early_mornings = 0  # Work before 7 AM
        weekends = 0
        
        for entry in entries:
            try:
                start = datetime.fromisoformat(entry["start_time"].replace('Z', '+00:00'))
                date_key = start.date().isoformat()
                duration = entry.get("duration", 0) / 3600
                
                if date_key not in daily_hours:
                    daily_hours[date_key] = 0
                daily_hours[date_key] += duration
                
                # Check for late nights
                if start.hour >= 20:
                    late_nights += 1
                
                # Check for early mornings
                if start.hour < 7:
                    early_mornings += 1
                
                # Check for weekends
                if start.weekday() >= 5:
                    weekends += 1
                    
            except:
                continue
        
        # Calculate metrics
        total_days = len(daily_hours)
        avg_daily_hours = sum(daily_hours.values()) / total_days if total_days > 0 else 0
        overtime_days = len([h for h in daily_hours.values() if h > 8])
        
        # Calculate balance score (0-100)
        balance_score = 100
        if avg_daily_hours > 9:
            balance_score -= 20
        if late_nights > period_days * 0.2:
            balance_score -= 15
        if early_mornings > period_days * 0.1:
            balance_score -= 10
        if weekends > period_days * 0.15:
            balance_score -= 20
        if overtime_days > total_days * 0.3:
            balance_score -= 15
        
        balance_score = max(0, balance_score)
        
        # Generate recommendations
        recommendations = []
        if avg_daily_hours > 9:
            recommendations.append("Consider reducing daily work hours to prevent burnout")
        if late_nights > 5:
            recommendations.append("Try to avoid working late in the evening")
        if weekends > 3:
            recommendations.append("Take more time off on weekends to recharge")
        if overtime_days > 10:
            recommendations.append("You're working overtime frequently - consider delegating tasks")
        
        if balance_score >= 80:
            status = "healthy"
        elif balance_score >= 60:
            status = "moderate"
        elif balance_score >= 40:
            status = "needs_attention"
        else:
            status = "at_risk"
        
        return {
            "user_id": user_id,
            "period_days": period_days,
            "balance_score": balance_score,
            "status": status,
            "metrics": {
                "avg_daily_hours": round(avg_daily_hours, 2),
                "total_days_worked": total_days,
                "overtime_days": overtime_days,
                "late_night_sessions": late_nights,
                "early_morning_sessions": early_mornings,
                "weekend_work_days": weekends
            },
            "recommendations": recommendations
        }

# ==================== API ENDPOINTS ====================

@router.get("/types")
async def get_report_types():
    """Get available report types"""
    return {"report_types": REPORT_TYPES}

@router.post("/templates")
async def create_report_template(data: CreateReportTemplateRequest, request: Request):
    """Create a custom report template"""
    db = request.app.state.db
    
    template_id = f"rpt_{uuid.uuid4().hex[:12]}"
    
    template = {
        "template_id": template_id,
        "name": data.name,
        "description": data.description,
        "report_type": data.report_type,
        "fields": [f.dict() for f in data.fields],
        "filters": [f.dict() for f in data.filters] if data.filters else [],
        "group_by": data.group_by,
        "sort_by": data.sort_by,
        "sort_order": data.sort_order,
        "chart_type": data.chart_type,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.report_templates.insert_one(template)
    
    return {"template_id": template_id, "name": data.name}

@router.get("/templates")
async def get_report_templates(company_id: str, request: Request):
    """Get all report templates for a company"""
    db = request.app.state.db
    
    templates = await db.report_templates.find(
        {"company_id": company_id},
        {"_id": 0}
    ).to_list(100)
    
    return {"templates": templates, "predefined": REPORT_TYPES}

@router.post("/generate")
async def generate_report(data: GenerateReportRequest, request: Request):
    """Generate a report"""
    db = request.app.state.db
    
    # Get report configuration
    if data.template_id:
        template = await db.report_templates.find_one(
            {"template_id": data.template_id},
            {"_id": 0}
        )
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        config = template
    elif data.report_type in REPORT_TYPES:
        config = REPORT_TYPES[data.report_type]
    else:
        config = {
            "fields": [f.dict() for f in data.fields] if data.fields else [],
            "group_by": data.group_by
        }
    
    # Build query
    query = {
        "start_time": {
            "$gte": data.start_date,
            "$lte": data.end_date
        }
    }
    
    if data.user_ids:
        query["user_id"] = {"$in": data.user_ids}
    
    if data.project_ids:
        query["project_id"] = {"$in": data.project_ids}
    
    # Fetch data based on report type
    if data.report_type in ["time_summary", "productivity"]:
        entries = await db.time_entries.find(query, {"_id": 0}).to_list(10000)
        
        # Process data
        report_data = []
        grouped = {}
        
        for entry in entries:
            key = entry.get("user_id", "unknown")
            if key not in grouped:
                grouped[key] = {
                    "user_id": key,
                    "total_hours": 0,
                    "active_hours": 0,
                    "idle_hours": 0,
                    "entries_count": 0
                }
            
            duration = entry.get("duration", 0) / 3600
            idle = entry.get("idle_time", 0) / 3600
            
            grouped[key]["total_hours"] += duration
            grouped[key]["active_hours"] += (duration - idle)
            grouped[key]["idle_hours"] += idle
            grouped[key]["entries_count"] += 1
        
        # Calculate derived fields
        for user_id, stats in grouped.items():
            productivity = (stats["active_hours"] / stats["total_hours"] * 100) if stats["total_hours"] > 0 else 0
            report_data.append({
                **stats,
                "productivity_score": round(productivity, 1),
                "total_hours": round(stats["total_hours"], 2),
                "active_hours": round(stats["active_hours"], 2),
                "idle_hours": round(stats["idle_hours"], 2)
            })
        
    elif data.report_type == "attendance":
        entries = await db.attendance.find(query, {"_id": 0}).to_list(10000)
        report_data = entries
        
    elif data.report_type == "project_time":
        entries = await db.time_entries.find(query, {"_id": 0}).to_list(10000)
        
        # Group by project
        grouped = {}
        for entry in entries:
            project_id = entry.get("project_id", "no_project")
            if project_id not in grouped:
                grouped[project_id] = {"project_id": project_id, "hours": 0, "entries": 0}
            grouped[project_id]["hours"] += entry.get("duration", 0) / 3600
            grouped[project_id]["entries"] += 1
        
        report_data = list(grouped.values())
        
    else:
        report_data = []
    
    # Generate report ID
    report_id = f"rep_{uuid.uuid4().hex[:12]}"
    
    # Store report
    report = {
        "report_id": report_id,
        "report_type": data.report_type,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "config": config,
        "data": report_data,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.generated_reports.insert_one(report)
    
    # Track export for limits
    await db.report_exports.insert_one({
        "report_id": report_id,
        "exported_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "report_id": report_id,
        "report_type": data.report_type,
        "data": report_data,
        "summary": {
            "total_records": len(report_data),
            "period": f"{data.start_date} to {data.end_date}"
        }
    }

@router.get("/analytics/benchmarks/{company_id}")
async def get_workforce_benchmarks(company_id: str, days: int = 30, request: Request = None):
    """Get workforce benchmarks and leaderboard"""
    db = request.app.state.db
    return await WorkforceAnalytics.calculate_benchmarks(db, company_id, days)

@router.get("/analytics/work-life-balance/{user_id}")
async def get_work_life_balance(user_id: str, days: int = 30, request: Request = None):
    """Get work-life balance insights for a user"""
    db = request.app.state.db
    return await WorkforceAnalytics.calculate_work_life_balance(db, user_id, days)

@router.get("/{report_id}")
async def get_report(report_id: str, request: Request):
    """Get a generated report by ID"""
    db = request.app.state.db
    
    report = await db.generated_reports.find_one(
        {"report_id": report_id},
        {"_id": 0}
    )
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return report

@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, request: Request):
    """Delete a report template"""
    db = request.app.state.db
    
    result = await db.report_templates.delete_one({"template_id": template_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"status": "deleted", "template_id": template_id}

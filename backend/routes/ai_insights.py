from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
from datetime import datetime, timezone, timedelta
import json

# Import LLM chat from emergentintegrations
from emergentintegrations.llm.chat import LlmChat

router = APIRouter(prefix="/ai", tags=["ai"])

class ProductivityAnalysisRequest(BaseModel):
    user_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    analysis_type: str = "general"  # general, individual, team, trends

async def get_llm_chat() -> LlmChat:
    """Initialize LLM chat with OpenAI GPT-5.2"""
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    return LlmChat(
        api_key=api_key,
        session_id=f"productivity-analysis-{datetime.now().timestamp()}",
        system_message="""You are an AI productivity analyst for an employee monitoring system. 
        Your role is to analyze employee activity data and provide actionable insights about:
        - Work patterns and productivity trends
        - Time allocation and efficiency
        - Potential areas for improvement
        - Team performance comparisons
        - Anomaly detection (unusual patterns, potential burnout, etc.)
        
        Always be constructive and helpful in your analysis. Focus on actionable recommendations.
        Respond with structured JSON when requested."""
    ).with_model("openai", "gpt-5.2")

def calculate_productivity_metrics(time_entries: list, activity_logs: list, screenshots: list) -> dict:
    """Calculate productivity metrics from raw data"""
    total_tracked_hours = sum(e.get("duration", 0) for e in time_entries) / 3600
    total_idle_time = sum(e.get("idle_time", 0) for e in time_entries) / 3600
    active_hours = total_tracked_hours - total_idle_time
    
    # Calculate activity level
    if activity_logs:
        avg_activity = sum(a.get("activity_level", 0) for a in activity_logs) / len(activity_logs)
    else:
        avg_activity = 0
    
    # App usage breakdown
    app_usage = {}
    for log in activity_logs:
        app = log.get("app_name", "Unknown")
        if app not in app_usage:
            app_usage[app] = 0
        app_usage[app] += 1
    
    # Sort by usage
    sorted_apps = sorted(app_usage.items(), key=lambda x: x[1], reverse=True)[:10]
    
    # Calculate productivity score (0-100)
    if total_tracked_hours > 0:
        productivity_score = min(100, (active_hours / total_tracked_hours) * 100 * (avg_activity / 100 + 0.5))
    else:
        productivity_score = 0
    
    return {
        "total_tracked_hours": round(total_tracked_hours, 2),
        "active_hours": round(active_hours, 2),
        "idle_hours": round(total_idle_time, 2),
        "average_activity_level": round(avg_activity, 1),
        "productivity_score": round(productivity_score, 1),
        "top_apps": dict(sorted_apps),
        "screenshot_count": len(screenshots),
        "entries_count": len(time_entries)
    }

@router.post("/analyze-productivity")
async def analyze_productivity(
    analysis_request: ProductivityAnalysisRequest,
    request: Request
):
    """Analyze productivity data using AI"""
    # Get database from app state
    db = request.app.state.db
    
    # Get current user from request (we'll need to verify auth)
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Build date query
    date_query = {}
    if analysis_request.start_date:
        date_query["$gte"] = analysis_request.start_date
    if analysis_request.end_date:
        if "$gte" in date_query:
            date_query["$lte"] = analysis_request.end_date
        else:
            date_query["$lte"] = analysis_request.end_date
    
    # Default to last 30 days if no dates provided
    if not date_query:
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=30)
        date_query = {
            "$gte": start_date.isoformat(),
            "$lte": end_date.isoformat()
        }
    
    # Build user query based on analysis type and user_id
    time_query = {"start_time": date_query}
    activity_query = {"timestamp": date_query}
    screenshot_query = {"taken_at": date_query}
    
    if analysis_request.user_id:
        time_query["user_id"] = analysis_request.user_id
        activity_query["user_id"] = analysis_request.user_id
        screenshot_query["user_id"] = analysis_request.user_id
    
    # Fetch data
    time_entries = await db.time_entries.find(time_query, {"_id": 0}).to_list(10000)
    activity_logs = await db.activity_logs.find(activity_query, {"_id": 0}).to_list(10000)
    screenshots = await db.screenshots.find(screenshot_query, {"_id": 0}).to_list(1000)
    
    # Calculate metrics
    metrics = calculate_productivity_metrics(time_entries, activity_logs, screenshots)
    
    # Get user info for context
    users_info = []
    if analysis_request.user_id:
        user = await db.users.find_one({"user_id": analysis_request.user_id}, {"_id": 0, "password_hash": 0})
        if user:
            users_info.append({"name": user.get("name"), "role": user.get("role")})
    
    # Prepare data summary for AI analysis
    data_summary = {
        "period": {
            "start": analysis_request.start_date or date_query.get("$gte"),
            "end": analysis_request.end_date or date_query.get("$lte")
        },
        "metrics": metrics,
        "users_analyzed": len(users_info) if users_info else "all team members",
        "analysis_type": analysis_request.analysis_type
    }
    
    # Generate AI insights
    try:
        llm_chat = await get_llm_chat()
        
        prompt = f"""Analyze this employee productivity data and provide insights:

Data Summary:
{json.dumps(data_summary, indent=2)}

Please provide a comprehensive analysis including:
1. Overall productivity assessment
2. Key observations and patterns
3. Areas of concern (if any)
4. Specific recommendations for improvement
5. Positive highlights

Respond in JSON format with the following structure:
{{
    "overall_score": <number 0-100>,
    "assessment": "<brief overall assessment>",
    "key_observations": ["<observation1>", "<observation2>", ...],
    "concerns": ["<concern1>", "<concern2>", ...],
    "recommendations": ["<rec1>", "<rec2>", ...],
    "highlights": ["<highlight1>", "<highlight2>", ...],
    "trend_analysis": "<analysis of trends if applicable>",
    "burnout_risk": "<low/medium/high with explanation>"
}}"""

        response = await llm_chat.chat(prompt)
        
        # Try to parse JSON from response
        try:
            # Find JSON in response
            response_text = response
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            ai_insights = json.loads(response_text.strip())
        except json.JSONDecodeError:
            ai_insights = {
                "overall_score": metrics["productivity_score"],
                "assessment": response,
                "key_observations": [],
                "concerns": [],
                "recommendations": [],
                "highlights": [],
                "trend_analysis": "Unable to parse detailed analysis",
                "burnout_risk": "unknown"
            }
        
        return {
            "success": True,
            "metrics": metrics,
            "ai_insights": ai_insights,
            "data_summary": data_summary
        }
        
    except Exception as e:
        # Return metrics even if AI fails
        return {
            "success": False,
            "metrics": metrics,
            "ai_insights": {
                "overall_score": metrics["productivity_score"],
                "assessment": f"AI analysis unavailable: {str(e)}",
                "key_observations": [],
                "concerns": [],
                "recommendations": [],
                "highlights": [],
                "trend_analysis": "Not available",
                "burnout_risk": "unknown"
            },
            "data_summary": data_summary,
            "error": str(e)
        }

@router.get("/productivity-trends")
async def get_productivity_trends(
    days: int = 30,
    user_id: Optional[str] = None,
    request: Request = None
):
    """Get daily productivity trends for charting"""
    db = request.app.state.db
    
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    # Build query
    base_query = {
        "start_time": {
            "$gte": start_date.isoformat(),
            "$lte": end_date.isoformat()
        }
    }
    
    if user_id:
        base_query["user_id"] = user_id
    
    # Fetch time entries
    time_entries = await db.time_entries.find(base_query, {"_id": 0}).to_list(10000)
    
    # Group by date
    daily_data = {}
    for entry in time_entries:
        try:
            entry_date = entry["start_time"][:10]  # Get YYYY-MM-DD
            if entry_date not in daily_data:
                daily_data[entry_date] = {
                    "date": entry_date,
                    "total_hours": 0,
                    "idle_hours": 0,
                    "entries": 0
                }
            
            daily_data[entry_date]["total_hours"] += entry.get("duration", 0) / 3600
            daily_data[entry_date]["idle_hours"] += entry.get("idle_time", 0) / 3600
            daily_data[entry_date]["entries"] += 1
        except (KeyError, TypeError):
            continue
    
    # Calculate active hours and productivity score for each day
    trends = []
    for date, data in sorted(daily_data.items()):
        active_hours = data["total_hours"] - data["idle_hours"]
        productivity = (active_hours / data["total_hours"] * 100) if data["total_hours"] > 0 else 0
        
        trends.append({
            "date": date,
            "total_hours": round(data["total_hours"], 2),
            "active_hours": round(active_hours, 2),
            "idle_hours": round(data["idle_hours"], 2),
            "productivity_score": round(productivity, 1),
            "entries": data["entries"]
        })
    
    return {
        "trends": trends,
        "period": {
            "start": start_date.isoformat()[:10],
            "end": end_date.isoformat()[:10],
            "days": days
        },
        "summary": {
            "total_days_with_activity": len(trends),
            "avg_daily_hours": round(sum(t["total_hours"] for t in trends) / max(len(trends), 1), 2),
            "avg_productivity": round(sum(t["productivity_score"] for t in trends) / max(len(trends), 1), 1)
        }
    }

@router.get("/app-usage-breakdown")
async def get_app_usage_breakdown(
    days: int = 7,
    user_id: Optional[str] = None,
    request: Request = None
):
    """Get app usage breakdown for pie charts"""
    db = request.app.state.db
    
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    query = {
        "timestamp": {
            "$gte": start_date.isoformat(),
            "$lte": end_date.isoformat()
        }
    }
    
    if user_id:
        query["user_id"] = user_id
    
    activity_logs = await db.activity_logs.find(query, {"_id": 0}).to_list(10000)
    
    # Categorize apps
    categories = {
        "productivity": ["vscode", "terminal", "sublime", "atom", "intellij", "pycharm", "webstorm", "slack", "teams", "zoom", "notion", "asana", "jira", "trello"],
        "communication": ["slack", "teams", "zoom", "discord", "skype", "outlook", "gmail", "mail", "telegram", "whatsapp"],
        "browser": ["chrome", "firefox", "safari", "edge", "brave", "opera"],
        "entertainment": ["youtube", "netflix", "spotify", "twitch", "steam", "games"],
        "social": ["twitter", "facebook", "instagram", "linkedin", "reddit", "tiktok"]
    }
    
    app_usage = {}
    category_usage = {cat: 0 for cat in categories}
    category_usage["other"] = 0
    
    for log in activity_logs:
        app = log.get("app_name", "Unknown").lower()
        
        if app not in app_usage:
            app_usage[app] = {
                "count": 0,
                "total_activity": 0
            }
        
        app_usage[app]["count"] += 1
        app_usage[app]["total_activity"] += log.get("activity_level", 0)
        
        # Categorize
        categorized = False
        for cat, apps in categories.items():
            if any(a in app for a in apps):
                category_usage[cat] += 1
                categorized = True
                break
        
        if not categorized:
            category_usage["other"] += 1
    
    # Calculate averages and sort
    for app in app_usage:
        if app_usage[app]["count"] > 0:
            app_usage[app]["avg_activity"] = round(app_usage[app]["total_activity"] / app_usage[app]["count"], 1)
    
    sorted_apps = sorted(app_usage.items(), key=lambda x: x[1]["count"], reverse=True)[:15]
    
    return {
        "top_apps": [
            {
                "name": app,
                "usage_count": data["count"],
                "avg_activity_level": data.get("avg_activity", 0)
            }
            for app, data in sorted_apps
        ],
        "category_breakdown": [
            {"category": cat.title(), "count": count}
            for cat, count in sorted(category_usage.items(), key=lambda x: x[1], reverse=True)
        ],
        "period": {
            "start": start_date.isoformat()[:10],
            "end": end_date.isoformat()[:10],
            "days": days
        },
        "total_activities": len(activity_logs)
    }

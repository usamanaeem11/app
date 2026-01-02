from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta

router = APIRouter(prefix='/api/analytics', tags=['Analytics'])

class FocusTime(BaseModel):
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    interruptions_count: int = 0
    quality_score: int = 0
    tasks_completed: int = 0

class MeetingInsight(BaseModel):
    meeting_title: str
    meeting_date: date
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    attendee_count: int = 0
    attendee_ids: List[str] = []
    meeting_source: str = 'manual'
    meeting_type: str = 'general'
    productivity_rating: Optional[int] = None

@router.get('/productivity-dashboard')
async def get_productivity_dashboard(user_id: Optional[str] = None, date_param: Optional[str] = None,
                                    user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        target_user = user_id or user['user_id']
        target_date = date.fromisoformat(date_param) if date_param else date.today()

        score = await db.get('productivity_scores', {'user_id': target_user, 'date': target_date})

        if not score:
            score = {
                'overall_score': 0,
                'activity_score': 0,
                'focus_score': 0,
                'time_management_score': 0,
                'total_productive_minutes': 0,
                'total_neutral_minutes': 0,
                'total_unproductive_minutes': 0
            }

        app_usage = await db.query('app_usage', {'user_id': target_user, 'date': target_date})
        website_usage = await db.query('website_usage', {'user_id': target_user, 'date': target_date})

        top_apps = {}
        for usage in app_usage:
            app = usage['app_name']
            if app not in top_apps:
                top_apps[app] = 0
            top_apps[app] += usage['duration_seconds']

        top_apps = sorted(top_apps.items(), key=lambda x: x[1], reverse=True)[:10]

        top_websites = {}
        for usage in website_usage:
            domain = usage['domain']
            if domain not in top_websites:
                top_websites[domain] = 0
            top_websites[domain] += usage['duration_seconds']

        top_websites = sorted(top_websites.items(), key=lambda x: x[1], reverse=True)[:10]

        return {
            'success': True,
            'data': {
                'productivity_score': score,
                'top_apps': [{'name': k, 'duration_seconds': v} for k, v in top_apps],
                'top_websites': [{'domain': k, 'duration_seconds': v} for k, v in top_websites]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/focus-time')
async def track_focus_time(focus: FocusTime, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        from utils.id_generator import generate_id
        focus_id = generate_id('focus')

        focus_data = {
            'focus_id': focus_id,
            'user_id': user['user_id'],
            'company_id': user['company_id'],
            'date': focus.start_time.date(),
            **focus.dict()
        }

        await db.insert('focus_time', focus_data)
        return {'success': True, 'focus_id': focus_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/focus-time')
async def get_focus_time(user_id: Optional[str] = None, start_date: Optional[str] = None,
                        end_date: Optional[str] = None, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        query = {'company_id': user['company_id']}
        if user_id:
            query['user_id'] = user_id

        focus_sessions = await db.query('focus_time', query)
        return {'success': True, 'data': focus_sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/meetings')
async def create_meeting_insight(meeting: MeetingInsight, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        from utils.id_generator import generate_id
        insight_id = generate_id('meeting')

        total_cost = 0
        if meeting.attendee_ids and meeting.duration_minutes:
            for attendee_id in meeting.attendee_ids:
                attendee = await db.get('users', {'user_id': attendee_id})
                if attendee and attendee.get('hourly_rate'):
                    total_cost += (attendee['hourly_rate'] * meeting.duration_minutes / 60)

        meeting_data = {
            'insight_id': insight_id,
            'company_id': user['company_id'],
            'organizer_id': user['user_id'],
            'total_cost': round(total_cost, 2),
            **meeting.dict()
        }

        await db.insert('meeting_insights', meeting_data)
        return {'success': True, 'insight_id': insight_id, 'total_cost': total_cost}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/meetings')
async def get_meeting_insights(start_date: Optional[str] = None, end_date: Optional[str] = None,
                               user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        meetings = await db.query('meeting_insights', {'company_id': user['company_id']})
        return {'success': True, 'data': meetings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/meetings/summary')
async def get_meeting_summary(start_date: Optional[str] = None, end_date: Optional[str] = None,
                             user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        meetings = await db.query('meeting_insights', {'company_id': user['company_id']})

        total_meetings = len(meetings)
        total_duration = sum(m.get('duration_minutes', 0) for m in meetings)
        total_cost = sum(m.get('total_cost', 0) for m in meetings)
        avg_attendees = sum(m.get('attendee_count', 0) for m in meetings) / total_meetings if total_meetings > 0 else 0

        return {
            'success': True,
            'data': {
                'total_meetings': total_meetings,
                'total_duration_minutes': total_duration,
                'total_cost': round(total_cost, 2),
                'average_attendees': round(avg_attendees, 1),
                'average_duration': round(total_duration / total_meetings, 1) if total_meetings > 0 else 0
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/burnout-risk')
async def get_burnout_risk(user_id: Optional[str] = None, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        target_user = user_id or user['user_id']
        today = date.today()
        week_start = today - timedelta(days=today.weekday())

        indicator = await db.get('burnout_indicators', {'user_id': target_user, 'week_start_date': week_start})

        if not indicator:
            time_entries = await db.query('time_entries', {'user_id': target_user})

            current_week_entries = [
                e for e in time_entries
                if datetime.fromisoformat(e['start_time']).date() >= week_start
            ]

            total_hours = sum(e.get('duration', 0) for e in current_week_entries) / 3600
            avg_daily_hours = total_hours / 7

            risk_level = 'low'
            risk_score = 0

            if avg_daily_hours > 10:
                risk_level = 'high'
                risk_score = 75
            elif avg_daily_hours > 8:
                risk_level = 'moderate'
                risk_score = 50

            from utils.id_generator import generate_id
            indicator_id = generate_id('burnout')

            indicator = {
                'indicator_id': indicator_id,
                'user_id': target_user,
                'company_id': user['company_id'],
                'week_start_date': week_start,
                'risk_level': risk_level,
                'risk_score': risk_score,
                'avg_daily_hours': round(avg_daily_hours, 2),
                'weekend_work_hours': 0,
                'late_night_hours': 0,
                'consecutive_work_days': 0,
                'recommendations': []
            }

            await db.insert('burnout_indicators', indicator)

        return {'success': True, 'data': indicator}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/team-productivity')
async def get_team_productivity(start_date: Optional[str] = None, end_date: Optional[str] = None,
                               user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        target_date = date.fromisoformat(start_date) if start_date else date.today()

        scores = await db.query('productivity_scores', {'company_id': user['company_id'], 'date': target_date})

        if not scores:
            return {'success': True, 'data': {'average_score': 0, 'team_scores': []}}

        avg_score = sum(s.get('overall_score', 0) for s in scores) / len(scores)

        team_scores = []
        for score in scores:
            user_data = await db.get('users', {'user_id': score['user_id']})
            team_scores.append({
                'user_id': score['user_id'],
                'user_name': user_data.get('name') if user_data else 'Unknown',
                'overall_score': score.get('overall_score', 0),
                'productive_minutes': score.get('total_productive_minutes', 0),
                'active_minutes': score.get('total_active_minutes', 0)
            })

        team_scores.sort(key=lambda x: x['overall_score'], reverse=True)

        return {
            'success': True,
            'data': {
                'average_score': round(avg_score, 1),
                'team_scores': team_scores
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/trends')
async def get_productivity_trends(user_id: Optional[str] = None, days: int = 30,
                                 user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        target_user = user_id or user['user_id']
        end_date = date.today()
        start_date = end_date - timedelta(days=days)

        scores = await db.query('productivity_scores', {'user_id': target_user})

        scores = [s for s in scores if start_date <= date.fromisoformat(str(s['date'])) <= end_date]
        scores.sort(key=lambda x: x['date'])

        trend_data = []
        for score in scores:
            trend_data.append({
                'date': str(score['date']),
                'overall_score': score.get('overall_score', 0),
                'productive_minutes': score.get('total_productive_minutes', 0),
                'focus_score': score.get('focus_score', 0)
            })

        return {'success': True, 'data': trend_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date, timedelta

router = APIRouter(prefix='/api/productivity', tags=['Productivity Monitoring'])

class AppUsage(BaseModel):
    app_name: str
    app_title: Optional[str] = None
    duration_seconds: int
    timestamp: Optional[datetime] = None

class WebsiteUsage(BaseModel):
    url: str
    domain: str
    page_title: Optional[str] = None
    duration_seconds: int
    timestamp: Optional[datetime] = None

class AppCategory(BaseModel):
    app_name: str
    app_path: Optional[str] = None
    category: str
    productivity_score: int

class WebsiteCategory(BaseModel):
    domain: str
    url_pattern: Optional[str] = None
    category: str
    productivity_score: int

class BlockedApp(BaseModel):
    app_name: str
    app_path: Optional[str] = None
    reason: Optional[str] = None
    enabled: bool = True

class BlockedWebsite(BaseModel):
    domain: str
    url_pattern: Optional[str] = None
    reason: Optional[str] = None
    enabled: bool = True

def get_category_for_app(app_name: str, company_id: str, db) -> Optional[dict]:
    categories = db.query('app_categories', {'company_id': company_id, 'app_name': app_name})
    if categories:
        return categories[0]
    default_categories = db.query('app_categories', {'company_id': None, 'app_name': app_name, 'is_default': True})
    if default_categories:
        return default_categories[0]
    return None

def get_category_for_website(domain: str, company_id: str, db) -> Optional[dict]:
    categories = db.query('website_categories', {'company_id': company_id, 'domain': domain})
    if categories:
        return categories[0]
    default_categories = db.query('website_categories', {'company_id': None, 'domain': domain, 'is_default': True})
    if default_categories:
        return default_categories[0]
    return None

@router.post('/app-usage')
async def track_app_usage(usage: AppUsage, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        from utils.id_generator import generate_id
        usage_id = generate_id('appuse')

        category = await get_category_for_app(usage.app_name, user['company_id'], db)

        usage_data = {
            'usage_id': usage_id,
            'user_id': user['user_id'],
            'company_id': user['company_id'],
            'app_name': usage.app_name,
            'app_title': usage.app_title,
            'duration_seconds': usage.duration_seconds,
            'productivity_category': category['category'] if category else 'neutral',
            'productivity_score': category['productivity_score'] if category else 0,
            'timestamp': usage.timestamp or datetime.utcnow(),
            'date': (usage.timestamp or datetime.utcnow()).date()
        }

        await db.insert('app_usage', usage_data)
        return {'success': True, 'usage_id': usage_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/website-usage')
async def track_website_usage(usage: WebsiteUsage, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        from utils.id_generator import generate_id
        usage_id = generate_id('webuse')

        category = await get_category_for_website(usage.domain, user['company_id'], db)

        usage_data = {
            'usage_id': usage_id,
            'user_id': user['user_id'],
            'company_id': user['company_id'],
            'url': usage.url,
            'domain': usage.domain,
            'page_title': usage.page_title,
            'duration_seconds': usage.duration_seconds,
            'productivity_category': category['category'] if category else 'neutral',
            'productivity_score': category['productivity_score'] if category else 0,
            'timestamp': usage.timestamp or datetime.utcnow(),
            'date': (usage.timestamp or datetime.utcnow()).date()
        }

        await db.insert('website_usage', usage_data)
        return {'success': True, 'usage_id': usage_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/app-usage/summary')
async def get_app_usage_summary(user_id: Optional[str] = None, start_date: Optional[str] = None,
                                end_date: Optional[str] = None, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        query = {'company_id': user['company_id']}
        if user_id:
            query['user_id'] = user_id

        usages = await db.query('app_usage', query)

        summary = {}
        for usage in usages:
            app = usage['app_name']
            if app not in summary:
                summary[app] = {
                    'app_name': app,
                    'total_seconds': 0,
                    'category': usage.get('productivity_category', 'neutral'),
                    'productivity_score': usage.get('productivity_score', 0)
                }
            summary[app]['total_seconds'] += usage['duration_seconds']

        return {'success': True, 'data': list(summary.values())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/website-usage/summary')
async def get_website_usage_summary(user_id: Optional[str] = None, start_date: Optional[str] = None,
                                   end_date: Optional[str] = None, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        query = {'company_id': user['company_id']}
        if user_id:
            query['user_id'] = user_id

        usages = await db.query('website_usage', query)

        summary = {}
        for usage in usages:
            domain = usage['domain']
            if domain not in summary:
                summary[domain] = {
                    'domain': domain,
                    'total_seconds': 0,
                    'category': usage.get('productivity_category', 'neutral'),
                    'productivity_score': usage.get('productivity_score', 0)
                }
            summary[domain]['total_seconds'] += usage['duration_seconds']

        return {'success': True, 'data': list(summary.values())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/app-categories')
async def create_app_category(category: AppCategory, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        from utils.id_generator import generate_id
        category_id = generate_id('appc')

        category_data = {
            'category_id': category_id,
            'company_id': user['company_id'],
            **category.dict()
        }

        await db.insert('app_categories', category_data)
        return {'success': True, 'category_id': category_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/app-categories')
async def get_app_categories(user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        company_categories = await db.query('app_categories', {'company_id': user['company_id']})
        default_categories = await db.query('app_categories', {'company_id': None, 'is_default': True})
        return {'success': True, 'data': company_categories + default_categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/website-categories')
async def create_website_category(category: WebsiteCategory, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        from utils.id_generator import generate_id
        category_id = generate_id('webc')

        category_data = {
            'category_id': category_id,
            'company_id': user['company_id'],
            **category.dict()
        }

        await db.insert('website_categories', category_data)
        return {'success': True, 'category_id': category_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/website-categories')
async def get_website_categories(user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        company_categories = await db.query('website_categories', {'company_id': user['company_id']})
        default_categories = await db.query('website_categories', {'company_id': None, 'is_default': True})
        return {'success': True, 'data': company_categories + default_categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/blocked-apps')
async def block_app(blocked: BlockedApp, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        from utils.id_generator import generate_id
        block_id = generate_id('blka')

        block_data = {
            'block_id': block_id,
            'company_id': user['company_id'],
            'created_by': user['user_id'],
            **blocked.dict()
        }

        await db.insert('blocked_apps', block_data)
        return {'success': True, 'block_id': block_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/blocked-apps')
async def get_blocked_apps(user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        blocked = await db.query('blocked_apps', {'company_id': user['company_id'], 'enabled': True})
        return {'success': True, 'data': blocked}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/blocked-websites')
async def block_website(blocked: BlockedWebsite, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        from utils.id_generator import generate_id
        block_id = generate_id('blkw')

        block_data = {
            'block_id': block_id,
            'company_id': user['company_id'],
            'created_by': user['user_id'],
            **blocked.dict()
        }

        await db.insert('blocked_websites', block_data)
        return {'success': True, 'block_id': block_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/blocked-websites')
async def get_blocked_websites(user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        blocked = await db.query('blocked_websites', {'company_id': user['company_id'], 'enabled': True})
        return {'success': True, 'data': blocked}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/productivity-score')
async def get_productivity_score(user_id: Optional[str] = None, date_param: Optional[str] = None,
                                user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        target_user = user_id or user['user_id']
        target_date = date.fromisoformat(date_param) if date_param else date.today()

        score = await db.get('productivity_scores', {'user_id': target_user, 'date': target_date})

        if not score:
            app_usage = await db.query('app_usage', {'user_id': target_user, 'date': target_date})
            website_usage = await db.query('website_usage', {'user_id': target_user, 'date': target_date})

            total_productive = sum(u['duration_seconds'] for u in app_usage + website_usage if u.get('productivity_category') == 'productive')
            total_neutral = sum(u['duration_seconds'] for u in app_usage + website_usage if u.get('productivity_category') == 'neutral')
            total_unproductive = sum(u['duration_seconds'] for u in app_usage + website_usage if u.get('productivity_category') == 'unproductive')
            total_time = total_productive + total_neutral + total_unproductive

            overall_score = int((total_productive / total_time * 100)) if total_time > 0 else 0

            from utils.id_generator import generate_id
            score_id = generate_id('pscore')

            score_data = {
                'score_id': score_id,
                'user_id': target_user,
                'company_id': user['company_id'],
                'date': target_date,
                'overall_score': overall_score,
                'total_productive_minutes': total_productive // 60,
                'total_neutral_minutes': total_neutral // 60,
                'total_unproductive_minutes': total_unproductive // 60
            }

            await db.insert('productivity_scores', score_data)
            score = score_data

        return {'success': True, 'data': score}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

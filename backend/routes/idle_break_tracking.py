from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix='/api/tracking', tags=['Idle & Break Tracking'])

class IdlePeriod(BaseModel):
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    reason: str = 'unknown'
    notes: Optional[str] = None

class Break(BaseModel):
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    break_type: str = 'general'
    is_paid: bool = False
    notes: Optional[str] = None

@router.post('/idle/start')
async def start_idle_period(idle: IdlePeriod, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        from utils.id_generator import generate_id
        idle_id = generate_id('idle')

        idle_data = {
            'idle_id': idle_id,
            'user_id': user['user_id'],
            'company_id': user['company_id'],
            'start_time': idle.start_time,
            'reason': idle.reason,
            'is_automatic': True
        }

        await db.insert('idle_periods', idle_data)
        return {'success': True, 'idle_id': idle_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/idle/{idle_id}/end')
async def end_idle_period(idle_id: str, end_time: datetime, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        idle = await db.get('idle_periods', {'idle_id': idle_id})
        if not idle:
            raise HTTPException(status_code=404, detail='Idle period not found')

        duration = int((end_time - datetime.fromisoformat(idle['start_time'])).total_seconds())

        await db.update('idle_periods', {'idle_id': idle_id}, {
            'end_time': end_time,
            'duration_seconds': duration
        })

        return {'success': True, 'duration_seconds': duration}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/idle')
async def get_idle_periods(user_id: Optional[str] = None, start_date: Optional[str] = None,
                          end_date: Optional[str] = None, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        query = {'company_id': user['company_id']}
        if user_id:
            query['user_id'] = user_id

        idle_periods = await db.query('idle_periods', query)
        return {'success': True, 'data': idle_periods}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/breaks/start')
async def start_break(break_data: Break, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        from utils.id_generator import generate_id
        break_id = generate_id('break')

        data = {
            'break_id': break_id,
            'user_id': user['user_id'],
            'company_id': user['company_id'],
            'start_time': break_data.start_time,
            'break_type': break_data.break_type,
            'is_paid': break_data.is_paid,
            'notes': break_data.notes
        }

        await db.insert('breaks', data)
        return {'success': True, 'break_id': break_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/breaks/{break_id}/end')
async def end_break(break_id: str, end_time: datetime, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        break_record = await db.get('breaks', {'break_id': break_id})
        if not break_record:
            raise HTTPException(status_code=404, detail='Break not found')

        duration = int((end_time - datetime.fromisoformat(break_record['start_time'])).total_seconds() / 60)

        await db.update('breaks', {'break_id': break_id}, {
            'end_time': end_time,
            'duration_minutes': duration
        })

        return {'success': True, 'duration_minutes': duration}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/breaks')
async def get_breaks(user_id: Optional[str] = None, start_date: Optional[str] = None,
                    end_date: Optional[str] = None, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        query = {'company_id': user['company_id']}
        if user_id:
            query['user_id'] = user_id

        breaks = await db.query('breaks', query)
        return {'success': True, 'data': breaks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/breaks/summary')
async def get_break_summary(user_id: Optional[str] = None, date: Optional[str] = None,
                           user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        target_user = user_id or user['user_id']
        target_date = date or datetime.now().date().isoformat()

        breaks = await db.query('breaks', {'user_id': target_user})

        total_breaks = len(breaks)
        total_minutes = sum(b.get('duration_minutes', 0) for b in breaks if b.get('duration_minutes'))
        paid_breaks = sum(1 for b in breaks if b.get('is_paid'))

        return {
            'success': True,
            'data': {
                'total_breaks': total_breaks,
                'total_minutes': total_minutes,
                'paid_breaks': paid_breaks,
                'unpaid_breaks': total_breaks - paid_breaks
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

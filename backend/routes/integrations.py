from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

router = APIRouter(prefix='/api/integrations', tags=['Integrations'])

class Integration(BaseModel):
    integration_type: str
    name: str
    config: Dict[str, Any] = {}
    credentials: Optional[Dict[str, Any]] = None

class SyncLog(BaseModel):
    sync_type: str
    status: str
    records_synced: int = 0
    error_message: Optional[str] = None
    sync_duration_ms: Optional[int] = None

@router.post('')
async def create_integration(integration: Integration, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        from utils.id_generator import generate_id
        integration_id = generate_id('integ')

        integration_data = {
            'integration_id': integration_id,
            'company_id': user['company_id'],
            'integration_type': integration.integration_type,
            'name': integration.name,
            'config': integration.config,
            'credentials': integration.credentials,
            'status': 'active',
            'created_by': user['user_id']
        }

        await db.insert('integrations', integration_data)
        return {'success': True, 'integration_id': integration_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('')
async def get_integrations(user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        integrations = await db.query('integrations', {'company_id': user['company_id']})
        return {'success': True, 'data': integrations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/{integration_id}')
async def get_integration(integration_id: str, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        integration = await db.get('integrations', {'integration_id': integration_id})
        if not integration:
            raise HTTPException(status_code=404, detail='Integration not found')
        return {'success': True, 'data': integration}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put('/{integration_id}')
async def update_integration(integration_id: str, integration: Integration, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        await db.update('integrations', {'integration_id': integration_id}, integration.dict(exclude_unset=True))
        return {'success': True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete('/{integration_id}')
async def delete_integration(integration_id: str, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        await db.delete('integrations', {'integration_id': integration_id})
        return {'success': True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/{integration_id}/sync')
async def sync_integration(integration_id: str, sync_data: SyncLog, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        integration = await db.get('integrations', {'integration_id': integration_id})
        if not integration:
            raise HTTPException(status_code=404, detail='Integration not found')

        from utils.id_generator import generate_id
        log_id = generate_id('synclog')

        log_data = {
            'log_id': log_id,
            'integration_id': integration_id,
            **sync_data.dict()
        }

        await db.insert('integration_sync_logs', log_data)

        await db.update('integrations', {'integration_id': integration_id}, {
            'last_sync_at': datetime.utcnow(),
            'status': 'active' if sync_data.status == 'success' else 'error',
            'error_message': sync_data.error_message
        })

        return {'success': True, 'log_id': log_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/{integration_id}/logs')
async def get_sync_logs(integration_id: str, limit: int = 50, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        logs = await db.query('integration_sync_logs', {'integration_id': integration_id})
        return {'success': True, 'data': logs[:limit]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/types/available')
async def get_available_integration_types():
    return {
        'success': True,
        'data': [
            {'type': 'jira', 'name': 'Jira', 'category': 'project_management'},
            {'type': 'asana', 'name': 'Asana', 'category': 'project_management'},
            {'type': 'trello', 'name': 'Trello', 'category': 'project_management'},
            {'type': 'monday', 'name': 'Monday.com', 'category': 'project_management'},
            {'type': 'clickup', 'name': 'ClickUp', 'category': 'project_management'},
            {'type': 'github', 'name': 'GitHub', 'category': 'development'},
            {'type': 'gitlab', 'name': 'GitLab', 'category': 'development'},
            {'type': 'bitbucket', 'name': 'Bitbucket', 'category': 'development'},
            {'type': 'slack', 'name': 'Slack', 'category': 'communication'},
            {'type': 'teams', 'name': 'Microsoft Teams', 'category': 'communication'},
            {'type': 'zoom', 'name': 'Zoom', 'category': 'communication'},
            {'type': 'quickbooks', 'name': 'QuickBooks', 'category': 'accounting'},
            {'type': 'xero', 'name': 'Xero', 'category': 'accounting'},
            {'type': 'notion', 'name': 'Notion', 'category': 'productivity'}
        ]
    }

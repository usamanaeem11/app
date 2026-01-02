from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

router = APIRouter(prefix='/api/security', tags=['Security & Compliance'])

class AuditLog(BaseModel):
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class USBEvent(BaseModel):
    device_name: str
    device_id: Optional[str] = None
    vendor_id: Optional[str] = None
    product_id: Optional[str] = None
    event_type: str
    action_taken: str = 'allowed'
    file_operations: list = []

class DLPIncident(BaseModel):
    incident_type: str
    severity: str = 'medium'
    description: str
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    destination: Optional[str] = None
    action_taken: str = 'logged'
    policy_violated: Optional[str] = None

class SecurityAlert(BaseModel):
    alert_type: str
    severity: str = 'medium'
    title: str
    description: str
    metadata: Dict[str, Any] = {}

@router.post('/audit-logs')
async def create_audit_log(log: AuditLog, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        from utils.id_generator import generate_id
        audit_id = generate_id('audit')

        log_data = {
            'audit_id': audit_id,
            'company_id': user['company_id'],
            'user_id': user['user_id'],
            'timestamp': datetime.utcnow(),
            **log.dict()
        }

        await db.insert('audit_logs', log_data)
        return {'success': True, 'audit_id': audit_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/audit-logs')
async def get_audit_logs(resource_type: Optional[str] = None, user_id: Optional[str] = None,
                        start_date: Optional[str] = None, end_date: Optional[str] = None,
                        limit: int = 100, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        query = {'company_id': user['company_id']}
        if resource_type:
            query['resource_type'] = resource_type
        if user_id:
            query['user_id'] = user_id

        logs = await db.query('audit_logs', query)
        return {'success': True, 'data': logs[:limit]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/usb-events')
async def log_usb_event(event: USBEvent, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        from utils.id_generator import generate_id
        event_id = generate_id('usb')

        event_data = {
            'event_id': event_id,
            'user_id': user['user_id'],
            'company_id': user['company_id'],
            'timestamp': datetime.utcnow(),
            **event.dict()
        }

        await db.insert('usb_events', event_data)

        if event.action_taken == 'blocked':
            alert_data = {
                'alert_id': generate_id('alert'),
                'company_id': user['company_id'],
                'user_id': user['user_id'],
                'alert_type': 'policy_violation',
                'severity': 'medium',
                'title': f'USB Device Blocked: {event.device_name}',
                'description': f'USB device "{event.device_name}" was blocked per company policy',
                'timestamp': datetime.utcnow(),
                'metadata': {'event_id': event_id}
            }
            await db.insert('security_alerts', alert_data)

        return {'success': True, 'event_id': event_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/usb-events')
async def get_usb_events(user_id: Optional[str] = None, start_date: Optional[str] = None,
                        end_date: Optional[str] = None, limit: int = 100,
                        user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        query = {'company_id': user['company_id']}
        if user_id:
            query['user_id'] = user_id

        events = await db.query('usb_events', query)
        return {'success': True, 'data': events[:limit]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/dlp-incidents')
async def create_dlp_incident(incident: DLPIncident, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        from utils.id_generator import generate_id
        incident_id = generate_id('dlp')

        incident_data = {
            'incident_id': incident_id,
            'user_id': user['user_id'],
            'company_id': user['company_id'],
            'timestamp': datetime.utcnow(),
            **incident.dict()
        }

        await db.insert('dlp_incidents', incident_data)

        if incident.severity in ['high', 'critical']:
            alert_data = {
                'alert_id': generate_id('alert'),
                'company_id': user['company_id'],
                'user_id': user['user_id'],
                'alert_type': 'data_exfiltration',
                'severity': incident.severity,
                'title': f'DLP Incident: {incident.incident_type}',
                'description': incident.description,
                'timestamp': datetime.utcnow(),
                'metadata': {'incident_id': incident_id}
            }
            await db.insert('security_alerts', alert_data)

        return {'success': True, 'incident_id': incident_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/dlp-incidents')
async def get_dlp_incidents(user_id: Optional[str] = None, severity: Optional[str] = None,
                           limit: int = 100, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        query = {'company_id': user['company_id']}
        if user_id:
            query['user_id'] = user_id
        if severity:
            query['severity'] = severity

        incidents = await db.query('dlp_incidents', query)
        return {'success': True, 'data': incidents[:limit]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/alerts')
async def create_security_alert(alert: SecurityAlert, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        from utils.id_generator import generate_id
        alert_id = generate_id('alert')

        alert_data = {
            'alert_id': alert_id,
            'company_id': user['company_id'],
            'user_id': user.get('user_id'),
            'timestamp': datetime.utcnow(),
            'status': 'open',
            **alert.dict()
        }

        await db.insert('security_alerts', alert_data)
        return {'success': True, 'alert_id': alert_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/alerts')
async def get_security_alerts(status: Optional[str] = None, severity: Optional[str] = None,
                             limit: int = 100, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        query = {'company_id': user['company_id']}
        if status:
            query['status'] = status
        if severity:
            query['severity'] = severity

        alerts = await db.query('security_alerts', query)
        return {'success': True, 'data': alerts[:limit]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put('/alerts/{alert_id}/resolve')
async def resolve_alert(alert_id: str, resolution_notes: str, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        await db.update('security_alerts', {'alert_id': alert_id}, {
            'status': 'resolved',
            'resolved_at': datetime.utcnow(),
            'resolved_by': user['user_id'],
            'resolution_notes': resolution_notes
        })
        return {'success': True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/dashboard')
async def get_security_dashboard(user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        open_alerts = await db.query('security_alerts', {'company_id': user['company_id'], 'status': 'open'})
        critical_alerts = [a for a in open_alerts if a.get('severity') == 'critical']
        high_alerts = [a for a in open_alerts if a.get('severity') == 'high']

        dlp_incidents = await db.query('dlp_incidents', {'company_id': user['company_id']})
        recent_incidents = sorted(dlp_incidents, key=lambda x: x.get('timestamp', ''), reverse=True)[:10]

        usb_events = await db.query('usb_events', {'company_id': user['company_id']})
        blocked_usb = [e for e in usb_events if e.get('action_taken') == 'blocked']

        return {
            'success': True,
            'data': {
                'open_alerts': len(open_alerts),
                'critical_alerts': len(critical_alerts),
                'high_alerts': len(high_alerts),
                'total_dlp_incidents': len(dlp_incidents),
                'blocked_usb_devices': len(blocked_usb),
                'recent_incidents': recent_incidents
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

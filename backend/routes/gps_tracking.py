from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import math

router = APIRouter(prefix='/api/gps', tags=['GPS Tracking'])

class GPSLocation(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = 0
    altitude: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    address: Optional[str] = None
    activity_type: Optional[str] = 'unknown'
    battery_level: Optional[int] = None

class Geofence(BaseModel):
    name: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    radius_meters: int = 100
    auto_clock_in: bool = False
    auto_clock_out: bool = False
    enabled: bool = True

class FieldSite(BaseModel):
    name: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    site_type: str = 'general'
    status: str = 'active'
    notes: Optional[str] = None

class Route(BaseModel):
    start_location: dict
    end_location: Optional[dict] = None
    waypoints: List[dict] = []
    purpose: Optional[str] = None
    notes: Optional[str] = None

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2) * math.sin(dLat/2) + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2) * math.sin(dLon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

@router.post('/locations')
async def track_location(location: GPSLocation, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        from utils.id_generator import generate_id
        location_id = generate_id('loc')

        location_data = {
            'location_id': location_id,
            'user_id': user['user_id'],
            'company_id': user['company_id'],
            'latitude': location.latitude,
            'longitude': location.longitude,
            'accuracy': location.accuracy,
            'altitude': location.altitude,
            'speed': location.speed,
            'heading': location.heading,
            'address': location.address,
            'activity_type': location.activity_type,
            'battery_level': location.battery_level,
            'timestamp': datetime.utcnow().isoformat()
        }

        await db.insert('gps_locations', location_data)

        geofences = await db.query(
            'geofences',
            {'company_id': user['company_id'], 'enabled': True}
        )

        for fence in geofences:
            distance = calculate_distance(
                location.latitude, location.longitude,
                float(fence['latitude']), float(fence['longitude'])
            )

            if distance * 1000 <= fence['radius_meters']:
                if fence['auto_clock_in']:
                    pass
                if fence['auto_clock_out']:
                    pass

        return {'success': True, 'location_id': location_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/locations')
async def get_locations(user_id: Optional[str] = None, start_date: Optional[str] = None,
                       end_date: Optional[str] = None, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        query = {'company_id': user['company_id']}
        if user_id:
            query['user_id'] = user_id

        locations = await db.query('gps_locations', query)
        return {'success': True, 'data': locations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/geofences')
async def create_geofence(geofence: Geofence, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        from utils.id_generator import generate_id
        geofence_id = generate_id('geof')

        geofence_data = {
            'geofence_id': geofence_id,
            'company_id': user['company_id'],
            'name': geofence.name,
            'description': geofence.description,
            'latitude': geofence.latitude,
            'longitude': geofence.longitude,
            'radius_meters': geofence.radius_meters,
            'auto_clock_in': geofence.auto_clock_in,
            'auto_clock_out': geofence.auto_clock_out,
            'enabled': geofence.enabled,
            'created_by': user['user_id']
        }

        await db.insert('geofences', geofence_data)
        return {'success': True, 'geofence_id': geofence_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/geofences')
async def get_geofences(user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        geofences = await db.query('geofences', {'company_id': user['company_id']})
        return {'success': True, 'data': geofences}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put('/geofences/{geofence_id}')
async def update_geofence(geofence_id: str, geofence: Geofence, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        await db.update('geofences', {'geofence_id': geofence_id}, geofence.dict(exclude_unset=True))
        return {'success': True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete('/geofences/{geofence_id}')
async def delete_geofence(geofence_id: str, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        await db.delete('geofences', {'geofence_id': geofence_id})
        return {'success': True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/field-sites')
async def create_field_site(site: FieldSite, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        from utils.id_generator import generate_id
        site_id = generate_id('site')

        site_data = {
            'site_id': site_id,
            'company_id': user['company_id'],
            **site.dict()
        }

        await db.insert('field_sites', site_data)
        return {'success': True, 'site_id': site_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/field-sites')
async def get_field_sites(user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        sites = await db.query('field_sites', {'company_id': user['company_id']})
        return {'success': True, 'data': sites}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/routes/start')
async def start_route(route: Route, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        from utils.id_generator import generate_id
        route_id = generate_id('route')

        route_data = {
            'route_id': route_id,
            'user_id': user['user_id'],
            'company_id': user['company_id'],
            'start_location': route.start_location,
            'waypoints': route.waypoints,
            'start_time': datetime.utcnow().isoformat(),
            'purpose': route.purpose,
            'notes': route.notes
        }

        await db.insert('routes', route_data)
        return {'success': True, 'route_id': route_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/routes/{route_id}/end')
async def end_route(route_id: str, end_location: dict, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        route = await db.get('routes', {'route_id': route_id})
        if not route:
            raise HTTPException(status_code=404, detail='Route not found')

        start = route['start_location']
        distance = calculate_distance(
            start['latitude'], start['longitude'],
            end_location['latitude'], end_location['longitude']
        )

        duration = (datetime.utcnow() - datetime.fromisoformat(route['start_time'])).total_seconds() / 60

        await db.update('routes', {'route_id': route_id}, {
            'end_location': end_location,
            'end_time': datetime.utcnow().isoformat(),
            'total_distance_km': round(distance, 2),
            'total_duration_minutes': int(duration)
        })

        return {'success': True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/routes')
async def get_routes(user_id: Optional[str] = None, user=Depends(lambda: None), db=Depends(lambda: None)):
    try:
        query = {'company_id': user['company_id']}
        if user_id:
            query['user_id'] = user_id

        routes = await db.query('routes', query)
        return {'success': True, 'data': routes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

'''
Business: API для управления графиками движения поездов - получение, создание, обновление станций, линий, поездов
Args: event с httpMethod, body, queryStringParameters; context с request_id
Returns: HTTP response с данными из БД
'''
import json
import os
from typing import Dict, Any, Optional, List
from datetime import datetime
from decimal import Decimal
import psycopg2
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel, Field, field_validator

class LineCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = Field(pattern=r'^#[0-9A-Fa-f]{6}$', default='#0EA5E9')

class StationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    position: int = Field(ge=0)
    distance_km: float = Field(ge=0)
    line_id: Optional[int] = None

class TrainCreate(BaseModel):
    schedule_id: int = Field(default=1, ge=1)
    number: str = Field(min_length=1, max_length=50)
    type: str = Field(pattern=r'^(freight|passenger|service)$')
    departure_station_id: int = Field(ge=1)
    arrival_station_id: int = Field(ge=1)
    departure_time: int = Field(ge=0, le=1440)
    arrival_time: int = Field(ge=0, le=1440)
    color: str = Field(pattern=r'^#[0-9A-Fa-f]{6}$')
    line_style: str = Field(default='solid')
    line_width: float = Field(default=2.5, ge=0.5, le=10)

def json_serial(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError(f'Type {type(obj)} not serializable')

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)

def response(status_code: int, body: Any = None, content_type: str = 'application/json') -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': content_type,
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(body, default=json_serial) if body is not None else '',
        'isBase64Encoded': False
    }

def handle_get(cur, path: str, params: Dict[str, str]) -> Dict[str, Any]:
    routes = {
        'lines': ('SELECT * FROM lines ORDER BY id', []),
        'stations': ('''
            SELECT s.id, s.name, s.position, s.distance_km, s.line_id, s.created_at,
                   l.name as line_name, l.color as line_color 
            FROM stations s 
            LEFT JOIN lines l ON s.line_id = l.id 
            ORDER BY s.position
        ''', []),
        'trains': ('SELECT * FROM trains WHERE schedule_id = %s ORDER BY id', [params.get('schedule_id', '1')]),
        'legend': ('SELECT * FROM legend_items WHERE schedule_id = %s', [params.get('schedule_id', '1')]),
    }
    
    if path == 'train_stops':
        train_id = params.get('train_id')
        if train_id:
            query = '''
                SELECT ts.*, s.name as station_name, s.distance_km, s.position
                FROM train_stops ts
                JOIN stations s ON ts.station_id = s.id
                WHERE ts.train_id = %s
                ORDER BY ts.arrival_time
            '''
            cur.execute(query, (train_id,))
        else:
            query = '''
                SELECT ts.*, s.name as station_name, s.distance_km, s.position
                FROM train_stops ts
                JOIN stations s ON ts.station_id = s.id
                ORDER BY ts.train_id, ts.arrival_time
            '''
            cur.execute(query)
        return response(200, [dict(row) for row in cur.fetchall()])
    
    if path in routes:
        query, args = routes[path]
        cur.execute(query, args)
        return response(200, [dict(row) for row in cur.fetchall()])
    
    return response(404, {'error': 'Unknown path'})

def handle_post(cur, conn, path: str, data: Dict[str, Any]) -> Dict[str, Any]:
    if path == 'lines':
        validated = LineCreate(**data)
        cur.execute('INSERT INTO lines (name, color) VALUES (%s, %s) RETURNING *',
                   (validated.name, validated.color))
    elif path == 'stations':
        validated = StationCreate(**data)
        cur.execute('INSERT INTO stations (name, position, distance_km, line_id) VALUES (%s, %s, %s, %s) RETURNING *',
                   (validated.name, validated.position, validated.distance_km, validated.line_id))
    elif path == 'trains':
        validated = TrainCreate(**data)
        cur.execute('''
            INSERT INTO trains (schedule_id, number, type, departure_station_id, arrival_station_id, 
                               departure_time, arrival_time, color, line_style, line_width) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
        ''', (validated.schedule_id, validated.number, validated.type,
              validated.departure_station_id, validated.arrival_station_id,
              validated.departure_time, validated.arrival_time, validated.color,
              validated.line_style, validated.line_width))
    elif path == 'train_stops':
        cur.execute('''
            INSERT INTO train_stops (train_id, station_id, arrival_time, departure_time)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (train_id, station_id) 
            DO UPDATE SET arrival_time = EXCLUDED.arrival_time, departure_time = EXCLUDED.departure_time
            RETURNING *
        ''', (data.get('train_id'), data.get('station_id'), data.get('arrival_time'), data.get('departure_time')))
    else:
        return response(404, {'error': 'Unknown path'})
    
    conn.commit()
    result = cur.fetchone()
    return response(201, dict(result))

def handle_put(cur, conn, path: str, data: Dict[str, Any]) -> Dict[str, Any]:
    item_id = data.get('id')
    if not item_id:
        return response(400, {'error': 'ID is required'})
    
    updates = {
        'lines': ('UPDATE lines SET name = %s, color = %s WHERE id = %s RETURNING *',
                 [data.get('name'), data.get('color'), item_id]),
        'stations': ('UPDATE stations SET name = %s, position = %s, distance_km = %s, line_id = %s WHERE id = %s RETURNING *',
                    [data.get('name'), data.get('position'), data.get('distance_km'), data.get('line_id'), item_id]),
        'trains': ('''UPDATE trains SET number = %s, type = %s, departure_station_id = %s, 
                     arrival_station_id = %s, departure_time = %s, arrival_time = %s, 
                     color = %s, line_style = %s, line_width = %s WHERE id = %s RETURNING *''',
                  [data.get('number'), data.get('type'), data.get('departure_station_id'),
                   data.get('arrival_station_id'), data.get('departure_time'), data.get('arrival_time'),
                   data.get('color'), data.get('line_style'), data.get('line_width'), item_id]),
        'legend': ('UPDATE legend_items SET label = %s, color = %s, dashed = %s WHERE id = %s RETURNING *',
                  [data.get('label'), data.get('color'), data.get('dashed'), item_id]),
        'train_stops': ('''UPDATE train_stops SET station_id = %s, arrival_time = %s, 
                          departure_time = %s WHERE id = %s RETURNING *''',
                       [data.get('station_id'), data.get('arrival_time'), data.get('departure_time'), item_id]),
    }
    
    if path not in updates:
        return response(404, {'error': 'Unknown path'})
    
    query, args = updates[path]
    cur.execute(query, args)
    conn.commit()
    result = cur.fetchone()
    
    if result:
        return response(200, dict(result))
    return response(404, {'error': 'Not found'})

def handle_delete(cur, conn, path: str, item_id: str) -> Dict[str, Any]:
    if not item_id:
        return response(400, {'error': 'ID is required'})
    
    if path == 'stations':
        cur.execute('DELETE FROM train_stops WHERE station_id = %s', (int(item_id),))
        cur.execute('DELETE FROM trains WHERE departure_station_id = %s OR arrival_station_id = %s', 
                   (int(item_id), int(item_id)))
        cur.execute('DELETE FROM stations WHERE id = %s RETURNING id', (int(item_id),))
    elif path == 'lines':
        cur.execute('DELETE FROM lines WHERE id = %s RETURNING id', (int(item_id),))
    elif path == 'trains':
        cur.execute('DELETE FROM trains WHERE id = %s RETURNING id', (int(item_id),))
    elif path == 'train_stops':
        cur.execute('DELETE FROM train_stops WHERE id = %s RETURNING id', (int(item_id),))
    else:
        return response(404, {'error': 'Unknown path'})
    
    deleted = cur.fetchone()
    conn.commit()
    
    if deleted:
        return response(200, {'success': True, 'id': deleted['id']})
    return response(404, {'error': 'Not found'})

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    query_params = event.get('queryStringParameters') or {}
    path = query_params.get('path', '')
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        if method == 'GET':
            return handle_get(cur, path, query_params)
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            return handle_post(cur, conn, path, body_data)
        elif method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            return handle_put(cur, conn, path, body_data)
        elif method == 'DELETE':
            item_id = query_params.get('id', '')
            return handle_delete(cur, conn, path, item_id)
        
        return response(405, {'error': 'Method not allowed'})
        
    except json.JSONDecodeError:
        return response(400, {'error': 'Invalid JSON'})
    except ValueError as e:
        return response(400, {'error': f'Validation error: {str(e)}'})
    except psycopg2.IntegrityError as e:
        return response(409, {'error': 'Database constraint violation'})
    except psycopg2.Error as e:
        return response(500, {'error': 'Database error'})
    except Exception as e:
        return response(500, {'error': 'Internal server error'})
    finally:
        if 'conn' in locals():
            conn.close()
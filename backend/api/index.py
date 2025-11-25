'''
Business: API для управления графиками движения поездов - получение, создание, обновление станций, линий, поездов
Args: event с httpMethod, body, queryStringParameters; context с request_id
Returns: HTTP response с данными из БД
'''
import json
import os
from typing import Dict, Any
from datetime import datetime
from decimal import Decimal
import psycopg2
from psycopg2.extras import RealDictCursor

def json_serial(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError(f'Type {type(obj)} not serializable')

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)

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
            if path == 'lines':
                cur.execute('SELECT * FROM lines ORDER BY id')
                lines = cur.fetchall()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(row) for row in lines], default=json_serial),
                    'isBase64Encoded': False
                }
            
            elif path == 'stations':
                cur.execute('''
                    SELECT s.id, s.name, s.position, s.distance_km, s.line_id, s.created_at,
                           l.name as line_name, l.color as line_color 
                    FROM stations s 
                    LEFT JOIN lines l ON s.line_id = l.id 
                    ORDER BY s.position
                ''')
                stations = cur.fetchall()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(row) for row in stations], default=json_serial),
                    'isBase64Encoded': False
                }
            
            elif path == 'trains':
                schedule_id = query_params.get('schedule_id', '1')
                cur.execute('SELECT * FROM trains WHERE schedule_id = %s ORDER BY id', (schedule_id,))
                trains = cur.fetchall()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(row) for row in trains], default=json_serial),
                    'isBase64Encoded': False
                }
            
            elif path == 'legend':
                schedule_id = query_params.get('schedule_id', '1')
                cur.execute('SELECT * FROM legend_items WHERE schedule_id = %s', (schedule_id,))
                items = cur.fetchall()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(row) for row in items], default=json_serial),
                    'isBase64Encoded': False
                }
            
            elif path == 'train_stops':
                train_id = query_params.get('train_id')
                if train_id:
                    cur.execute('''
                        SELECT ts.*, s.name as station_name, s.distance_km, s.position
                        FROM train_stops ts
                        JOIN stations s ON ts.station_id = s.id
                        WHERE ts.train_id = %s
                        ORDER BY ts.arrival_time
                    ''', (train_id,))
                else:
                    cur.execute('''
                        SELECT ts.*, s.name as station_name, s.distance_km, s.position
                        FROM train_stops ts
                        JOIN stations s ON ts.station_id = s.id
                        ORDER BY ts.train_id, ts.arrival_time
                    ''')
                stops = cur.fetchall()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(row) for row in stops], default=json_serial),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            
            if path == 'lines':
                name = body_data.get('name')
                color = body_data.get('color', '#0EA5E9')
                cur.execute('INSERT INTO lines (name, color) VALUES (%s, %s) RETURNING *', (name, color))
                conn.commit()
                line = cur.fetchone()
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(line), default=json_serial),
                    'isBase64Encoded': False
                }
            
            elif path == 'stations':
                name = body_data.get('name')
                position = body_data.get('position', 0)
                distance_km = body_data.get('distance_km', 0)
                line_id = body_data.get('line_id')
                cur.execute(
                    'INSERT INTO stations (name, position, distance_km, line_id) VALUES (%s, %s, %s, %s) RETURNING *',
                    (name, position, distance_km, line_id)
                )
                conn.commit()
                station = cur.fetchone()
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(station), default=json_serial),
                    'isBase64Encoded': False
                }
            
            elif path == 'trains':
                cur.execute(
                    '''INSERT INTO trains 
                    (schedule_id, number, type, departure_station_id, arrival_station_id, 
                     departure_time, arrival_time, color, line_style, line_width) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *''',
                    (
                        body_data.get('schedule_id', 1),
                        body_data.get('number'),
                        body_data.get('type'),
                        body_data.get('departure_station_id'),
                        body_data.get('arrival_station_id'),
                        body_data.get('departure_time'),
                        body_data.get('arrival_time'),
                        body_data.get('color'),
                        body_data.get('line_style', 'solid'),
                        body_data.get('line_width', 2.5)
                    )
                )
                conn.commit()
                train = cur.fetchone()
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(train), default=json_serial),
                    'isBase64Encoded': False
                }
            
            elif path == 'train_stops':
                train_id = body_data.get('train_id')
                station_id = body_data.get('station_id')
                arrival_time = body_data.get('arrival_time')
                departure_time = body_data.get('departure_time')
                
                cur.execute(
                    '''INSERT INTO train_stops (train_id, station_id, arrival_time, departure_time)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (train_id, station_id) 
                    DO UPDATE SET arrival_time = EXCLUDED.arrival_time, departure_time = EXCLUDED.departure_time
                    RETURNING *''',
                    (train_id, station_id, arrival_time, departure_time)
                )
                conn.commit()
                stop = cur.fetchone()
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(train), default=json_serial),
                    'isBase64Encoded': False
                }
        
        elif method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            item_id = body_data.get('id')
            
            if path == 'lines':
                cur.execute(
                    'UPDATE lines SET name = %s, color = %s WHERE id = %s RETURNING *',
                    (body_data.get('name'), body_data.get('color'), item_id)
                )
                conn.commit()
                line = cur.fetchone()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(line), default=json_serial),
                    'isBase64Encoded': False
                }
            
            elif path == 'stations':
                cur.execute(
                    'UPDATE stations SET name = %s, position = %s, distance_km = %s, line_id = %s WHERE id = %s RETURNING *',
                    (body_data.get('name'), body_data.get('position'), body_data.get('distance_km'), body_data.get('line_id'), item_id)
                )
                conn.commit()
                station = cur.fetchone()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(station), default=json_serial),
                    'isBase64Encoded': False
                }
            
            elif path == 'trains':
                cur.execute(
                    '''UPDATE trains SET 
                    number = %s, type = %s, departure_station_id = %s, 
                    arrival_station_id = %s, departure_time = %s, arrival_time = %s, color = %s,
                    line_style = %s, line_width = %s
                    WHERE id = %s RETURNING *''',
                    (
                        body_data.get('number'), body_data.get('type'),
                        body_data.get('departure_station_id'), body_data.get('arrival_station_id'),
                        body_data.get('departure_time'), body_data.get('arrival_time'),
                        body_data.get('color'),
                        body_data.get('line_style', 'solid'),
                        body_data.get('line_width', 2.5),
                        item_id
                    )
                )
                conn.commit()
                train = cur.fetchone()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(train), default=json_serial),
                    'isBase64Encoded': False
                }
            
            elif path == 'legend':
                cur.execute(
                    'UPDATE legend_items SET label = %s, color = %s, dashed = %s WHERE id = %s RETURNING *',
                    (body_data.get('label'), body_data.get('color'), body_data.get('dashed'), item_id)
                )
                conn.commit()
                item = cur.fetchone()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(item)),
                    'isBase64Encoded': False
                }
            
            elif path == 'train_stops':
                stop_id = body_data.get('id')
                cur.execute(
                    '''UPDATE train_stops SET 
                    arrival_time = %s, departure_time = %s 
                    WHERE id = %s RETURNING *''',
                    (body_data.get('arrival_time'), body_data.get('departure_time'), stop_id)
                )
                conn.commit()
                stop = cur.fetchone()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(stop), default=json_serial),
                    'isBase64Encoded': False
                }
        
        elif method == 'DELETE':
            item_id = query_params.get('id')
            
            if not item_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'ID is required'}),
                    'isBase64Encoded': False
                }
            
            if path == 'stations':
                # Сначала удаляем связанные остановки поездов
                cur.execute('DELETE FROM train_stops WHERE station_id = %s', (int(item_id),))
                # Затем удаляем поезда, которые отправляются или прибывают на эту станцию
                cur.execute('DELETE FROM trains WHERE departure_station_id = %s OR arrival_station_id = %s', (int(item_id), int(item_id)))
                # И наконец удаляем саму станцию
                cur.execute('DELETE FROM stations WHERE id = %s RETURNING id', (int(item_id),))
                deleted = cur.fetchone()
                conn.commit()
                if deleted:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'success': True, 'id': deleted['id']}),
                        'isBase64Encoded': False
                    }
                else:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Station not found'}),
                        'isBase64Encoded': False
                    }
            
            elif path == 'trains':
                cur.execute('DELETE FROM trains WHERE id = %s RETURNING id', (int(item_id),))
                deleted = cur.fetchone()
                conn.commit()
                if deleted:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'success': True, 'id': deleted['id']}),
                        'isBase64Encoded': False
                    }
                else:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Train not found'}),
                        'isBase64Encoded': False
                    }
            
            elif path == 'lines':
                cur.execute('DELETE FROM lines WHERE id = %s RETURNING id', (int(item_id),))
                deleted = cur.fetchone()
                conn.commit()
                if deleted:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'success': True, 'id': deleted['id']}),
                        'isBase64Encoded': False
                    }
                else:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Line not found'}),
                        'isBase64Encoded': False
                    }
            
            elif path == 'train_stops':
                cur.execute('DELETE FROM train_stops WHERE id = %s RETURNING id', (int(item_id),))
                deleted = cur.fetchone()
                conn.commit()
                if deleted:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'success': True, 'id': deleted['id']}),
                        'isBase64Encoded': False
                    }
                else:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Stop not found'}),
                        'isBase64Encoded': False
                    }
        
        if cur:
            cur.close()
        if conn:
            conn.close()
        
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Not found'}),
            'isBase64Encoded': False
        }
    
    except Exception as e:
        try:
            if 'cur' in locals() and cur:
                cur.close()
            if 'conn' in locals() and conn:
                conn.close()
        except:
            pass
        
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}, default=json_serial),
            'isBase64Encoded': False
        }
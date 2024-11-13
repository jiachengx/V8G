from flask import Blueprint, jsonify, render_template, request, current_app
from datetime import datetime
from app.models import queue_system
from app.config import ROOM_TYPES, ROOMS
# 在 routes.py 的開頭添加導入
from app.voice_utils import queue_announcement

import pandas as pd

bp = Blueprint('routes', __name__)

# Display Routes
@bp.route('/')
def index():
    """Main landing page"""
    return render_template('index.html')

@bp.route('/register')
def register_page():
    """Patient registration page"""
    return render_template('register.html')

@bp.route('/room/<room_id>')
def room_display(room_id):
    """Room display page"""
    if room_id not in ROOMS:
        return "Room not found", 404
    return render_template('room_display.html')

@bp.route('/room-op/<room_id>')
def room_operation(room_id):
    """Room operation panel"""
    if room_id not in ROOMS:
        return "Room not found", 404
    return render_template('room_operation.html')

@bp.route('/dashboard')
def dashboard():
    """Main dashboard page"""
    return render_template('dashboard.html')

@bp.route('/import')
def import_page():
    """Data import page"""
    return render_template('import.html')

# API Routes
@bp.route('/api/config/room-types')
def api_room_types():
    """Get room types configuration"""
    return jsonify(ROOM_TYPES)

@bp.route('/api/config/rooms')
def api_rooms():
    """Get rooms configuration"""
    return jsonify(ROOMS)

@bp.route('/api/config/room/<room_id>')
def api_room_config(room_id):
    """Get specific room configuration"""
    if room_id not in ROOMS:
        return jsonify({'error': 'Room not found'}), 404
    
    room = ROOMS[room_id]
    room_type = ROOM_TYPES[room['type']]
    
    return jsonify({
        'id': room_id,
        'name': room['name'],
        'type': room['type'],
        'type_name': room_type['en'],
        'color': room_type['color']
    })

@bp.route('/api/register', methods=['POST'])
def api_register():
    """Register a new patient"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        name = data.get('name')
        room_type = data.get('roomType')
        
        if not name or not room_type:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Validate room type
        if room_type not in ROOM_TYPES:
            return jsonify({'error': f'Invalid room type: {room_type}'}), 400
            
        # Add patient
        queue_number = queue_system.add_patient(name, room_type)
        
        return jsonify({
            'success': True,
            'queueNumber': queue_number
        })
            
    except Exception as e:
        current_app.logger.error(f"Registration error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# 修改叫號API
@bp.route('/api/call', methods=['POST'])
def api_call():
    """Call a patient to a room"""
    try:
        data = request.json
        queue_number = data.get('queueNumber')
        room_id = data.get('roomId')

        if not queue_number or not room_id:
            return jsonify({'error': 'Missing required fields'}), 400

        success = queue_system.call_patient(queue_number, room_id)

        if not success:
            return jsonify({'error': 'Patient not found or already called'}), 404

        # Queue voice announcement
        en_text, tl_text = queue_announcement(queue_number, room_id)

        return jsonify({
            'success': True,
            'announcements': {
                'en': en_text,
                'tl': tl_text
            }
        })

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Error calling patient: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/api/complete', methods=['POST'])
def api_complete():
    """Mark patient service as complete"""
    try:
        data = request.json
        queue_number = data.get('queueNumber')
        
        if not queue_number:
            return jsonify({'error': 'Queue number is required'}), 400
            
        success = queue_system.complete_service(queue_number)
        
        if not success:
            return jsonify({'error': 'Patient not found or not in called status'}), 404
            
        return jsonify({'success': True})
        
    except Exception as e:
        current_app.logger.error(f"Error completing service: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/api/queue/<room_id>')
def api_room_queue(room_id):
    """Get queue status for specific room"""
    try:
        if room_id not in ROOMS:
            return jsonify({'error': 'Room not found'}), 404
            
        queue_data = queue_system.get_room_queue(room_id)
        return jsonify(queue_data)
        
    except Exception as e:
        current_app.logger.error(f"Error getting room queue: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/api/dashboard-status')
def api_dashboard_status():
    """Get queue status for dashboard"""
    try:
        status = queue_system.get_room_type_status()
        return jsonify(status)
        
    except Exception as e:
        current_app.logger.error(f"Error getting dashboard status: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/api/recent-calls/<room_id>')
def api_recent_calls(room_id):
    """Get recent calls for a specific room"""
    try:
        if room_id not in ROOMS:
            return jsonify({'error': 'Room not found'}), 404
            
        recent_calls = queue_system.get_recent_room_calls(room_id)
        return jsonify(recent_calls)
        
    except Exception as e:
        current_app.logger.error(f"Error getting recent calls: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/api/import-batch', methods=['POST'])
def api_import_batch():
    """Import batch data"""
    try:
        data = request.get_json()
        if not data or 'data' not in data:
            return jsonify({
                'success': 0,
                'errors': ['No data provided']
            }), 400

        import_data = data['data']
        success_count = 0
        errors = []

        # Validate room types and rooms
        valid_room_types = set(ROOM_TYPES.keys())
        valid_rooms = set(ROOMS.keys())

        for i, row in enumerate(import_data):
            try:
                # Basic validation
                if not all(k in row for k in ['Name', 'Room Type', 'Room']):
                    raise ValueError('Missing required fields')

                if row['Room Type'] not in valid_room_types:
                    raise ValueError(f'Invalid room type: {row["Room Type"]}')

                if row['Room'] not in valid_rooms:
                    raise ValueError(f'Invalid room: {row["Room"]}')

                if ROOMS[row['Room']]['type'] != row['Room Type']:
                    raise ValueError(f'Room {row["Room"]} is not of type {row["Room Type"]}')

                # Add patient
                queue_system.add_patient(
                    name=row['Name'].strip(),
                    room_type=row['Room Type']
                )
                success_count += 1

            except Exception as e:
                errors.append(f'Row {i+2}: {str(e)}')

        return jsonify({
            'success': success_count,
            'errors': errors
        })

    except Exception as e:
        current_app.logger.error(f"Batch import error: {str(e)}")
        return jsonify({
            'success': 0,
            'errors': ['Internal server error']
        }), 500

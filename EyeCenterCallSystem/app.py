from flask import Flask, render_template, request, jsonify, send_file, Response
import pyttsx3
import pandas as pd
from datetime import datetime
import time
import os
import io
import threading
import queue

# Initialize queue data globally
queue_data = pd.DataFrame(columns=['Number', 'Name', 'Room', 'RoomCode', 'Status', 'Timestamp'])

# Create a queue for voice announcements
voice_queue = queue.Queue()


def create_app():
    app = Flask(__name__)

    # Set application configurations
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
    app.config['UPLOAD_FOLDER'] = 'uploads'

    # Create upload folder if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    return app


app = create_app()


# Initialize text-to-speech engine
def initialize_engine():
    engine = pyttsx3.init()
    engine.setProperty('rate', 150)  # Speed of speech
    engine.setProperty('volume', 0.9)  # Volume (0-1)

    voices = engine.getProperty('voices')
    engine.setProperty('voice', voices[0].id)  # Set English voice

    return engine


# Number pronunciation dictionaries
number_pronunciation = {
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
    '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine'
}

number_pronunciation_tl = {
    '0': 'sero', '1': 'isa', '2': 'dalawa', '3': 'tatlo', '4': 'apat',
    '5': 'lima', '6': 'anim', '7': 'pito', '8': 'walo', '9': 'siyam'
}

# Room types configuration
room_types = {
    'MC': {
        'en': 'Medical Clearance',
        'ph': 'Magpapa-Medical Clearance',
        'announce_en': 'Medical Clearance Area',
        'announce_tl': 'Magpapa-Medical Clearance'
    },
    'SP': {
        'en': 'Scheduled Patient',
        'ph': 'Bagong Pasyenteng Nakaschedule',
        'announce_en': 'Scheduled Patient Area',
        'announce_tl': 'Bagong Pasyenteng Nakaschedule'
    },
    'OP': {
        'en': 'Operation Schedule',
        'ph': 'Nakaschedule ng Operasyon',
        'announce_en': 'Operation Schedule Area',
        'announce_tl': 'Nakaschedule ng Operasyon'
    },
    'RQ': {
        'en': 'Requirements Processing',
        'ph': 'Magpapasa ng Requirements',
        'announce_en': 'Requirements Processing Area',
        'announce_tl': 'Magpapasa ng Requirements'
    },
    'WA': {
        'en': 'Walk-in Appointment',
        'ph': 'Pasyenteng Walang Appointment',
        'announce_en': 'Walk-in Patient Area',
        'announce_tl': 'Pasyenteng Walang Appointment'
    }
}


def format_number_pronunciation(number, language='en'):
    """Format number for clear pronunciation"""
    padded_num = f"{int(number):03d}"
    if language == 'en':
        return ' '.join(number_pronunciation[digit] for digit in padded_num)
    else:
        return ' '.join(number_pronunciation_tl[digit] for digit in padded_num)


def create_announcement_text(queue_num, room_code):
    """Create announcement text in both languages"""
    room = room_types[room_code]
    num_speech_en = format_number_pronunciation(queue_num, 'en')
    num_speech_tl = format_number_pronunciation(queue_num, 'tl')

    announcement_en = f"Number {num_speech_en}, please proceed to {room['announce_en']}"
    announcement_tl = f"Numero {num_speech_tl}, mangyaring pumunta po {room['announce_tl']}"

    return announcement_en, announcement_tl


def voice_worker():
    """Background worker for processing voice announcements"""
    engine = initialize_engine()
    while True:
        try:
            announcement = voice_queue.get()
            if announcement is None:
                break

            # Play English announcement
            engine.say(announcement['english'])
            engine.runAndWait()
            time.sleep(1)  # Pause between announcements

            # Play Tagalog announcement
            engine.say(announcement['tagalog'])
            engine.runAndWait()

            voice_queue.task_done()
        except Exception as e:
            print(f"Error in voice worker: {e}")
            continue


# Start voice worker thread
voice_thread = threading.Thread(target=voice_worker, daemon=True)
voice_thread.start()


def speak_announcement(queue_num, room_code):
    """Add announcement to voice queue"""
    announcement_en, announcement_tl = create_announcement_text(queue_num, room_code)
    voice_queue.put({
        'english': announcement_en,
        'tagalog': announcement_tl
    })
    return announcement_en, announcement_tl


@app.route('/')
def index():
    """Render main page"""
    return render_template('index.html', room_types=room_types)


@app.route('/api/register', methods=['POST'])
def register_patient():
    """Register a new patient"""
    global queue_data

    data = request.json
    name = data.get('name')
    room_code = data.get('roomCode')

    if not name or not room_code:
        return jsonify({'error': 'Missing required fields'}), 400

    queue_number = len(queue_data) + 1
    formatted_number = f"{queue_number:03d}"

    new_patient = pd.DataFrame({
        'Number': [formatted_number],
        'Name': [name],
        'Room': [room_types[room_code]['ph']],
        'RoomCode': [room_code],
        'Status': ['Waiting'],
        'Timestamp': [datetime.now().strftime("%H:%M:%S")]
    })

    queue_data = pd.concat([queue_data, new_patient], ignore_index=True)

    return jsonify({
        'success': True,
        'queueNumber': formatted_number,
        'patient': {
            'number': formatted_number,
            'name': name,
            'room': room_types[room_code]['ph'],
            'status': 'Waiting',
            'timestamp': datetime.now().strftime("%H:%M:%S")
        }
    })


@app.route('/api/queue', methods=['GET'])
def get_queue():
    """Get current queue data"""
    return jsonify(queue_data.sort_values('Number').to_dict('records'))


@app.route('/api/call', methods=['POST'])
def call_patient():
    """Call a patient"""
    global queue_data

    data = request.json
    queue_num = data.get('queueNumber')

    if not queue_num:
        return jsonify({'error': 'Queue number is required'}), 400

    patient = queue_data[queue_data['Number'] == queue_num]

    if len(patient) == 0:
        return jsonify({'error': 'Patient not found'}), 404

    queue_data.loc[queue_data['Number'] == queue_num, 'Status'] = 'Called'

    # Make voice announcement
    announcement_en, announcement_tl = speak_announcement(queue_num, patient.iloc[0]['RoomCode'])

    return jsonify({
        'success': True,
        'patient': patient.iloc[0].to_dict(),
        'announcements': {
            'english': announcement_en,
            'tagalog': announcement_tl
        }
    })


@app.route('/api/delete', methods=['POST'])
def delete_patient():
    """Delete a patient from queue"""
    global queue_data

    data = request.json
    queue_num = data.get('queueNumber')

    if not queue_num:
        return jsonify({'error': 'Queue number is required'}), 400

    queue_data = queue_data[queue_data['Number'] != queue_num]

    return jsonify({'success': True})


@app.route('/api/export-template')
def export_template():
    """Export CSV template"""
    template_data = pd.DataFrame({
        'Name': ['John Doe', 'Jane Doe'],
        'RoomCode': ['MC', 'SP']
    })

    output = io.StringIO()
    template_data.to_csv(output, index=False)

    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name='queue_template.csv'
    )


@app.route('/api/export-data')
def export_data():
    """Export current queue data"""
    output = io.StringIO()
    queue_data.to_csv(output, index=False)

    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name='queue_data.csv'
    )


@app.route('/api/import', methods=['POST'])
def import_data():
    """Import data from CSV"""
    global queue_data

    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        imported_data = pd.read_csv(file)

        required_columns = {'Name', 'RoomCode'}
        if not required_columns.issubset(imported_data.columns):
            return jsonify({'error': 'CSV file must contain Name and RoomCode columns'}), 400

        for _, row in imported_data.iterrows():
            if row['RoomCode'] not in room_types:
                continue

            queue_number = len(queue_data) + 1
            formatted_number = f"{queue_number:03d}"

            new_patient = pd.DataFrame({
                'Number': [formatted_number],
                'Name': [row['Name']],
                'Room': [room_types[row['RoomCode']]['ph']],
                'RoomCode': [row['RoomCode']],
                'Status': ['Waiting'],
                'Timestamp': [datetime.now().strftime("%H:%M:%S")]
            })

            queue_data = pd.concat([queue_data, new_patient], ignore_index=True)

        return jsonify({'success': True, 'importedCount': len(imported_data)})

    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/test-voice')
def test_voice():
    """Test voice system"""
    test_num = "001"
    test_code = "MC"
    announcement_en, announcement_tl = speak_announcement(test_num, test_code)

    return jsonify({
        'success': True,
        'announcements': {
            'english': announcement_en,
            'tagalog': announcement_tl
        }
    })


if __name__ == '__main__':
    app.run(debug=True)
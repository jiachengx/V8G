from gtts import gTTS
import tempfile
import os
from threading import Thread
from queue import Queue
import pygame
import time
from app.config import ROOM_TYPES, ROOMS

pygame.mixer.init()
voice_queue = Queue()

def format_number_for_speech(number):
    """Format the number for speech (e.g., 'MC001' becomes 'green 1')"""
    room_type = number[:2]
    num = str(int(number[2:]))  # Remove leading zeros
    color = ROOM_TYPES[room_type]['color_name']
    return f"{color} {num}"

def create_announcement(queue_number, room_id):
    """Create announcement text in English and Tagalog"""
    formatted_num = format_number_for_speech(queue_number)
    room_name = ROOMS[room_id]['name'].split('/')[0].strip()  # Get English name

    # English announcement
    en_text = f"{formatted_num}, please proceed to {room_name}"
    
    # Tagalog announcement
    # Convert color names to Tagalog
    color_tl = {
        'blue': 'asul',
        'green': 'berde',
        'orange': 'orange',
        'purple': 'lila',
        'red': 'pula'
    }
    color_en = formatted_num.split()[0]
    number = formatted_num.split()[1]
    tl_text = f"Numero {color_tl[color_en]} {number}, mangyaring pumunta sa {room_name}"

    return en_text, tl_text

def speak_announcement(text, lang='en'):
    """Create and play TTS announcement"""
    try:
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
        temp_filename = temp_file.name
        temp_file.close()

        # Create TTS and save to temp file
        tts = gTTS(text=text, lang=lang)
        tts.save(temp_filename)

        # Play the file
        pygame.mixer.music.load(temp_filename)
        pygame.mixer.music.play()
        while pygame.mixer.music.get_busy():
            time.sleep(0.1)

        # Clean up
        os.unlink(temp_filename)

    except Exception as e:
        print(f"Error in speech: {e}")

def voice_worker():
    """Background worker for processing voice announcements"""
    while True:
        announcement = voice_queue.get()
        if announcement is None:
            break

        # Play English announcement
        speak_announcement(announcement['en'], 'en')
        time.sleep(0.5)  # Short pause between announcements

        # Play Tagalog announcement
        speak_announcement(announcement['tl'], 'tl')

        voice_queue.task_done()

# Start voice worker thread
voice_thread = Thread(target=voice_worker, daemon=True)
voice_thread.start()

def queue_announcement(queue_number, room_id):
    """Queue an announcement to be spoken"""
    en_text, tl_text = create_announcement(queue_number, room_id)
    voice_queue.put({
        'en': en_text,
        'tl': tl_text
    })
    return en_text, tl_text

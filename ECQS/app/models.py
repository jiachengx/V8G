from datetime import datetime
import pandas as pd
from app.config import ROOMS, ROOM_TYPES

class QueueData:
    """Queue management system data model"""
    
    def __init__(self):
        # Main queue dataframe
        self.queue_df = pd.DataFrame(columns=[
            'Number',          # Queue number (format: MC001, SP001, etc.)
            'Name',           # Patient name
            'RoomType',       # Type of room needed (MC, SP, etc.)
            'Status',         # Status (Waiting, Called, Complete)
            'CallRoom',       # Room number where patient is called
            'CallTime',       # Time when patient was called
            'RegisterTime',   # Time when patient registered
            'CompleteTime'    # Time when service was completed
        ])
        
        # Keep track of last number for each room type
        self.last_numbers = {room_type: 0 for room_type in ROOM_TYPES.keys()}

    def generate_queue_number(self, room_type):
        """Generate a new queue number for given room type"""
        self.last_numbers[room_type] += 1
        return f"{room_type}{self.last_numbers[room_type]:03d}"

    def add_patient(self, name, room_type):
        """
        Add a new patient to the queue
        Returns: queue number
        """
        if room_type not in ROOM_TYPES:
            raise ValueError(f"Invalid room type: {room_type}")

        queue_number = self.generate_queue_number(room_type)
        
        new_patient = pd.DataFrame({
            'Number': [queue_number],
            'Name': [name],
            'RoomType': [room_type],
            'Status': ['Waiting'],
            'CallRoom': [None],
            'CallTime': [None],
            'RegisterTime': [datetime.now()],
            'CompleteTime': [None]
        })
        
        self.queue_df = pd.concat([self.queue_df, new_patient], ignore_index=True)
        return queue_number

    def call_patient(self, queue_number, room_id):
        """
        Call a patient to a specific room
        Returns: True if successful, False otherwise
        """
        if room_id not in ROOMS:
            raise ValueError(f"Invalid room ID: {room_id}")
            
        # Check if patient exists and is waiting
        patient_mask = (self.queue_df['Number'] == queue_number) & \
                      (self.queue_df['Status'].isin(['Waiting', 'Called']))
                      
        if not any(patient_mask):
            return False
            
        # Check if room type matches
        patient_room_type = self.queue_df.loc[patient_mask, 'RoomType'].iloc[0]
        if ROOMS[room_id]['type'] != patient_room_type:
            raise ValueError(f"Room type mismatch: {room_id} cannot serve {patient_room_type}")

        # Update patient status
        self.queue_df.loc[patient_mask, 'Status'] = 'Called'
        self.queue_df.loc[patient_mask, 'CallRoom'] = room_id
        self.queue_df.loc[patient_mask, 'CallTime'] = datetime.now()
        
        return True

    def complete_service(self, queue_number):
        """Mark a patient's service as complete"""
        mask = (self.queue_df['Number'] == queue_number) & \
               (self.queue_df['Status'] == 'Called')
               
        if any(mask):
            self.queue_df.loc[mask, 'Status'] = 'Complete'
            self.queue_df.loc[mask, 'CompleteTime'] = datetime.now()
            return True
        return False

    def get_room_queue(self, room_id):
        """
        Get queue information for a specific room
        Returns: dict with current and next patients
        """
        room_type = ROOMS[room_id]['type']
        
        # Get current patient in the room
        current_mask = (self.queue_df['Status'] == 'Called') & \
                      (self.queue_df['CallRoom'] == room_id)
        current = self.queue_df[current_mask].to_dict('records')[0] if any(current_mask) else None

        # Get next patients of same type
        waiting_mask = (self.queue_df['Status'] == 'Waiting') & \
                      (self.queue_df['RoomType'] == room_type)
        next_patients = self.queue_df[waiting_mask].head(3).to_dict('records')

        return {
            'current': current,
            'next': next_patients
        }

    def get_type_queue(self, room_type):
        """
        Get queue information for a room type
        Returns: list of waiting patients
        """
        mask = (self.queue_df['RoomType'] == room_type) & \
               (self.queue_df['Status'] == 'Waiting')
        return self.queue_df[mask].to_dict('records')

    def get_room_type_status(self):
        """
        Get queue status for all room types
        Returns: dict with status for each room type
        """
        status = {}
        
        for room_type in ROOM_TYPES:
            # Get rooms of this type
            type_rooms = [rid for rid, r in ROOMS.items() if r['type'] == room_type]
            
            rooms_status = []
            for room_id in type_rooms:
                queue_info = self.get_room_queue(room_id)
                rooms_status.append({
                    'room_id': room_id,
                    'room_name': ROOMS[room_id]['name'],
                    'current': queue_info['current']['Number'] if queue_info['current'] else None,
                    'next': [p['Number'] for p in queue_info['next']],
                    'waiting_count': len(queue_info['next'])
                })
                
            status[room_type] = {
                'rooms': rooms_status,
                'total_waiting': sum(r['waiting_count'] for r in rooms_status)
            }
            
        return status

    def clean_old_records(self, hours=24):
        """Remove completed records older than specified hours"""
        cutoff_time = datetime.now() - pd.Timedelta(hours=hours)
        complete_mask = (self.queue_df['Status'] == 'Complete') & \
                       (self.queue_df['CompleteTime'] < cutoff_time)
        self.queue_df = self.queue_df[~complete_mask]

    def get_recent_room_calls(self, room_id, limit=10):
        """Get recent calls for a specific room"""
        mask = (self.queue_df['CallRoom'] == room_id)
        recent = self.queue_df[mask].sort_values('CallTime', ascending=False).head(limit)
        return recent.to_dict('records')

# Global queue data instance
queue_system = QueueData()

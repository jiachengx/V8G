import unittest
from unittest.mock import Mock, patch
from app import create_app
from app.models import Patient, Room, Queue
from app.voice_utils import VoiceAnnouncement
import json
import pandas as pd
from datetime import datetime

class TestEyeQueueSystem(unittest.TestCase):
    def setUp(self):
        """Set up test environment before each test"""
        self.app = create_app('testing')
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        
        # Initialize test database
        db.create_all()
        
        # Create test room data
        self.test_rooms = {
            'R01': {'type': 'MC', 'name': 'Room 1'},
            'R02': {'type': 'SP', 'name': 'Room 2'},
            'R03': {'type': 'OP', 'name': 'Room 3'}
        }
        
        for room_id, data in self.test_rooms.items():
            room = Room(id=room_id, type=data['type'], name=data['name'])
            db.session.add(room)
        
        db.session.commit()

    def tearDown(self):
        """Clean up after each test"""
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_room_configuration(self):
        """Test room configuration and types"""
        response = self.client.get('/api/config/room-types')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Verify all room types exist
        self.assertIn('MC', data)
        self.assertIn('SP', data)
        self.assertIn('OP', data)
        self.assertIn('RQ', data)
        self.assertIn('WA', data)
        
        # Verify room type properties
        self.assertEqual(data['MC']['color_name'], 'blue')
        self.assertEqual(data['SP']['color_name'], 'green')

    def test_patient_registration(self):
        """Test patient registration process"""
        test_patient = {
            'name': 'John Doe',
            'priority_number': 'A001',
            'room_type': 'MC',
            'contact': '1234567890'
        }
        
        response = self.client.post('/api/register',
                                  data=json.dumps(test_patient),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['name'], test_patient['name'])
        self.assertEqual(data['priority_number'], test_patient['priority_number'])

    def test_queue_management(self):
        """Test queue operations (call, complete)"""
        # Register test patient
        patient = Patient(name='Jane Doe', priority_number='A002', room_type='SP')
        db.session.add(patient)
        db.session.commit()
        
        # Test calling patient
        call_data = {
            'room_id': 'R02',
            'patient_id': patient.id
        }
        
        response = self.client.post('/api/call',
                                  data=json.dumps(call_data),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        
        # Test completing service
        complete_data = {
            'room_id': 'R02',
            'patient_id': patient.id
        }
        
        response = self.client.post('/api/complete',
                                  data=json.dumps(complete_data),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 200)

    @patch('app.voice_utils.VoiceAnnouncement.announce')
    def test_voice_announcements(self, mock_announce):
        """Test voice announcement system"""
        # Test English announcement
        announcement = VoiceAnnouncement()
        announcement.announce('Priority number A003, please proceed to Room 1', 'en')
        mock_announce.assert_called_once()
        
        # Test Tagalog announcement
        mock_announce.reset_mock()
        announcement.announce('Pasyente numero A003, pumunta po sa Room 1', 'tl')
        mock_announce.assert_called_once()

    def test_data_import(self):
        """Test batch data import functionality"""
        # Create test DataFrame
        test_data = pd.DataFrame({
            'name': ['Test Patient 1', 'Test Patient 2'],
            'priority_number': ['B001', 'B002'],
            'room_type': ['MC', 'SP'],
            'contact': ['1111111111', '2222222222']
        })
        
        # Convert to Excel binary
        excel_binary = test_data.to_excel(index=False).getvalue()
        
        response = self.client.post('/api/import-batch',
                                  data={'file': (excel_binary, 'test_import.xlsx')},
                                  content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 200)
        
        # Verify imported data
        imported_patients = Patient.query.filter(
            Patient.priority_number.in_(['B001', 'B002'])
        ).all()
        self.assertEqual(len(imported_patients), 2)

    def test_dashboard_status(self):
        """Test dashboard status API"""
        response = self.client.get('/api/dashboard-status')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Verify dashboard data structure
        self.assertIn('rooms', data)
        self.assertIn('current_queue', data)
        self.assertIn('waiting_counts', data)

    def test_room_display(self):
        """Test room display functionality"""
        room_id = 'R01'
        response = self.client.get(f'/api/queue/{room_id}')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Verify room display data structure
        self.assertIn('current_patient', data)
        self.assertIn('queue', data)
        self.assertIn('recent_calls', data)

    def test_multilingual_support(self):
        """Test multilingual support"""
        # Test English response
        headers = {'Accept-Language': 'en'}
        response = self.client.get('/api/config/rooms', headers=headers)
        self.assertEqual(response.status_code, 200)
        
        # Test Tagalog response
        headers = {'Accept-Language': 'tl'}
        response = self.client.get('/api/config/rooms', headers=headers)
        self.assertEqual(response.status_code, 200)

if __name__ == '__main__':
    unittest.main()

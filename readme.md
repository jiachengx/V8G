# Eye Center Queue Management System

A bilingual (English/Tagalog) queue management system designed for eye centers in the Philippines. Features voice announcements, color-coded queues, and multiple room management.

## Features

- Bilingual support (English and Tagalog)
- Voice announcements in both languages
- Color-coded queue numbers
- Multi-room management
- Real-time dashboard
- Patient registration system
- Batch data import/export
- Room-specific displays
- Operation panels for staff

## Directory Structure

```
eye_queue/
│
├── app/
│   ├── __init__.py           # Flask app initialization
│   ├── config.py             # Configuration settings
│   ├── models.py             # Data models
│   ├── routes.py             # URL routes
│   ├── voice_utils.py        # Voice announcement utilities
│   │
│   ├── static/
│   │   └── js/
│   │       ├── dashboard.js      # Dashboard functionality
│   │       ├── import.js         # Data import functionality
│   │       ├── register.js       # Registration functionality
│   │       ├── room_display.js   # Room display functionality
│   │       └── room_operation.js # Room operation functionality
│   │
│   └── templates/
│       ├── dashboard.html        # Main dashboard view
│       ├── import.html          # Data import interface
│       ├── index.html           # Landing page
│       ├── register.html        # Patient registration
│       ├── room_display.html    # Room display screen
│       └── room_operation.html  # Room operation panel
│
└── run.py                   # Application entry point
```

## Prerequisites

- Python 3.8 or higher
- Required Python packages:
```bash
pip install flask pandas gTTS pygame
```

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd eye_queue
```

2. Create a virtual environment:
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Configuration

Edit `app/config.py` to set up:
- Room types and their colors
- Room assignments
- Language settings

```python
ROOM_TYPES = {
    'MC': {  # Medical Clearance
        'color': '#4299E1',
        'color_name': 'blue',
        ...
    },
    ...
}

ROOMS = {
    'R01': {'type': 'MC', 'name': 'Room 1 / Kwarto 1'},
    ...
}
```

## Running the Application

1. Start the server:
```bash
python run.py
```

2. Access different interfaces:
- Main Dashboard: `http://[YOUR_IP]:5000/dashboard`
- Patient Registration: `http://[YOUR_IP]:5000/register`
- Room Displays: `http://[YOUR_IP]:5000/room/R[XX]`
- Room Operations: `http://[YOUR_IP]:5000/room-op/R[XX]`
- Data Import: `http://[YOUR_IP]:5000/import`

## Usage Guide

### 1. Patient Registration
- Access registration page
- Enter patient name
- Select service type (color-coded)
- Receive queue number

### 2. Room Operations
- Call next patient
- Manual number call
- Complete service
- View waiting list
- Recall patients

### 3. Display Screens
- Place display screens outside each room
- Shows current and next numbers
- Automatically updates
- Visual and audio notifications

### 4. Dashboard
- Overview of all rooms
- Real-time queue status
- Color-coded by service type
- Waiting counts

### 5. Voice Announcements
System announces in both English and Tagalog:
```
English: "blue one, please proceed to Room 2"
Tagalog: "Numero asul isa, mangyaring pumunta sa Room 2"
```

## Room Types and Colors

| Code | Type | Color | English | Tagalog |
|------|------|-------|----------|----------|
| MC | Medical Clearance | Blue | Medical Clearance | Medikal na Clearance |
| SP | Scheduled Patient | Green | Scheduled Patient | Nakaiskedyul na Pasyente |
| OP | Operation Schedule | Orange | Operation Schedule | Iskedyul ng Operasyon |
| RQ | Requirements | Purple | Requirements Processing | Pagpoproseso ng Dokumento |
| WA | Walk-in | Red | Walk-in Appointment | Walk-in na Pasyente |

## Data Import/Export

### Import Format
Excel/CSV file with columns:
- Name
- Room Type
- Room Number

### Export Features
- Current queue status
- Daily reports
- Service statistics

## Troubleshooting

Common issues and solutions:

1. Voice not working:
```bash
# Check audio dependencies
pip install pygame gTTS

# Verify audio device
python -c "import pygame; pygame.mixer.init()"
```

2. Display not updating:
- Check network connection
- Verify room configuration
- Refresh browser page

3. Database errors:
- Check file permissions
- Verify data format
- Clear temporary files

## Development

To modify or extend the system:

1. Frontend changes:
- Edit files in `app/static/js/`
- Modify templates in `app/templates/`

2. Backend changes:
- Update routes in `routes.py`
- Modify data models in `models.py`

3. Configuration changes:
- Edit `config.py`

## Security Considerations

1. Network Security:
- Use in trusted network
- Implement access control
- Monitor system access

2. Data Protection:
- Regular backups
- Secure patient data
- Clean old records

## Support

For issues or questions:
1. Check troubleshooting guide
2. Review configuration
3. Contact system administrator

## License

[Your License Information]

## Authors

[Your Information]

## Acknowledgments

- Flask framework
- Tailwind CSS
- Google Text-to-Speech

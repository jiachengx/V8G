# 在 ROOM_TYPES 配置中添加顏色名稱
ROOM_TYPES = {
    'MC': {
        'en': 'Medical Clearance',
        'tl': 'Medikal na Clearance',
        'color': '#4299E1',
        'color_name': 'blue',
        'description_en': 'For patients needing medical clearance',
        'description_tl': 'Para sa mga pasyenteng nangangailangan ng medikal na clearance'
    },
    'SP': {
        'en': 'Scheduled Patient',
        'tl': 'Nakaiskedyul na Pasyente',
        'color': '#48BB78',
        'color_name': 'green',
        'description_en': 'For patients with scheduled appointments',
        'description_tl': 'Para sa mga pasyenteng may appointment'
    },
    'OP': {
        'en': 'Operation Schedule',
        'tl': 'Iskedyul ng Operasyon',
        'color': '#ED8936',
        'color_name': 'orange',
        'description_en': 'For scheduling surgical procedures',
        'description_tl': 'Para sa pag-iskedyul ng operasyon'
    },
    'RQ': {
        'en': 'Requirements Processing',
        'tl': 'Pagpoproseso ng Dokumento',
        'color': '#9F7AEA',
        'color_name': 'purple',
        'description_en': 'For document and requirements processing',
        'description_tl': 'Para sa pagpoproseso ng mga dokumento at requirements'
    },
    'WA': {
        'en': 'Walk-in Appointment',
        'tl': 'Walk-in na Pasyente',
        'color': '#F56565',
        'color_name': 'red',
        'description_en': 'For walk-in patients without appointment',
        'description_tl': 'Para sa mga pasyenteng walang appointment'
    }
}

# Room configurations
ROOMS = {
    'R01': {'type': 'MC', 'name': 'Room 1 / Kwarto 1'},
    'R02': {'type': 'MC', 'name': 'Room 2 / Kwarto 2'},
    'R03': {'type': 'SP', 'name': 'Room 3 / Kwarto 3'},
    'R04': {'type': 'SP', 'name': 'Room 4 / Kwarto 4'},
    'R05': {'type': 'OP', 'name': 'Room 5 / Kwarto 5'},
    'R06': {'type': 'OP', 'name': 'Room 6 / Kwarto 6'},
    'R07': {'type': 'RQ', 'name': 'Room 7 / Kwarto 7'},
    'R08': {'type': 'RQ', 'name': 'Room 8 / Kwarto 8'},
    'R09': {'type': 'WA', 'name': 'Room 9 / Kwarto 9'},
    'R10': {'type': 'WA', 'name': 'Room 10 / Kwarto 10'},
    'R11': {'type': 'WA', 'name': 'Room 11 / Kwarto 11'}
}

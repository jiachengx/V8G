let currentLang = 'en';
let selectedService = null;

async function loadServiceTypes() {
    try {
        const response = await axios.get('/api/config/room-types');
        const types = response.data;
        
        const container = document.getElementById('serviceTypes');
        container.innerHTML = Object.entries(types).map(([code, info]) => `
            <button type="button" 
                onclick="selectService('${code}')"
                id="service-${code}"
                class="service-btn p-4 rounded-lg border-2 text-left transition-colors"
                style="border-color: ${info.color}">
                <div class="font-medium" style="color: ${info.color}">
                    ${info[currentLang]}
                </div>
                <div class="text-sm text-gray-600 mt-1">
                    ${info['description_' + currentLang]}
                </div>
            </button>
        `).join('');

        if (selectedService) {
            document.getElementById(`service-${selectedService}`).classList.add('bg-gray-100');
        }
    } catch (error) {
        console.error('Error loading service types:', error);
        alert(currentLang === 'en' ? 
            'Failed to load service types. Please try again.' : 
            'Hindi ma-load ang mga serbisyo. Pakisubukang muli.');
    }
}

function selectService(code) {
    document.querySelectorAll('.service-btn').forEach(btn => {
        btn.classList.remove('bg-gray-100');
    });
    document.getElementById(`service-${code}`).classList.add('bg-gray-100');
    selectedService = code;
}

function setLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('.lang-en, .lang-tl').forEach(el => {
        el.style.display = 'none';
    });
    document.querySelectorAll(`.lang-${lang}`).forEach(el => {
        el.style.display = 'block';
    });

    // Update buttons
    document.getElementById('btnEn').className = 
        `px-4 py-2 rounded-md ${lang === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`;
    document.getElementById('btnTl').className = 
        `px-4 py-2 rounded-md ${lang === 'tl' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`;

    // Refresh service type buttons
    loadServiceTypes();
}

function showQueueNumber(number, serviceInfo) {
    const modal = document.getElementById('queueModal');
    const queueNumberEl = document.getElementById('queueNumber');
    const serviceTypeEl = document.getElementById('serviceType');

    queueNumberEl.textContent = number;
    queueNumberEl.style.color = serviceInfo.color;
    serviceTypeEl.textContent = serviceInfo[currentLang];

    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('queueModal').classList.add('hidden');
    document.getElementById('registrationForm').reset();
    selectedService = null;
    loadServiceTypes();
}

document.getElementById('registrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedService) {
        alert(currentLang === 'en' ? 
            'Please select a service type' : 
            'Mangyaring pumili ng uri ng serbisyo');
        return;
    }

    const name = document.getElementById('patientName').value;
    if (!name.trim()) {
        alert(currentLang === 'en' ? 
            'Please enter your name' : 
            'Mangyaring ilagay ang iyong pangalan');
        return;
    }

    try {
        const response = await axios.post('/api/register', {
            name: name.trim(),
            roomType: selectedService
        });
        
        if (response.data.success) {
            const typesResponse = await axios.get('/api/config/room-types');
            const types = typesResponse.data;
            showQueueNumber(response.data.queueNumber, types[selectedService]);
        } else {
            throw new Error(response.data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert(currentLang === 'en' ? 
            'Failed to register. Please try again.' : 
            'Hindi maiparehistro. Pakisubukang muli.');
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setLanguage('en');
});

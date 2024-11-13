let roomId = '';
let roomConfig = null;
let currentPatient = null;

async function initialize() {
    // Get room ID from URL
    roomId = window.location.pathname.split('/').pop();
    
    try {
        // Load room configuration
        const configResponse = await axios.get(`/api/config/room/${roomId}`);
        roomConfig = configResponse.data;
        
        // Update room information display
        document.getElementById('roomTitle').textContent = `Room ${roomId} Operations`;
        document.getElementById('roomType').textContent = roomConfig.type_name;
        document.getElementById('roomType').style.color = roomConfig.color;
        
        // Load room types for manual call
        const typesResponse = await axios.get('/api/config/room-types');
        const roomTypes = typesResponse.data;
        
        const roomTypeSelect = document.getElementById('roomTypeSelect');
        roomTypeSelect.innerHTML = Object.entries(roomTypes)
            .map(([code, info]) => `
                <option value="${code}" ${code === roomConfig.type ? 'selected' : ''}>
                    ${code}: ${info.en}
                </option>
            `).join('');
        
        // Initial data load
        await updateDisplay();
        
        // Set up auto-refresh
        setInterval(updateDisplay, 5000);
        
    } catch (error) {
        showNotification('Error initializing room operations: ' + error.message, 'error');
    }
}

async function updateDisplay() {
    try {
        // Get current queue status
        const response = await axios.get(`/api/queue/${roomId}`);
        const queueData = response.data;
        
        // Update current patient display
        updateCurrentPatient(queueData.current);
        
        // Update next in queue
        updateNextQueue(queueData.next);
        
        // Update history
        await updateHistory();
        
    } catch (error) {
        console.error('Error updating display:', error);
    }
}

function updateCurrentPatient(patient) {
    const numberEl = document.getElementById('currentNumber');
    const nameEl = document.getElementById('currentName');
    
    if (patient) {
        currentPatient = patient;
        numberEl.textContent = patient.Number;
        nameEl.textContent = patient.Name;
        numberEl.style.color = roomConfig.color;
    } else {
        currentPatient = null;
        numberEl.textContent = '---';
        nameEl.textContent = 'No patient';
        numberEl.style.color = 'gray';
    }
}

function updateNextQueue(patients) {
    const container = document.getElementById('nextQueue');
    
    if (patients && patients.length > 0) {
        container.innerHTML = patients.map(patient => `
            <button onclick="callSpecific('${patient.Number}')"
                class="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 text-center transition-colors">
                <div class="font-bold text-2xl">${patient.Number}</div>
                <div class="text-sm text-gray-600">${patient.Name}</div>
            </button>
        `).join('');
    } else {
        container.innerHTML = '<div class="col-span-2 text-center text-gray-500">No patients in queue</div>';
    }
}

async function updateHistory() {
    try {
        const response = await axios.get(`/api/recent-calls/${roomId}`);
        const history = response.data;
        
        const tbody = document.getElementById('historyTable');
        tbody.innerHTML = history.map(entry => `
            <tr class="border-t hover:bg-gray-50">
                <td class="py-2">${entry.Number}</td>
                <td class="py-2">${formatTime(entry.CallTime)}</td>
                <td class="py-2">${entry.Status}</td>
                <td class="py-2">
                    ${entry.Status === 'Called' ? `
                        <button onclick="callSpecific('${entry.Number}')"
                            class="text-blue-600 hover:text-blue-800 mr-2">
                            Recall
                        </button>
                        <button onclick="completeSpecific('${entry.Number}')"
                            class="text-green-600 hover:text-green-800">
                            Complete
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error updating history:', error);
    }
}

async function callNext() {
    try {
        const response = await axios.get(`/api/queue/${roomId}`);
        const queueData = response.data;
        
        if (queueData.next && queueData.next.length > 0) {
            await callSpecific(queueData.next[0].Number);
        } else {
            showNotification('No patients in queue');
        }
    } catch (error) {
        showNotification('Error calling next patient: ' + error.message, 'error');
    }
}

async function callSpecific(number) {
    try {
        await axios.post('/api/call', {
            queueNumber: number,
            roomId: roomId
        });
        
        await updateDisplay();
        showNotification(`Called number ${number}`);
        
    } catch (error) {
        showNotification('Error calling patient: ' + error.message, 'error');
    }
}

async function manualCall() {
    const roomType = document.getElementById('roomTypeSelect').value;
    const number = document.getElementById('manualNumber').value;
    
    if (!number) {
        showNotification('Please enter a queue number');
        return;
    }
    
    const formattedNumber = `${roomType}${number.padStart(3, '0')}`;
    
    try {
        await callSpecific(formattedNumber);
        document.getElementById('manualNumber').value = '';
    } catch (error) {
        showNotification('Error in manual call: ' + error.message, 'error');
    }
}

async function completeService() {
    if (!currentPatient) {
        showNotification('No current patient');
        return;
    }
    
    await completeSpecific(currentPatient.Number);
}

async function completeSpecific(number) {
    try {
        await axios.post('/api/complete', {
            queueNumber: number
        });
        
        await updateDisplay();
        showNotification(`Completed service for ${number}`);
        
    } catch (error) {
        showNotification('Error completing service: ' + error.message, 'error');
    }
}

function showNotification(message, type = 'info') {
    const modal = document.getElementById('notificationModal');
    const content = document.getElementById('notificationContent');
    
    content.innerHTML = `
        <div class="text-lg ${type === 'error' ? 'text-red-600' : 'text-gray-700'} font-medium">
            ${message}
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function closeNotification() {
    document.getElementById('notificationModal').classList.add('hidden');
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initialize);

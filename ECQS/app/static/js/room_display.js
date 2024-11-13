let roomId = '';
let roomConfig = null;
let currentQueueNumber = null;
let updateInterval = null;

async function initializeDisplay() {
    try {
        // Get room ID from URL
        roomId = window.location.pathname.split('/').pop();
        
        // Load room configuration
        const response = await axios.get(`/api/config/room/${roomId}`);
        roomConfig = response.data;
        
        // Update room information
        document.getElementById('roomName').textContent = roomConfig.name;
        document.getElementById('roomType').textContent = roomConfig.type_name;
        
        // Set theme color
        const numberDisplay = document.querySelector('#currentNumber');
        numberDisplay.style.setProperty('--theme-color', roomConfig.color);
        
        // Start updates
        await updateDisplay();
        startAutoUpdate();
        
    } catch (error) {
        console.error('Error initializing display:', error);
        document.getElementById('roomName').textContent = 'Error Loading Room Display';
    }
}

async function updateDisplay() {
    try {
        const response = await axios.get(`/api/queue/${roomId}`);
        const queueData = response.data;
        
        // Update current number
        updateCurrentDisplay(queueData.current);
        
        // Update next numbers
        updateNextDisplay(queueData.next);
        
    } catch (error) {
        console.error('Error updating display:', error);
    }
}

function updateCurrentDisplay(current) {
    const numberDisplay = document.getElementById('currentNumber');
    const nameDisplay = document.getElementById('currentName');
    
    if (current) {
        // Check if this is a new number
        if (currentQueueNumber !== current.Number) {
            // Animate and play sound for new number
            numberDisplay.classList.add('blink');
            playAlertSound();
            setTimeout(() => numberDisplay.classList.remove('blink'), 5000);
            currentQueueNumber = current.Number;
        }
        
        numberDisplay.textContent = current.Number;
        numberDisplay.style.color = roomConfig.color;
        nameDisplay.textContent = current.Name;
    } else {
        numberDisplay.textContent = '---';
        numberDisplay.style.color = '#666666';
        nameDisplay.textContent = '';
        currentQueueNumber = null;
    }
}

function updateNextDisplay(nextPatients) {
    const container = document.getElementById('nextNumbers');
    
    if (nextPatients && nextPatients.length > 0) {
        container.innerHTML = nextPatients.map(patient => `
            <div class="bg-gray-700 rounded-lg p-4 text-center">
                <div class="text-3xl font-bold text-gray-300">${patient.Number}</div>
                <div class="text-sm text-gray-400 mt-1">${patient.Name}</div>
            </div>
        `).join('');
    } else {
        container.innerHTML = `
            <div class="col-span-3 text-center text-gray-500 text-xl py-8">
                No patients waiting
            </div>
        `;
    }
}

function playAlertSound() {
    try {
        const audio = document.getElementById('alertSound');
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(error => {
                console.warn('Could not play alert sound:', error);
            });
        }
    } catch (error) {
        console.warn('Error playing alert sound:', error);
    }
}

function startAutoUpdate() {
    // Clear any existing interval
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    // Update every 5 seconds
    updateInterval = setInterval(updateDisplay, 5000);
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearInterval(updateInterval);
        } else {
            updateDisplay();
            startAutoUpdate();
        }
    });
}

// Handle cleanup when page is unloaded
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeDisplay);

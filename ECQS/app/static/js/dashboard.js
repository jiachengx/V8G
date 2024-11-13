let roomTypes = {};
let roomConfig = {};

async function loadConfigurations() {
    try {
        const [typesResponse, roomsResponse] = await Promise.all([
            axios.get('/api/config/room-types'),
            axios.get('/api/config/rooms')
        ]);
        
        roomTypes = typesResponse.data;
        roomConfig = roomsResponse.data;
        
        createDashboardLayout();
    } catch (error) {
        console.error('Failed to load configurations:', error);
    }
}

function createDashboardLayout() {
    const container = document.getElementById('roomTypeGroups');
    container.innerHTML = '';

    // Create group for each room type
    Object.entries(roomTypes).forEach(([typeCode, typeInfo]) => {
        const div = document.createElement('div');
        div.className = 'bg-gray-800 rounded-lg shadow-lg p-6';
        div.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-bold" style="color: ${typeInfo.color}">
                    ${typeInfo.en}
                </h2>
                <span class="text-gray-400 text-sm">
                    ${typeInfo.tl}
                </span>
            </div>
            <div id="type-${typeCode}" class="space-y-4">
                <!-- Room queues will be inserted here -->
            </div>
        `;
        container.appendChild(div);
    });

    // Start updating the dashboard
    updateDashboard();
}

async function updateDashboard() {
    try {
        const response = await axios.get('/api/dashboard-status');
        const status = response.data;

        Object.entries(status).forEach(([typeCode, typeStatus]) => {
            const container = document.getElementById(`type-${typeCode}`);
            const rooms = typeStatus.rooms || [];
            
            container.innerHTML = rooms.map(room => `
                <div class="bg-gray-700 rounded-lg p-4 transition-all duration-300 hover:bg-gray-600">
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="text-gray-300">${room.room_name}</span>
                            ${room.current ? 
                                `<div class="mt-1 text-sm text-gray-400">
                                    Current: <span class="text-white font-bold">${room.current}</span>
                                </div>` : 
                                '<div class="mt-1 text-sm text-gray-500">No active patient</div>'
                            }
                        </div>
                        <div class="text-right">
                            <div class="text-gray-400 text-sm">Waiting:</div>
                            <div class="text-xl font-bold text-white">${room.waiting_count || 0}</div>
                        </div>
                    </div>
                    ${room.next && room.next.length > 0 ? `
                        <div class="mt-2 pt-2 border-t border-gray-600">
                            <div class="text-sm text-gray-400">Next:</div>
                            <div class="flex flex-wrap gap-2 mt-1">
                                ${room.next.map(num => `
                                    <span class="px-2 py-1 bg-gray-800 rounded text-sm text-white">${num}</span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        });

    } catch (error) {
        console.error('Failed to update dashboard:', error);
    }
    
    // Update every 5 seconds
    setTimeout(updateDashboard, 5000);
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', loadConfigurations);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    // Clear any pending timeouts
    clearTimeout(updateDashboard);
});

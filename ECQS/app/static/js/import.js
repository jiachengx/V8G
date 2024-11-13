// Get room types configuration from server
async function getRoomConfig() {
    try {
        const [roomTypesResponse, roomsResponse] = await Promise.all([
            axios.get('/api/config/room-types'),
            axios.get('/api/config/rooms')
        ]);
        
        return {
            types: roomTypesResponse.data,
            rooms: roomsResponse.data
        };
    } catch (error) {
        console.error('Error fetching room configuration:', error);
        throw error;
    }
}

// Download template file
async function downloadTemplate() {
    try {
        // Get room configuration
        const config = await getRoomConfig();
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Create template data with examples
        const templateData = [
            // Header row with room types information
            {
                'Patient Name': 'EXAMPLE: John Santos',
                'Room Type': 'MC',
                'Room Number': 'R01',
                'Notes': 'Example data - please delete'
            },
            {
                'Patient Name': 'EXAMPLE: Maria Cruz',
                'Room Type': 'SP',
                'Room Number': 'R03',
                'Notes': 'Example data - please delete'
            }
        ];

        // Create the validation sheet data
        const validationData = [
            ['Valid Room Types:', 'Valid Rooms:'],
            ['Code', 'Description', 'Room', 'Type'],
            ...Object.entries(config.types).map(([code, info]) => 
                [code, info.en]
            ),
            ['', ''],
            ...Object.entries(config.rooms).map(([roomId, info]) => 
                ['', '', roomId, info.type]
            )
        ];
        
        // Create main template worksheet
        const ws = XLSX.utils.json_to_sheet(templateData);
        
        // Create validation worksheet
        const wsValidation = XLSX.utils.aoa_to_sheet(validationData);
        
        // Set column widths for template sheet
        ws['!cols'] = [
            { wch: 30 },  // Patient Name
            { wch: 15 },  // Room Type
            { wch: 15 },  // Room Number
            { wch: 40 }   // Notes
        ];
        
        // Set column widths for validation sheet
        wsValidation['!cols'] = [
            { wch: 15 },  // Code/Room
            { wch: 30 },  // Description/Type
            { wch: 15 },  // Additional columns
            { wch: 15 }
        ];
        
        // Add notes to first row
        const notes = {
            A1: { t: 's', v: 'Patient Name', h: 'Patient Name', w: 'Patient Name',
                c: [{ a: 'SheetJS', t: 'Enter patient\'s full name' }] },
            B1: { t: 's', v: 'Room Type', h: 'Room Type', w: 'Room Type',
                c: [{ a: 'SheetJS', t: 'Must be one of the valid room types from Validation sheet' }] },
            C1: { t: 's', v: 'Room Number', h: 'Room Number', w: 'Room Number',
                c: [{ a: 'SheetJS', t: 'Must be one of the valid rooms from Validation sheet' }] }
        };
        
        // Apply notes
        Object.keys(notes).forEach(key => {
            ws[key] = notes[key];
        });
        
        // Add worksheets to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.utils.book_append_sheet(wb, wsValidation, 'Validation');
        
        // Save file
        XLSX.writeFile(wb, 'queue_import_template.xlsx');
        
    } catch (error) {
        console.error('Error creating template:', error);
        alert('Failed to create template file. Please try again.');
    }
}

// Process file upload
async function handleFileUpload(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Get first sheet
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                
                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                // Transform data to match server expectations
                const transformedData = jsonData.map(row => ({
                    Name: row['Patient Name'],
                    'Room Type': row['Room Type'],
                    Room: row['Room Number']
                }));
                
                resolve(transformedData);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Validate imported data
function validateData(data) {
    const errors = [];
    const validRoomTypes = new Set(['MC', 'SP', 'OP', 'RQ', 'WA']);
    const validRooms = new Set(['R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08', 'R09', 'R10', 'R11']);
    
    data.forEach((row, index) => {
        const rowNum = index + 2; // Add 2 for Excel row number (1-based + header row)
        
        if (!row.Name || typeof row.Name !== 'string' || row.Name.trim().length === 0) {
            errors.push(`Row ${rowNum}: Invalid or missing patient name`);
        }
        
        if (!row['Room Type'] || !validRoomTypes.has(row['Room Type'])) {
            errors.push(`Row ${rowNum}: Invalid room type. Must be one of: ${Array.from(validRoomTypes).join(', ')}`);
        }
        
        if (!row.Room || !validRooms.has(row.Room)) {
            errors.push(`Row ${rowNum}: Invalid room number. Must be one of: ${Array.from(validRooms).join(', ')}`);
        }
    });
    
    return errors;
}

// Show preview of imported data
function showPreview(data) {
    const previewSection = document.getElementById('previewSection');
    const previewTable = document.getElementById('previewTable');
    
    previewTable.innerHTML = data.slice(0, 10).map(row => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">${row.Name}</td>
            <td class="px-6 py-4 whitespace-nowrap">${row['Room Type']}</td>
            <td class="px-6 py-4 whitespace-nowrap">${row.Room}</td>
            <td class="px-6 py-4 whitespace-nowrap">Pending</td>
        </tr>
    `).join('');
    
    if (data.length > 10) {
        previewTable.innerHTML += `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                    ... and ${data.length - 10} more rows
                </td>
            </tr>
        `;
    }
    
    previewSection.classList.remove('hidden');
}

// Show import results
function showResults(results) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsContent = document.getElementById('resultsContent');
    
    let html = `
        <div class="space-y-4">
            <div class="text-green-600 font-medium">
                Successfully imported: ${results.success} records
            </div>
    `;
    
    if (results.errors && results.errors.length > 0) {
        html += `
            <div class="text-red-600">
                <div class="font-medium mb-2">Errors occurred:</div>
                <ul class="list-disc pl-5 space-y-1">
                    ${results.errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    html += '</div>';
    
    resultsContent.innerHTML = html;
    resultsSection.classList.remove('hidden');
}

// Show/hide loading modal
function toggleLoading(show) {
    document.getElementById('loadingModal').classList.toggle('hidden', !show);
}

// Main import function
async function startImport() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file to import');
        return;
    }
    
    try {
        toggleLoading(true);
        
        // Read and process file
        const data = await handleFileUpload(file);
        
        // Validate data
        const validationErrors = validateData(data);
        if (validationErrors.length > 0) {
            showResults({
                success: 0,
                errors: validationErrors
            });
            return;
        }
        
        // Show preview
        showPreview(data);
        
        // Send to server
        const response = await axios.post('/api/import-batch', {
            data: data
        });
        
        // Show results
        showResults(response.data);
        
        // Clear file input
        fileInput.value = '';
        
    } catch (error) {
        console.error('Import error:', error);
        showResults({
            success: 0,
            errors: [error.response?.data?.error || 'Import failed']
        });
    } finally {
        toggleLoading(false);
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Add file input change handler
    document.getElementById('fileInput').addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file) {
            try {
                const data = await handleFileUpload(file);
                showPreview(data);
            } catch (error) {
                console.error('Error reading file:', error);
                alert('Error reading file. Please make sure you are using the correct template format.');
            }
        }
    });
});

// Phase 2: CSV Import and Bulk Actions
let csvData = [];
let selectedAuthorities = new Set();

// CSV Template Download
function downloadCSVTemplate() {
    const csv = 'phone,preset_key,scope_identifier,region\n+27123456789,school_principal,Duck Ponds High School,KZN\n+27987654321,community_leader,Ward 22,WC';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'authority_template.csv';
    a.click();
}

// Parse CSV
function parseCSV() {
    const fileInput = document.getElementById('csv-file-input');
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a CSV file');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        csvData = [];
        const errors = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row = {};
            headers.forEach((h, idx) => {
                row[h] = values[idx];
            });
            
            // Validate
            if (!row.phone || !row.phone.startsWith('+')) {
                errors.push({ row: i + 1, error: 'Invalid phone number' });
            } else if (!row.preset_key) {
                errors.push({ row: i + 1, error: 'Missing preset_key' });
            } else {
                csvData.push(row);
            }
        }
        
        // Show preview
        const preview = document.getElementById('csv-preview');
        preview.innerHTML = `
            <h4>Preview (${csvData.length} valid rows)</h4>
            ${errors.length > 0 ? `<div class="alert alert-warning">⚠️ ${errors.length} errors found</div>` : ''}
            <table class="data-table">
                <thead><tr><th>Phone</th><th>Role</th><th>Institution</th><th>Region</th></tr></thead>
                <tbody>
                    ${csvData.slice(0, 10).map(r => `
                        <tr>
                            <td>${r.phone}</td>
                            <td>${r.preset_key}</td>
                            <td>${r.scope_identifier}</td>
                            <td>${r.region || 'N/A'}</td>
                        </tr>
                    `).join('')}
                    ${csvData.length > 10 ? `<tr><td colspan="4">... and ${csvData.length - 10} more</td></tr>` : ''}
                </tbody>
            </table>
        `;
        
        document.getElementById('import-csv-btn').disabled = csvData.length === 0;
    };
    reader.readAsText(file);
}

// Import CSV
async function importCSV() {
    if (csvData.length === 0) return;
    
    const btn = document.getElementById('import-csv-btn');
    btn.disabled = true;
    btn.textContent = 'Importing...';
    
    const API_BASE = window.API_BASE_URL || window.location.origin;
    
    try {
        const response = await fetch(`${API_BASE}/admin/authority/bulk-import`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ authorities: csvData })
        });
        
        const result = await response.json();
        
        alert(`✅ Import complete!\nSuccess: ${result.success}\nFailed: ${result.failed}`);
        
        if (result.errors.length > 0) {
            console.error('Import errors:', result.errors);
        }
        
        closeModal('csv-import-modal');
        loadAuthoritySection();
    } catch (error) {
        alert('Import failed: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '📤 Import';
    }
}

// Toggle authority selection
function toggleAuthority(id, checkbox) {
    if (checkbox.checked) {
        selectedAuthorities.add(id);
    } else {
        selectedAuthorities.delete(id);
    }
    updateBulkToolbar();
}

// Select all authorities
function selectAllAuthorities(checkbox) {
    document.querySelectorAll('.authority-checkbox').forEach(cb => {
        cb.checked = checkbox.checked;
        toggleAuthority(cb.dataset.id, cb);
    });
}

// Update bulk toolbar
function updateBulkToolbar() {
    const toolbar = document.getElementById('bulk-actions-toolbar');
    const count = document.getElementById('selected-count');
    
    if (selectedAuthorities.size > 0) {
        toolbar.style.display = 'block';
        count.textContent = `${selectedAuthorities.size} selected`;
    } else {
        toolbar.style.display = 'none';
    }
}

// Clear selection
function clearSelection() {
    selectedAuthorities.clear();
    document.querySelectorAll('.authority-checkbox').forEach(cb => cb.checked = false);
    updateBulkToolbar();
}

// Bulk suspend
async function bulkSuspend() {
    if (!confirm(`Suspend ${selectedAuthorities.size} authorities?`)) return;
    
    const API_BASE = window.API_BASE_URL || window.location.origin;
    
    try {
        await fetch(`${API_BASE}/admin/authority/bulk-suspend`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: Array.from(selectedAuthorities) })
        });
        
        alert('✅ Authorities suspended');
        clearSelection();
        loadAuthoritySection();
    } catch (error) {
        alert('Failed: ' + error.message);
    }
}

// Bulk extend
async function bulkExtend() {
    const days = prompt('Extend by how many days?', '90');
    if (!days) return;
    
    const API_BASE = window.API_BASE_URL || window.location.origin;
    
    try {
        await fetch(`${API_BASE}/admin/authority/bulk-extend`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: Array.from(selectedAuthorities), days: parseInt(days) })
        });
        
        alert(`✅ Extended ${selectedAuthorities.size} authorities by ${days} days`);
        clearSelection();
        loadAuthoritySection();
    } catch (error) {
        alert('Failed: ' + error.message);
    }
}

// Bulk delete
async function bulkDelete() {
    if (!confirm(`⚠️ DELETE ${selectedAuthorities.size} authorities? This cannot be undone!`)) return;
    
    const API_BASE = window.API_BASE_URL || window.location.origin;
    
    try {
        await fetch(`${API_BASE}/admin/authority/bulk-delete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: Array.from(selectedAuthorities) })
        });
        
        alert('✅ Authorities deleted');
        clearSelection();
        loadAuthoritySection();
    } catch (error) {
        alert('Failed: ' + error.message);
    }
}

// Open CSV import modal
document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="import-csv"]')) {
        document.getElementById('csv-import-modal').style.display = 'flex';
    }
});

// Export functions
window.downloadCSVTemplate = downloadCSVTemplate;
window.parseCSV = parseCSV;
window.importCSV = importCSV;
window.toggleAuthority = toggleAuthority;
window.selectAllAuthorities = selectAllAuthorities;
window.clearSelection = clearSelection;
window.bulkSuspend = bulkSuspend;
window.bulkExtend = bulkExtend;
window.bulkDelete = bulkDelete;

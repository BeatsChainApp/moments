// Authority, Budget, and Analytics Section Loaders
// Use existing API_BASE_URL from window scope

// Authority Section
let selectedPreset = null;

async function loadAuthorityPresets() {
    const container = document.getElementById('role-presets');
    if (!container) {
        console.error('role-presets container not found');
        return;
    }
    
    console.log('Loading authority presets...');
    const API_BASE = window.API_BASE_URL || window.location.origin;
    
    try {
        const response = await fetch(`${API_BASE}/admin/authority/presets`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}` }
        });
        
        if (!response.ok) {
            console.error('Presets API failed:', response.status);
            throw new Error('Failed to load presets');
        }
        
        const { presets } = await response.json();
        console.log('Presets loaded:', Object.keys(presets));
        
        container.innerHTML = Object.entries(presets).map(([key, preset]) => `
            <div class="role-preset" data-preset-key="${key}" onclick="selectPreset('${key}', ${JSON.stringify(preset).replace(/"/g, '&quot;')})">
                <h4>${preset.icon} ${preset.name}</h4>
                <p>${preset.description}</p>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p class="error">Failed to load role presets</p>';
        console.error('Preset load error:', error);
    }
}

function selectPreset(key, preset) {
    selectedPreset = { key, ...preset };
    
    // Update UI
    document.querySelectorAll('.role-preset').forEach(el => el.classList.remove('selected'));
    document.querySelector(`[data-preset-key="${key}"]`).classList.add('selected');
    
    // Show preset info
    const infoDiv = document.getElementById('preset-info');
    const detailsList = document.getElementById('preset-details');
    
    infoDiv.style.display = 'block';
    detailsList.innerHTML = `
        <li>Broadcasting to up to ${preset.blast_radius.toLocaleString()} people</li>
        <li>${preset.approval_mode === 'auto' ? 'Auto-approved messages (no review needed)' : 'AI-reviewed messages'}</li>
        <li>${preset.icon} ${preset.name} badge</li>
        <li>${(preset.risk_threshold * 100).toFixed(0)}% content safety threshold</li>
        <li>Valid for ${preset.validity_days} days</li>
    `;
}

async function loadAuthoritySection() {
    const container = document.getElementById('authority-list');
    if (!container) return;
    
    const API_BASE = window.API_BASE_URL || window.location.origin;
    const statusFilter = document.getElementById('authority-status-filter')?.value || '';
    const searchQuery = document.getElementById('authority-search-box')?.value || '';
    
    try {
        container.innerHTML = '<div class="loading">Loading...</div>';
        
        let url = `${API_BASE}/admin/authority`;
        if (statusFilter || searchQuery) {
            url = `${API_BASE}/admin/authority/search?status=${statusFilter}&q=${searchQuery}`;
        }
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}` }
        });
        
        if (!response.ok) throw new Error('Failed to load');
        
        const { authority_profiles } = await response.json();
        
        if (!authority_profiles || authority_profiles.length === 0) {
            container.innerHTML = '<div class="card"><p style="text-align: center; padding: 2rem; color: #666;">No authorities found. Click "Assign Authority" to get started.</p></div>';
            return;
        }
        
        container.innerHTML = `
            <div class="card" style="overflow-x: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 40px;"><input type="checkbox" onchange="selectAllAuthorities(this)" aria-label="Select all"></th>
                            <th>Phone</th>
                            <th>Role</th>
                            <th>Institution</th>
                            <th>Region</th>
                            <th>Status</th>
                            <th>Expires</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${authority_profiles.map(a => {
                            const expiry = new Date(a.valid_until);
                            const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
                            let statusBadge, statusClass;
                            if (daysLeft < 0) {
                                statusBadge = 'Expired';
                                statusClass = 'badge-danger';
                            } else if (daysLeft < 7) {
                                statusBadge = 'Expiring';
                                statusClass = 'badge-warning';
                            } else {
                                statusBadge = 'Active';
                                statusClass = 'badge-success';
                            }
                            
                            return `
                            <tr style="cursor: pointer;" onclick="if(!event.target.type) viewAuthorityDetails('${a.id}')">
                                <td data-label="" onclick="event.stopPropagation()"><input type="checkbox" class="authority-checkbox" data-id="${a.id}" onchange="toggleAuthority('${a.id}', this)"></td>
                                <td data-label="Phone">${a.user_identifier}</td>
                                <td data-label="Role">${a.role_label || 'N/A'}</td>
                                <td data-label="Institution">${a.scope_identifier || 'N/A'}</td>
                                <td data-label="Region">${a.region || 'N/A'}</td>
                                <td data-label="Status"><span class="badge ${statusClass}">${statusBadge}</span></td>
                                <td data-label="Expires">${expiry.toLocaleDateString()} <small>(${daysLeft}d)</small></td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<div class="card"><p class="error">Failed to load authorities</p></div>';
        console.error(error);
    }
}

function viewAuthorityDetails(id) {
    const API_BASE = window.API_BASE_URL || window.location.origin;
    
    fetch(`${API_BASE}/admin/authority?id=${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}` }
    })
    .then(r => r.json())
    .then(data => {
        const auth = data.authority_profiles?.[0];
        if (!auth) return alert('Authority not found');
        
        const expiry = new Date(auth.valid_until);
        const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
        const statusText = daysLeft < 0 ? 'Expired' : daysLeft < 7 ? 'Expiring Soon' : 'Active';
        const statusColor = daysLeft < 0 ? '#dc2626' : daysLeft < 7 ? '#f59e0b' : '#10b981';
        
        document.getElementById('authority-detail-title').textContent = auth.role_label || 'Authority';
        document.getElementById('authority-detail-body').innerHTML = `
            <div style="display: grid; gap: 1rem;">
                <div>
                    <strong style="color: #6b7280;">Phone Number</strong>
                    <div style="font-size: 1.1rem;">${auth.user_identifier}</div>
                </div>
                <div>
                    <strong style="color: #6b7280;">Institution</strong>
                    <div>${auth.scope_identifier || 'N/A'}</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <strong style="color: #6b7280;">Region</strong>
                        <div>${auth.region || 'N/A'}</div>
                    </div>
                    <div>
                        <strong style="color: #6b7280;">Authority Level</strong>
                        <div>Level ${auth.authority_level}</div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <strong style="color: #6b7280;">Max Recipients</strong>
                        <div>${auth.blast_radius?.toLocaleString() || 'N/A'}</div>
                    </div>
                    <div>
                        <strong style="color: #6b7280;">Safety Threshold</strong>
                        <div>${auth.risk_threshold ? (auth.risk_threshold * 100).toFixed(0) + '%' : 'N/A'}</div>
                    </div>
                </div>
                <div>
                    <strong style="color: #6b7280;">Status</strong>
                    <div style="color: ${statusColor}; font-weight: 600;">${statusText} (${daysLeft} days)</div>
                </div>
                <div>
                    <strong style="color: #6b7280;">Valid Until</strong>
                    <div>${expiry.toLocaleDateString()} ${expiry.toLocaleTimeString()}</div>
                </div>
            </div>
        `;
        
        window.currentAuthorityId = id;
        window.currentAuthorityStatus = auth.status;
        
        const toggleBtn = document.getElementById('authority-toggle-btn');
        toggleBtn.textContent = auth.status === 'active' ? 'Suspend' : 'Activate';
        toggleBtn.className = auth.status === 'active' ? 'btn' : 'btn';
        
        document.getElementById('authority-detail-modal').style.display = 'flex';
    })
    .catch(err => {
        console.error('Failed to load authority:', err);
        alert('Failed to load authority details');
    });
}

function editAuthorityFromModal() {
    closeModal('authority-detail-modal');
    // TODO: Populate edit form with current authority data
    alert('Edit functionality coming soon');
}

function toggleAuthorityStatus() {
    const newStatus = window.currentAuthorityStatus === 'active' ? 'suspended' : 'active';
    const API_BASE = window.API_BASE_URL || window.location.origin;
    
    fetch(`${API_BASE}/admin/authority/${window.currentAuthorityId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
    })
    .then(() => {
        alert(`Authority ${newStatus === 'active' ? 'activated' : 'suspended'}`);
        closeModal('authority-detail-modal');
        if (window.loadAuthoritySection) window.loadAuthoritySection();
    })
    .catch(err => alert('Failed: ' + err.message));
}

function extendAuthorityModal() {
    const days = prompt('Extend by how many days?', '90');
    if (!days) return;
    
    const API_BASE = window.API_BASE_URL || window.location.origin;
    
    fetch(`${API_BASE}/admin/authority/bulk-extend`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: [window.currentAuthorityId], days: parseInt(days) })
    })
    .then(() => {
        alert(`Extended by ${days} days`);
        closeModal('authority-detail-modal');
        if (window.loadAuthoritySection) window.loadAuthoritySection();
    })
    .catch(err => alert('Failed: ' + err.message));
}

function deleteAuthorityModal() {
    if (!confirm('Delete this authority? This cannot be undone!')) return;
    
    const API_BASE = window.API_BASE_URL || window.location.origin;
    
    fetch(`${API_BASE}/admin/authority/${window.currentAuthorityId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}` }
    })
    .then(() => {
        alert('Authority deleted');
        closeModal('authority-detail-modal');
        if (window.loadAuthoritySection) window.loadAuthoritySection();
    })
    .catch(err => alert('Failed: ' + err.message));
}

async function saveAuthority(formData) {
    const API_BASE = window.API_BASE_URL || window.location.origin;
    const id = document.getElementById('authority-edit-id').value;
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/admin/authority/${id}` : `${API_BASE}/admin/authority`;
    
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error('Failed to save authority profile');
        
        window.dashboardCore.showNotification('Authority profile saved', 'success');
        window.dashboardCore.showSection('authority');
        loadAuthoritySection();
    } catch (error) {
        window.dashboardCore.handleError(error, 'saveAuthority');
    }
}

async function deleteAuthority(id) {
    if (!confirm('Delete this authority profile?')) return;
    
    const API_BASE = window.API_BASE_URL || window.location.origin;
    
    try {
        const response = await fetch(`${API_BASE}/admin/authority/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}` }
        });
        
        if (!response.ok) throw new Error('Failed to delete authority profile');
        
        window.dashboardCore.showNotification('Authority profile deleted', 'success');
        loadAuthoritySection();
    } catch (error) {
        window.dashboardCore.handleError(error, 'deleteAuthority');
    }
}

// Budget Section
async function loadBudgetSection() {
    const API_BASE = window.API_BASE_URL || window.location.origin;
    try {
        await Promise.all([
            loadBudgetOverview(),
            loadBudgetTransactions()
        ]);
    } catch (error) {
        window.dashboardCore.handleError(error, 'loadBudgetSection');
    }
}

async function loadBudgetOverview() {
    const container = document.getElementById('budget-overview');
    if (!container) return;
    
    const API_BASE = window.API_BASE_URL || window.location.origin;
    
    try {
        const response = await fetch(`${API_BASE}/admin/budget/overview`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}` }
        });
        
        if (!response.ok) throw new Error('Failed to load budget overview');
        
        const data = await response.json();
        
        // Safe number handling with defaults
        const totalBudget = parseFloat(data.total_budget) || 0;
        const spent = parseFloat(data.spent) || 0;
        const remaining = totalBudget - spent;
        const percentageUsed = totalBudget > 0 ? ((spent / totalBudget) * 100).toFixed(1) : '0.0';
        
        container.innerHTML = `
            <div class="budget-stats">
                <div class="stat-card">
                    <h3>Monthly Budget</h3>
                    <div class="stat-value">R${totalBudget.toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <h3>Spent</h3>
                    <div class="stat-value">R${spent.toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <h3>Remaining</h3>
                    <div class="stat-value">R${remaining.toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <h3>Usage</h3>
                    <div class="stat-value">${percentageUsed}%</div>
                </div>
            </div>
            <div class="budget-progress">
                <div class="progress-bar">
                    <div class="progress-fill ${parseFloat(percentageUsed) >= 80 ? 'warning' : ''}" 
                         style="width: ${Math.min(parseFloat(percentageUsed), 100)}%"></div>
                </div>
            </div>
            ${data.alerts && data.alerts.length > 0 ? `
                <div class="budget-alerts">
                    <h4>⚠️ Budget Alerts</h4>
                    ${data.alerts.map(alert => `
                        <div class="alert ${alert.severity}">
                            ${alert.message}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    } catch (error) {
        container.innerHTML = '<div class="error">Budget data unavailable</div>';
        console.error('Budget overview error:', error);
    }
}

async function loadBudgetTransactions() {
    const container = document.getElementById('budget-transactions-list');
    if (!container) return;
    
    const API_BASE = window.API_BASE_URL || window.location.origin;
    
    try {
        const response = await fetch(`${API_BASE}/admin/budget/transactions?limit=20`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}` }
        });
        
        if (!response.ok) throw new Error('Failed to load transactions');
        
        const { transactions } = await response.json();
        
        if (transactions.length === 0) {
            container.innerHTML = '<p class="empty-message">No transactions yet</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Type</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(t => `
                        <tr>
                            <td>${new Date(t.created_at).toLocaleDateString()}</td>
                            <td>${t.description || 'N/A'}</td>
                            <td><span class="badge ${t.transaction_type}">${t.transaction_type}</span></td>
                            <td class="${t.transaction_type === 'spend' ? 'negative' : 'positive'}">
                                ${t.transaction_type === 'spend' ? '-' : '+'}R${parseFloat(t.amount).toFixed(2)}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        window.dashboardCore.handleError(error, 'loadBudgetTransactions');
    }
}

// Analytics Section
async function loadAnalyticsSection() {
    const API_BASE = window.API_BASE_URL || window.location.origin;
    try {
        await loadHistoricalAnalytics(30);
    } catch (error) {
        window.dashboardCore.handleError(error, 'loadAnalyticsSection');
    }
}

async function loadHistoricalAnalytics(days = 30) {
    const container = document.getElementById('analytics-chart-container');
    if (!container) return;
    
    const API_BASE = window.API_BASE_URL || window.location.origin;
    
    try {
        window.dashboardCore.showSkeleton('analytics-chart-container', 'card', 1);
        
        const response = await fetch(`${API_BASE}/admin/analytics/historical?days=${days}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}` }
        });
        
        if (!response.ok) throw new Error('Failed to load analytics');
        
        const { data, summary } = await response.json();
        
        // Display summary stats
        container.innerHTML = `
            <div class="analytics-summary">
                <div class="stat-card">
                    <h4>Total Moments</h4>
                    <div class="stat-value">${summary.total_moments}</div>
                </div>
                <div class="stat-card">
                    <h4>Total Broadcasts</h4>
                    <div class="stat-value">${summary.total_broadcasts}</div>
                </div>
                <div class="stat-card">
                    <h4>Messages Delivered</h4>
                    <div class="stat-value">${summary.total_delivered}</div>
                </div>
            </div>
            <div class="chart-container">
                <canvas id="historicalChart"></canvas>
            </div>
        `;
        
        // Render chart if Chart.js is available
        if (typeof Chart !== 'undefined') {
            const ctx = document.getElementById('historicalChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(d => d.date),
                    datasets: [
                        {
                            label: 'Moments Created',
                            data: data.map(d => d.moments_created),
                            borderColor: '#4CAF50',
                            backgroundColor: 'rgba(76, 175, 80, 0.1)'
                        },
                        {
                            label: 'Broadcasts Sent',
                            data: data.map(d => d.broadcasts_sent),
                            borderColor: '#2196F3',
                            backgroundColor: 'rgba(33, 150, 243, 0.1)'
                        },
                        {
                            label: 'Messages Delivered',
                            data: data.map(d => d.messages_delivered),
                            borderColor: '#FF9800',
                            backgroundColor: 'rgba(255, 152, 0, 0.1)'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
    } catch (error) {
        window.dashboardCore.handleError(error, 'loadHistoricalAnalytics');
    }
}

// Navigation handler
document.addEventListener('DOMContentLoaded', () => {
    // Wire up navigation buttons
    document.querySelectorAll('.admin-nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            
            // Update active state
            document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show section
            window.dashboardCore.showSection(section);
            
            // Load section data
            if (section === 'authority') loadAuthoritySection();
            else if (section === 'budget-controls') loadBudgetSection();
            else if (section === 'dashboard') loadAnalyticsSection(); // Load analytics on dashboard
        });
    });
    
    // Wire up authority form
    const authorityForm = document.getElementById('authority-form');
    if (authorityForm) {
        authorityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!selectedPreset) {
                alert('Please select a role');
                return;
            }
            
            const phone = document.getElementById('authority-phone').value;
            const scopeId = document.getElementById('authority-scope-id').value;
            const region = document.getElementById('authority-region').value;
            
            const formData = {
                preset_key: selectedPreset.key,
                user_identifier: phone,
                role_label: selectedPreset.name,
                scope_identifier: scopeId,
                region: region || null
            };
            
            await saveAuthority(formData);
        });
    }
    
    // Load presets when create-authority is clicked
    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="create-authority"]')) {
            console.log('Create authority clicked');
            const formSection = document.getElementById('authority-form-section');
            if (formSection) {
                formSection.style.display = 'block';
                document.getElementById('authority')?.style.setProperty('display', 'none');
            }
            setTimeout(() => {
                console.log('Calling loadAuthorityPresets');
                loadAuthorityPresets();
            }, 200);
        }
        if (e.target.closest('[data-action="close-authority-form"]')) {
            document.getElementById('authority-form-section')?.style.setProperty('display', 'none');
            document.getElementById('authority')?.style.setProperty('display', 'block');
        }
    });
});

// Wire up filters
document.addEventListener('change', (e) => {
    if (e.target.id === 'authority-status-filter') {
        if (window.loadAuthoritySection) window.loadAuthoritySection();
    }
});

document.addEventListener('input', (e) => {
    if (e.target.id === 'authority-search-box') {
        clearTimeout(window.authoritySearchTimeout);
        window.authoritySearchTimeout = setTimeout(() => {
            if (window.loadAuthoritySection) window.loadAuthoritySection();
        }, 500);
    }
});

// Export functions
window.loadAuthoritySection = loadAuthoritySection;
window.loadAuthorityPresets = loadAuthorityPresets;
window.selectPreset = selectPreset;
window.viewAuthorityDetails = viewAuthorityDetails;
window.editAuthorityFromModal = editAuthorityFromModal;
window.toggleAuthorityStatus = toggleAuthorityStatus;
window.extendAuthorityModal = extendAuthorityModal;
window.deleteAuthorityModal = deleteAuthorityModal;
window.loadBudgetSection = loadBudgetSection;
window.loadAnalyticsSection = loadAnalyticsSection;

// Preview Functionality (Phase 1: Critical Fix)
async function previewMoment(momentId) {
    const API_BASE = window.API_BASE_URL || window.location.origin;
    try {
        const response = await fetch(`${API_BASE}/admin/moments/${momentId}/compose`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}` }
        });
        
        if (!response.ok) throw new Error('Failed to compose message');
        
        const { message } = await response.json();
        showPreviewModal('Moment Preview', message);
    } catch (error) {
        window.dashboardCore?.showNotification('Preview failed: ' + error.message, 'error');
    }
}

function showPreviewModal(title, content) {
    const modal = document.getElementById('preview-modal');
    if (!modal) {
        console.error('Preview modal not found');
        return;
    }
    
    document.getElementById('preview-title').textContent = title;
    document.getElementById('preview-content').innerHTML = content.replace(/\n/g, '<br>');
    modal.classList.add('active');
}

window.previewMoment = previewMoment;
window.showPreviewModal = showPreviewModal;

window.editAuthority = async (id) => {
    // Load authority data and populate form
    const response = await fetch(`${API_BASE}/admin/authority?id=${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}` }
    });
    const { profiles } = await response.json();
    const profile = profiles[0];
    
    document.getElementById('authority-edit-id').value = profile.id;
    document.getElementById('authority-user-identifier').value = profile.user_identifier;
    document.getElementById('authority-role-label').value = profile.role_label;
    document.getElementById('authority-level').value = profile.authority_level;
    document.getElementById('authority-scope').value = profile.scope;
    document.getElementById('authority-scope-identifier').value = profile.scope_identifier || '';
    document.getElementById('authority-approval-mode').value = profile.approval_mode;
    document.getElementById('authority-blast-radius').value = profile.blast_radius;
    document.getElementById('authority-risk-threshold').value = profile.risk_threshold;
    document.getElementById('authority-valid-until').value = profile.valid_until || '';
    
    document.getElementById('authority-form-title').textContent = 'Edit Authority';
    document.getElementById('authority-submit-btn').textContent = 'Update Authority';
    window.dashboardCore.showSection('authority-form-section');
};
window.deleteAuthority = deleteAuthority;

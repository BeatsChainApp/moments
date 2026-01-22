// Authority, Budget, and Analytics Section Loaders

const API_BASE = window.API_BASE_URL || window.location.origin;

// Authority Section
async function loadAuthoritySection() {
    const container = document.getElementById('authority-profiles-list');
    if (!container) return;
    
    try {
        window.dashboardCore.showSkeleton('authority-profiles-list', 'list', 5);
        
        const response = await fetch(`${API_BASE}/admin/authority`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        });
        
        if (!response.ok) throw new Error('Failed to load authority profiles');
        
        const { profiles, total } = await response.json();
        
        if (profiles.length === 0) {
            window.dashboardCore.showEmptyState('authority-profiles-list', {
                icon: '🔐',
                title: 'No Authority Profiles',
                message: 'Assign authority levels to users for content moderation.',
                action: { label: 'Assign Authority', handler: 'handleAction("create-authority")' }
            });
            return;
        }
        
        container.innerHTML = profiles.map(profile => `
            <div class="authority-profile-item">
                <div class="profile-header">
                    <strong>${profile.role_label}</strong>
                    <span class="badge ${profile.status}">${profile.status}</span>
                </div>
                <div class="profile-details">
                    <span>User: ${profile.user_identifier}</span>
                    <span>Level: ${profile.authority_level}</span>
                    <span>Scope: ${profile.scope}</span>
                </div>
                <div class="profile-actions">
                    <button class="btn-small" onclick="editAuthority('${profile.id}')">Edit</button>
                    <button class="btn-small danger" onclick="deleteAuthority('${profile.id}')">Delete</button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        window.dashboardCore.handleError(error, 'loadAuthoritySection');
    }
}

async function saveAuthority(formData) {
    const id = document.getElementById('authority-edit-id').value;
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/admin/authority/${id}` : `${API_BASE}/admin/authority`;
    
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
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
    
    try {
        const response = await fetch(`${API_BASE}/admin/authority/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
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
    
    try {
        const response = await fetch(`${API_BASE}/admin/budget/overview`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        });
        
        if (!response.ok) throw new Error('Failed to load budget overview');
        
        const data = await response.json();
        
        container.innerHTML = `
            <div class="budget-stats">
                <div class="stat-card">
                    <h3>Monthly Budget</h3>
                    <div class="stat-value">R${data.total_budget.toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <h3>Spent</h3>
                    <div class="stat-value">R${data.spent.toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <h3>Remaining</h3>
                    <div class="stat-value">R${data.remaining.toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <h3>Usage</h3>
                    <div class="stat-value">${data.percentage_used.toFixed(1)}%</div>
                </div>
            </div>
            <div class="budget-progress">
                <div class="progress-bar">
                    <div class="progress-fill ${data.percentage_used >= 80 ? 'warning' : ''}" 
                         style="width: ${Math.min(data.percentage_used, 100)}%"></div>
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
        window.dashboardCore.handleError(error, 'loadBudgetOverview');
    }
}

async function loadBudgetTransactions() {
    const container = document.getElementById('budget-transactions-list');
    if (!container) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/budget/transactions?limit=20`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
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
    try {
        await loadHistoricalAnalytics(30);
    } catch (error) {
        window.dashboardCore.handleError(error, 'loadAnalyticsSection');
    }
}

async function loadHistoricalAnalytics(days = 30) {
    const container = document.getElementById('analytics-chart-container');
    if (!container) return;
    
    try {
        window.dashboardCore.showSkeleton('analytics-chart-container', 'card', 1);
        
        const response = await fetch(`${API_BASE}/admin/analytics/historical?days=${days}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
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
            const formData = {
                user_identifier: document.getElementById('authority-user-identifier').value,
                role_label: document.getElementById('authority-role-label').value,
                authority_level: document.getElementById('authority-level').value,
                scope: document.getElementById('authority-scope').value,
                scope_identifier: document.getElementById('authority-scope-identifier').value,
                approval_mode: document.getElementById('authority-approval-mode').value,
                blast_radius: document.getElementById('authority-blast-radius').value,
                risk_threshold: document.getElementById('authority-risk-threshold').value,
                valid_until: document.getElementById('authority-valid-until').value
            };
            await saveAuthority(formData);
        });
    }
});

// Export functions
window.loadAuthoritySection = loadAuthoritySection;
window.loadBudgetSection = loadBudgetSection;
window.loadAnalyticsSection = loadAnalyticsSection;
window.editAuthority = async (id) => {
    // Load authority data and populate form
    const response = await fetch(`${API_BASE}/admin/authority?id=${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
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

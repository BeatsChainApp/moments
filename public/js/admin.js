// Direct API calls without Supabase library
const API_BASE = '/admin';

// Get auth token from localStorage
function getAuthToken() {
    return localStorage.getItem('admin.auth.token');
}

// API fetch with auth
async function apiFetch(path, opts = {}) {
    opts.headers = opts.headers || {};
    const token = getAuthToken();
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const response = await fetch(url, opts);
    
    // Handle auth errors gracefully
    if (response.status === 401) {
        console.warn('Authentication failed, clearing tokens');
        localStorage.removeItem('admin.auth.token');
        localStorage.removeItem('admin.user.info');
        throw new Error('Authentication expired');
    }
    
    return response;
}

let currentPage = 1;
let allMoments = [];
let filteredMoments = [];
let confirmCallback = null;

// Load analytics
async function loadAnalytics() {
    try {
        const response = await apiFetch('/analytics');
        const data = await response.json();
        
        document.getElementById('analytics').innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${data.totalMoments || 0}</div>
                <div class="stat-label">Total Moments</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.communityMoments || 0}</div>
                <div class="stat-label">Community Reports</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.adminMoments || 0}</div>
                <div class="stat-label">Official Updates</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.activeSubscribers || 0}</div>
                <div class="stat-label">Active Subscribers</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.totalBroadcasts || 0}</div>
                <div class="stat-label">Broadcasts Sent</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.successRate || 0}%</div>
                <div class="stat-label">Success Rate</div>
            </div>
        `;
    } catch (error) {
        console.error('Analytics load error:', error);
        if (error.message === 'Authentication expired') {
            document.getElementById('analytics').innerHTML = '<div class="error">Session expired. Please <a href="/login">login again</a>.</div>';
        } else {
            document.getElementById('analytics').innerHTML = '<div class="error">Failed to load analytics</div>';
        }
    }
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const response = await apiFetch('/moments?limit=5');
        const data = await response.json();
        
        const recentActivityEl = document.getElementById('recent-activity');
        if (!recentActivityEl) return;
        
        if (data.moments && data.moments.length > 0) {
            const html = data.moments.map(moment => `
                <div style="padding: 0.75rem; border-left: 3px solid #2563eb; margin-bottom: 0.5rem; background: #f8fafc;">
                    <div style="font-weight: 500; margin-bottom: 0.25rem;">${moment.title}</div>
                    <div style="font-size: 0.75rem; color: #6b7280;">
                        ${moment.region} • ${moment.category} • ${new Date(moment.created_at).toLocaleDateString()}
                    </div>
                </div>
            `).join('');
            recentActivityEl.innerHTML = html;
        } else {
            recentActivityEl.innerHTML = '<div class="empty-state">No recent activity</div>';
        }
    } catch (error) {
        console.error('Recent activity load error:', error);
        const recentActivityEl = document.getElementById('recent-activity');
        if (recentActivityEl) {
            if (error.message === 'Authentication expired') {
                recentActivityEl.innerHTML = '<div class="error">Session expired. Please <a href="/login">login again</a>.</div>';
            } else {
                recentActivityEl.innerHTML = '<div class="error">Failed to load recent activity</div>';
            }
        }
    }
}

// Load sponsors
async function loadSponsors() {
    try {
        const response = await apiFetch('/sponsors');
        const data = await response.json();
        
        const sponsorSelect = document.getElementById('sponsor-select');
        if (sponsorSelect) {
            sponsorSelect.innerHTML = '<option value="">No Sponsor</option>' + 
                (data.sponsors || []).map(s => `<option value="${s.id}">${s.display_name}</option>`).join('');
        }
        
        const sponsorsList = document.getElementById('sponsors-list');
        if (sponsorsList) {
            if (data.sponsors && data.sponsors.length > 0) {
                const html = data.sponsors.map(sponsor => `
                    <div class="moment-item">
                        <div class="moment-header">
                            <div class="moment-info">
                                <div class="moment-title">${sponsor.display_name}</div>
                                <div class="moment-meta">${sponsor.name} • ${sponsor.contact_email || 'No email'}</div>
                            </div>
                            <div class="moment-actions">
                                <button class="btn btn-sm" data-action="edit-sponsor" data-id="${sponsor.id}">Edit</button>
                                <button class="btn btn-sm btn-danger" data-action="delete-sponsor" data-id="${sponsor.id}">Delete</button>
                            </div>
                        </div>
                        ${sponsor.website_url ? `<div style="font-size: 0.875rem; color: #2563eb;"><a href="${sponsor.website_url}" target="_blank">${sponsor.website_url}</a></div>` : ''}
                    </div>
                `).join('');
                sponsorsList.innerHTML = html;
            } else {
                sponsorsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🏢</div>
                        <div>No sponsors found</div>
                        <button class="btn" data-action="new-sponsor" style="margin-top: 1rem;">Add First Sponsor</button>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Sponsors load error:', error);
        const sponsorsList = document.getElementById('sponsors-list');
        if (sponsorsList) {
            if (error.message === 'Authentication expired') {
                sponsorsList.innerHTML = '<div class="error">Session expired. Please <a href="/login">login again</a>.</div>';
            } else {
                sponsorsList.innerHTML = '<div class="error">Failed to load sponsors</div>';
            }
        }
    }
}

// Load system settings
async function loadSettings() {
    try {
        const response = await apiFetch('/settings');
        const data = await response.json();
        
        const settingsList = document.getElementById('settings-list');
        if (settingsList) {
            if (data.settings && data.settings.length > 0) {
                const html = data.settings.map(setting => `
                    <div class="moment-item">
                        <div class="moment-header">
                            <div class="moment-info">
                                <div class="moment-title">${setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                                <div class="moment-meta">${setting.description || 'No description'}</div>
                            </div>
                            <div class="moment-actions">
                                <button class="btn btn-sm" data-action="edit-setting" data-key="${setting.setting_key}" data-value="${setting.setting_value}" data-type="${setting.setting_type}">Edit</button>
                            </div>
                        </div>
                        <div class="moment-content">
                            ${setting.setting_type === 'url' && setting.setting_value.includes('.png') ? 
                                `<img src="${setting.setting_value}" alt="${setting.setting_key}" style="max-width: 100px; height: auto; border-radius: 4px;">` : 
                                setting.setting_value
                            }
                        </div>
                    </div>
                `).join('');
                settingsList.innerHTML = html;
            } else {
                settingsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">⚙️</div>
                        <div>No settings found</div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Settings load error:', error);
        const settingsList = document.getElementById('settings-list');
        if (settingsList) {
            settingsList.innerHTML = '<div class="error">Failed to load settings</div>';
        }
    }
}

// Navigation
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    
    const navButton = document.querySelector(`[data-section="${sectionId}"]`);
    if (navButton) navButton.classList.add('active');
    
    switch(sectionId) {
        case 'dashboard': loadAnalytics(); loadRecentActivity(); break;
        case 'sponsors': loadSponsors(); break;
        case 'settings': loadSettings(); break;
    }
}

// Event delegation
document.addEventListener('click', (e) => {
    const action = e.target.getAttribute('data-action');
    const section = e.target.getAttribute('data-section');
    
    if (section) {
        showSection(section);
    }
});

// Notification functions
function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `${type} notification`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1001;
        padding: 1rem;
        border-radius: 0.5rem;
        font-weight: 500;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
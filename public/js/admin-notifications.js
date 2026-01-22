// Admin Notifications Management
(function() {
  'use strict';

  let currentPage = 1;
  const limit = 20;

  // Load notifications
  async function loadNotifications() {
    const container = document.getElementById('notifications-list');
    if (!container) return;

    container.innerHTML = '<div class="loading">Loading notifications...</div>';

    try {
      const typeFilter = document.getElementById('notification-type-filter')?.value || '';
      const statusFilter = document.getElementById('notification-status-filter')?.value || '';

      const response = await fetch(`${window.API_BASE_URL}/api/notifications/history?page=${currentPage}&limit=${limit}&type=${typeFilter}&status=${statusFilter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load notifications');

      const data = await response.json();
      renderNotifications(data.notifications || []);
      renderPagination(data.total || 0);
    } catch (error) {
      console.error('Load notifications error:', error);
      container.innerHTML = '<div class="error">Failed to load notifications</div>';
    }
  }

  // Render notifications list
  function renderNotifications(notifications) {
    const container = document.getElementById('notifications-list');
    if (!container) return;

    if (notifications.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔔</div><p>No notifications found</p></div>';
      return;
    }

    const html = notifications.map(notif => {
      const statusClass = notif.status === 'sent' ? 'status-active' : notif.status === 'failed' ? 'status-suspended' : 'status-draft';
      const priorityBadge = getPriorityBadge(notif.priority_level);
      const timestamp = new Date(notif.created_at).toLocaleString();

      return `
        <div class="moment-item">
          <div class="moment-header">
            <div class="moment-info">
              <div class="moment-title">${notif.type_display_name || notif.notification_type}</div>
              <div class="moment-meta">
                <span class="status-badge ${statusClass}">${notif.status}</span>
                ${priorityBadge}
                <span>📱 ${maskPhone(notif.recipient_phone)}</span>
                <span>🕐 ${timestamp}</span>
              </div>
            </div>
          </div>
          ${notif.message_preview ? `<div class="moment-content">${notif.message_preview.substring(0, 150)}...</div>` : ''}
          ${notif.error_message ? `<div class="error" style="margin-top: 0.5rem; font-size: 0.875rem;">Error: ${notif.error_message}</div>` : ''}
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  // Get priority badge
  function getPriorityBadge(level) {
    const badges = {
      1: '<span class="status-badge" style="background: #f3f4f6; color: #6b7280;">P1</span>',
      2: '<span class="status-badge" style="background: #dbeafe; color: #1e40af;">P2</span>',
      3: '<span class="status-badge" style="background: #fef3c7; color: #92400e;">P3</span>',
      4: '<span class="status-badge" style="background: #fed7aa; color: #c2410c;">P4</span>',
      5: '<span class="status-badge" style="background: #fecaca; color: #991b1b;">P5</span>'
    };
    return badges[level] || badges[1];
  }

  // Mask phone number
  function maskPhone(phone) {
    if (!phone) return 'Unknown';
    return phone.substring(0, 4) + '***' + phone.substring(phone.length - 3);
  }

  // Render pagination
  function renderPagination(total) {
    const container = document.getElementById('notifications-pagination');
    if (!container) return;

    const totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = '';
    for (let i = 1; i <= Math.min(totalPages, 10); i++) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    container.innerHTML = html;

    container.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page);
        loadNotifications();
      });
    });
  }

  // Load notification analytics
  async function loadNotificationAnalytics() {
    const container = document.getElementById('notification-analytics');
    if (!container) return;

    try {
      const response = await fetch(`${window.API_BASE_URL}/api/notifications/analytics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load analytics');

      const data = await response.json();
      renderAnalytics(data);
    } catch (error) {
      console.error('Load analytics error:', error);
      container.innerHTML = '<div class="error">Failed to load analytics</div>';
    }
  }

  // Render analytics
  function renderAnalytics(data) {
    const container = document.getElementById('notification-analytics');
    if (!container) return;

    const html = `
      <div class="stat-card">
        <div class="stat-number">${data.total_sent || 0}</div>
        <div class="stat-label">Total Sent</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${data.total_failed || 0}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${data.success_rate || 0}%</div>
        <div class="stat-label">Success Rate</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${data.total_pending || 0}</div>
        <div class="stat-label">Pending</div>
      </div>
    `;

    container.innerHTML = html;
  }

  // Initialize
  function init() {
    // Load on section activation
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-section="notifications"]')) {
        setTimeout(() => {
          loadNotifications();
          loadNotificationAnalytics();
        }, 100);
      }
    });

    // Filter change handlers
    const typeFilter = document.getElementById('notification-type-filter');
    const statusFilter = document.getElementById('notification-status-filter');

    if (typeFilter) {
      typeFilter.addEventListener('change', () => {
        currentPage = 1;
        loadNotifications();
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        currentPage = 1;
        loadNotifications();
      });
    }
  }

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for global access
  window.adminNotifications = {
    load: loadNotifications,
    loadAnalytics: loadNotificationAnalytics
  };
})();

// Export Functionality - CSV Downloads

const exportData = {
    // Convert array of objects to CSV
    toCSV(data, filename) {
        if (!data || data.length === 0) {
            window.dashboardCore.showNotification('No data to export', 'error');
            return;
        }
        
        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => {
                const val = row[h] || '';
                return `"${String(val).replace(/"/g, '""')}"`;
            }).join(','))
        ].join('\n');
        
        this.download(csv, filename, 'text/csv');
    },
    
    // Download file
    download(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        window.dashboardCore.showNotification(`Downloaded ${filename}`, 'success');
    },
    
    // Export moments
    async exportMoments() {
        try {
            const moments = await this.fetchMoments();
            const data = moments.map(m => ({
                ID: m.id,
                Title: m.title,
                Content: m.content,
                Region: m.region,
                Category: m.category,
                Status: m.status,
                Created: new Date(m.created_at).toLocaleString(),
                Sponsor: m.sponsor_name || 'None'
            }));
            
            this.toCSV(data, `moments-${Date.now()}.csv`);
        } catch (error) {
            window.dashboardCore.handleError(error, 'exportMoments');
        }
    },
    
    // Export analytics
    async exportAnalytics() {
        try {
            const analytics = await this.fetchAnalytics();
            const data = [{
                'Total Moments': analytics.total_moments,
                'Active Subscribers': analytics.active_subscribers,
                'Total Broadcasts': analytics.total_broadcasts,
                'Success Rate': analytics.success_rate + '%',
                'Exported': new Date().toLocaleString()
            }];
            
            this.toCSV(data, `analytics-${Date.now()}.csv`);
        } catch (error) {
            window.dashboardCore.handleError(error, 'exportAnalytics');
        }
    },
    
    // Export subscribers
    async exportSubscribers() {
        try {
            const subscribers = await this.fetchSubscribers();
            const data = subscribers.map(s => ({
                Phone: s.phone_number,
                Status: s.status,
                'Opted In': new Date(s.opted_in_at).toLocaleString(),
                Region: s.region || 'N/A'
            }));
            
            this.toCSV(data, `subscribers-${Date.now()}.csv`);
        } catch (error) {
            window.dashboardCore.handleError(error, 'exportSubscribers');
        }
    },
    
    // Fetch functions (placeholder - will use actual API)
    async fetchMoments() {
        // TODO: Replace with actual API call
        return [];
    },
    
    async fetchAnalytics() {
        // TODO: Replace with actual API call
        return {
            total_moments: 0,
            active_subscribers: 0,
            total_broadcasts: 0,
            success_rate: 0
        };
    },
    
    async fetchSubscribers() {
        // TODO: Replace with actual API call
        return [];
    }
};

// Export for use
window.exportData = exportData;

console.log('📥 Export functionality enabled');

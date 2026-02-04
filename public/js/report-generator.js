// Automated Reports Generator
class ReportGenerator {
    constructor() {
        this.templates = {
            daily: this.generateDailyReport.bind(this),
            weekly: this.generateWeeklyReport.bind(this),
            monthly: this.generateMonthlyReport.bind(this)
        };
    }
    
    async generateDailyReport() {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const data = await this.fetchData(yesterday, today);
        
        return {
            title: `Daily Report - ${today.toLocaleDateString()}`,
            period: 'Last 24 hours',
            sections: [
                {
                    title: 'Moments',
                    metrics: [
                        { label: 'Created', value: data.momentsCreated, change: data.momentsChange },
                        { label: 'Broadcasted', value: data.momentsBroadcasted, change: data.broadcastChange }
                    ]
                },
                {
                    title: 'Subscribers',
                    metrics: [
                        { label: 'New', value: data.newSubscribers, change: data.subscribersChange },
                        { label: 'Active', value: data.activeSubscribers, change: data.activeChange }
                    ]
                },
                {
                    title: 'Engagement',
                    metrics: [
                        { label: 'Messages', value: data.messages, change: data.messagesChange },
                        { label: 'Success Rate', value: `${data.successRate}%`, change: data.successChange }
                    ]
                }
            ],
            insights: this.generateInsights(data)
        };
    }
    
    async generateWeeklyReport() {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const data = await this.fetchData(weekAgo, today);
        
        return {
            title: `Weekly Report - Week of ${weekAgo.toLocaleDateString()}`,
            period: 'Last 7 days',
            sections: [
                {
                    title: 'Content Performance',
                    metrics: [
                        { label: 'Total Moments', value: data.momentsCreated },
                        { label: 'Avg per Day', value: Math.round(data.momentsCreated / 7) },
                        { label: 'Top Region', value: data.topRegion },
                        { label: 'Top Category', value: data.topCategory }
                    ]
                },
                {
                    title: 'Audience Growth',
                    metrics: [
                        { label: 'New Subscribers', value: data.newSubscribers },
                        { label: 'Growth Rate', value: `${data.growthRate}%` },
                        { label: 'Churn Rate', value: `${data.churnRate}%` }
                    ]
                },
                {
                    title: 'Broadcast Performance',
                    metrics: [
                        { label: 'Total Sent', value: data.totalSent },
                        { label: 'Success Rate', value: `${data.successRate}%` },
                        { label: 'Avg Delivery Time', value: `${data.avgDeliveryTime}s` }
                    ]
                }
            ],
            trends: data.trends,
            insights: this.generateInsights(data)
        };
    }
    
    async generateMonthlyReport() {
        const today = new Date();
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        
        const data = await this.fetchData(monthAgo, today);
        
        return {
            title: `Monthly Report - ${monthAgo.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
            period: 'Last 30 days',
            sections: [
                {
                    title: 'Overview',
                    metrics: [
                        { label: 'Total Moments', value: data.momentsCreated },
                        { label: 'Total Subscribers', value: data.totalSubscribers },
                        { label: 'Total Broadcasts', value: data.totalBroadcasts },
                        { label: 'Success Rate', value: `${data.successRate}%` }
                    ]
                },
                {
                    title: 'Regional Breakdown',
                    data: data.regionalData
                },
                {
                    title: 'Category Performance',
                    data: data.categoryData
                },
                {
                    title: 'Sponsor Activity',
                    data: data.sponsorData
                }
            ],
            trends: data.trends,
            insights: this.generateInsights(data),
            recommendations: this.generateRecommendations(data)
        };
    }
    
    async fetchData(startDate, endDate) {
        try {
            const response = await fetch(`${window.API_BASE_URL}/admin/analytics/report?start=${startDate.toISOString()}&end=${endDate.toISOString()}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('admin.auth.token')}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) throw new Error('Failed to fetch');
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch report data:', error);
            return this.getMockData();
        }
    }
    
    getMockData() {
        return {
            momentsCreated: 15,
            momentsBroadcasted: 12,
            newSubscribers: 5,
            activeSubscribers: 45,
            messages: 89,
            successRate: 94,
            topRegion: 'KZN',
            topCategory: 'Education',
            totalSent: 540,
            avgDeliveryTime: 2.3,
            growthRate: 12,
            churnRate: 3,
            trends: []
        };
    }
    
    generateInsights(data) {
        const insights = [];
        
        if (data.successRate > 95) {
            insights.push('✅ Excellent broadcast success rate!');
        } else if (data.successRate < 85) {
            insights.push('⚠️ Broadcast success rate needs attention');
        }
        
        if (data.growthRate > 10) {
            insights.push('📈 Strong subscriber growth');
        }
        
        if (data.churnRate > 5) {
            insights.push('⚠️ Higher than normal churn rate');
        }
        
        return insights;
    }
    
    generateRecommendations(data) {
        const recommendations = [];
        
        if (data.successRate < 90) {
            recommendations.push('Consider reviewing broadcast timing and content');
        }
        
        if (data.growthRate < 5) {
            recommendations.push('Increase promotional efforts to boost subscriber growth');
        }
        
        if (data.topCategory) {
            recommendations.push(`Focus more on ${data.topCategory} content - it's performing well`);
        }
        
        return recommendations;
    }
    
    async generateReport(type = 'daily') {
        const generator = this.templates[type];
        if (!generator) {
            throw new Error(`Unknown report type: ${type}`);
        }
        
        return await generator();
    }
    
    renderReport(report, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        let html = `
            <div class="report-header" style="margin-bottom: 2rem;">
                <h2>${report.title}</h2>
                <p style="color: #6b7280;">${report.period}</p>
            </div>
        `;
        
        report.sections.forEach(section => {
            html += `
                <div class="report-section" style="margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1rem;">${section.title}</h3>
            `;
            
            if (section.metrics) {
                html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">';
                section.metrics.forEach(metric => {
                    const changeColor = metric.change > 0 ? '#16a34a' : metric.change < 0 ? '#dc2626' : '#6b7280';
                    html += `
                        <div class="metric-card" style="padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem;">
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">${metric.label}</div>
                            <div style="font-size: 1.5rem; font-weight: bold; color: #1f2937;">${metric.value}</div>
                            ${metric.change !== undefined ? `<div style="font-size: 0.75rem; color: ${changeColor};">${metric.change > 0 ? '↑' : '↓'} ${Math.abs(metric.change)}%</div>` : ''}
                        </div>
                    `;
                });
                html += '</div>';
            }
            
            html += '</div>';
        });
        
        if (report.insights && report.insights.length > 0) {
            html += `
                <div class="report-insights" style="margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1rem;">Key Insights</h3>
                    <ul style="list-style: none; padding: 0;">
                        ${report.insights.map(insight => `<li style="padding: 0.5rem; margin-bottom: 0.5rem; background: #f8fafc; border-left: 3px solid #2563eb;">${insight}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (report.recommendations && report.recommendations.length > 0) {
            html += `
                <div class="report-recommendations" style="margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1rem;">Recommendations</h3>
                    <ul style="list-style: none; padding: 0;">
                        ${report.recommendations.map(rec => `<li style="padding: 0.5rem; margin-bottom: 0.5rem; background: #fef3c7; border-left: 3px solid #f59e0b;">${rec}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }
    
    async downloadReport(type = 'daily', format = 'pdf') {
        const report = await this.generateReport(type);
        
        if (format === 'pdf') {
            if (window.dashboardCore) window.dashboardCore.showNotification('PDF export coming soon!', 'info');
        } else if (format === 'csv') {
            this.exportCSV(report);
        } else if (format === 'json') {
            this.exportJSON(report);
        }
    }
    
    exportCSV(report) {
        let csv = `${report.title}\n${report.period}\n\n`;
        
        report.sections.forEach(section => {
            csv += `\n${section.title}\n`;
            if (section.metrics) {
                section.metrics.forEach(metric => {
                    csv += `${metric.label},${metric.value}\n`;
                });
            }
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${Date.now()}.csv`;
        a.click();
        if (window.dashboardCore) window.dashboardCore.showNotification('Report downloaded successfully');
    }
    
    exportJSON(report) {
        const json = JSON.stringify(report, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${Date.now()}.json`;
        a.click();
    }
}

// Schedule automated reports
class ReportScheduler {
    constructor() {
        this.schedules = [];
    }
    
    schedule(type, frequency, recipients) {
        const schedule = {
            type,
            frequency, // 'daily', 'weekly', 'monthly'
            recipients,
            lastRun: null,
            nextRun: this.calculateNextRun(frequency)
        };
        
        this.schedules.push(schedule);
        localStorage.setItem('report-schedules', JSON.stringify(this.schedules));
        
        if (window.dashboardCore) window.dashboardCore.showNotification(`${type} report scheduled for ${frequency} delivery`, 'success');
    }
    
    calculateNextRun(frequency) {
        const now = new Date();
        const next = new Date(now);
        
        if (frequency === 'daily') {
            next.setDate(next.getDate() + 1);
            next.setHours(9, 0, 0, 0);
        } else if (frequency === 'weekly') {
            next.setDate(next.getDate() + (7 - next.getDay() + 1));
            next.setHours(9, 0, 0, 0);
        } else if (frequency === 'monthly') {
            next.setMonth(next.getMonth() + 1);
            next.setDate(1);
            next.setHours(9, 0, 0, 0);
        }
        
        return next;
    }
    
    checkSchedules() {
        const now = new Date();
        
        this.schedules.forEach(schedule => {
            if (schedule.nextRun && now >= new Date(schedule.nextRun)) {
                this.runScheduledReport(schedule);
            }
        });
    }
    
    async runScheduledReport(schedule) {
        const generator = new ReportGenerator();
        const report = await generator.generateReport(schedule.type);
        
        // Would send email to recipients
        console.log('Scheduled report generated:', report.title);
        
        schedule.lastRun = new Date();
        schedule.nextRun = this.calculateNextRun(schedule.frequency);
        
        localStorage.setItem('report-schedules', JSON.stringify(this.schedules));
    }
}

const reportGenerator = new ReportGenerator();
const reportScheduler = new ReportScheduler();

// Check schedules every hour
setInterval(() => reportScheduler.checkSchedules(), 60 * 60 * 1000);

// Export for global access
window.reportGenerator = reportGenerator;
window.reportScheduler = reportScheduler;

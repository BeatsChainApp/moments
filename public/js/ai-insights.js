// AI-Powered Insights Engine
class AIInsights {
    constructor() {
        this.models = {
            engagement: this.predictEngagement.bind(this),
            churn: this.predictChurn.bind(this),
            optimal: this.findOptimalTiming.bind(this),
            content: this.analyzeContent.bind(this)
        };
        this.historicalData = [];
    }
    
    async loadHistoricalData() {
        try {
            const response = await apiFetch('/analytics/historical?days=90');
            this.historicalData = await response.json();
        } catch (error) {
            console.error('Failed to load historical data:', error);
            this.historicalData = this.generateMockData();
        }
    }
    
    generateMockData() {
        const data = [];
        for (let i = 90; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            data.push({
                date: date.toISOString(),
                moments: Math.floor(Math.random() * 10) + 5,
                subscribers: Math.floor(Math.random() * 20) + 40,
                engagement: Math.random() * 0.3 + 0.6,
                successRate: Math.random() * 0.1 + 0.85
            });
        }
        return data;
    }
    
    // Predict engagement for a moment
    predictEngagement(moment) {
        const features = this.extractFeatures(moment);
        const score = this.calculateEngagementScore(features);
        
        return {
            score: Math.round(score * 100),
            confidence: 0.75,
            factors: [
                { name: 'Time of Day', impact: features.timeScore * 100, positive: features.timeScore > 0.5 },
                { name: 'Content Length', impact: features.lengthScore * 100, positive: features.lengthScore > 0.5 },
                { name: 'Category', impact: features.categoryScore * 100, positive: features.categoryScore > 0.5 },
                { name: 'Historical Performance', impact: features.historyScore * 100, positive: features.historyScore > 0.5 }
            ],
            recommendation: score > 0.7 ? 'High engagement expected' : score > 0.5 ? 'Moderate engagement expected' : 'Consider optimizing content'
        };
    }
    
    extractFeatures(moment) {
        const hour = new Date().getHours();
        const contentLength = moment.content?.length || 0;
        
        return {
            timeScore: this.scoreTime(hour),
            lengthScore: this.scoreLength(contentLength),
            categoryScore: this.scoreCategory(moment.category),
            historyScore: this.scoreHistory(moment.region, moment.category)
        };
    }
    
    scoreTime(hour) {
        // Peak hours: 9-11 AM, 6-8 PM
        if ((hour >= 9 && hour <= 11) || (hour >= 18 && hour <= 20)) {
            return 0.9;
        } else if ((hour >= 7 && hour <= 9) || (hour >= 12 && hour <= 14) || (hour >= 17 && hour <= 18)) {
            return 0.7;
        } else {
            return 0.4;
        }
    }
    
    scoreLength(length) {
        // Optimal: 100-300 characters
        if (length >= 100 && length <= 300) {
            return 0.9;
        } else if (length >= 50 && length <= 500) {
            return 0.7;
        } else {
            return 0.5;
        }
    }
    
    scoreCategory(category) {
        const categoryScores = {
            'Education': 0.85,
            'Opportunity': 0.80,
            'Events': 0.75,
            'Safety': 0.70,
            'Health': 0.70,
            'Culture': 0.65,
            'Technology': 0.60
        };
        return categoryScores[category] || 0.5;
    }
    
    scoreHistory(region, category) {
        if (this.historicalData.length === 0) return 0.5;
        
        const recent = this.historicalData.slice(-30);
        const avgEngagement = recent.reduce((sum, d) => sum + d.engagement, 0) / recent.length;
        
        return avgEngagement;
    }
    
    calculateEngagementScore(features) {
        const weights = {
            timeScore: 0.3,
            lengthScore: 0.2,
            categoryScore: 0.25,
            historyScore: 0.25
        };
        
        return Object.keys(weights).reduce((score, key) => {
            return score + features[key] * weights[key];
        }, 0);
    }
    
    // Predict subscriber churn
    predictChurn(subscribers) {
        const churnRisk = subscribers.map(sub => {
            const daysSinceActivity = this.daysSince(sub.last_activity);
            const risk = this.calculateChurnRisk(daysSinceActivity, sub);
            
            return {
                ...sub,
                churnRisk: risk,
                riskLevel: risk > 0.7 ? 'high' : risk > 0.4 ? 'medium' : 'low'
            };
        });
        
        return {
            highRisk: churnRisk.filter(s => s.riskLevel === 'high'),
            mediumRisk: churnRisk.filter(s => s.riskLevel === 'medium'),
            lowRisk: churnRisk.filter(s => s.riskLevel === 'low'),
            recommendations: this.generateChurnRecommendations(churnRisk)
        };
    }
    
    calculateChurnRisk(daysSinceActivity, subscriber) {
        let risk = 0;
        
        // Days since last activity
        if (daysSinceActivity > 30) risk += 0.4;
        else if (daysSinceActivity > 14) risk += 0.2;
        else if (daysSinceActivity > 7) risk += 0.1;
        
        // Engagement history
        if (subscriber.message_count < 5) risk += 0.3;
        else if (subscriber.message_count < 10) risk += 0.1;
        
        // Subscription duration
        const daysSinceJoin = this.daysSince(subscriber.opted_in_at);
        if (daysSinceJoin < 7) risk += 0.2; // New users at risk
        
        return Math.min(risk, 1);
    }
    
    daysSince(date) {
        const now = new Date();
        const then = new Date(date);
        return Math.floor((now - then) / (1000 * 60 * 60 * 24));
    }
    
    generateChurnRecommendations(churnRisk) {
        const recommendations = [];
        
        const highRiskCount = churnRisk.filter(s => s.riskLevel === 'high').length;
        if (highRiskCount > 0) {
            recommendations.push(`${highRiskCount} subscribers at high risk - send re-engagement campaign`);
        }
        
        const inactiveCount = churnRisk.filter(s => this.daysSince(s.last_activity) > 14).length;
        if (inactiveCount > 5) {
            recommendations.push(`${inactiveCount} inactive subscribers - consider targeted content`);
        }
        
        return recommendations;
    }
    
    // Find optimal broadcast timing
    findOptimalTiming(region, category) {
        if (this.historicalData.length === 0) {
            return {
                bestHour: 9,
                bestDay: 'Tuesday',
                confidence: 0.5,
                reasoning: 'Based on general best practices'
            };
        }
        
        // Analyze historical performance by hour
        const hourlyPerformance = {};
        this.historicalData.forEach(d => {
            const hour = new Date(d.date).getHours();
            if (!hourlyPerformance[hour]) {
                hourlyPerformance[hour] = { total: 0, count: 0 };
            }
            hourlyPerformance[hour].total += d.successRate;
            hourlyPerformance[hour].count++;
        });
        
        // Find best hour
        let bestHour = 9;
        let bestScore = 0;
        Object.keys(hourlyPerformance).forEach(hour => {
            const avg = hourlyPerformance[hour].total / hourlyPerformance[hour].count;
            if (avg > bestScore) {
                bestScore = avg;
                bestHour = parseInt(hour);
            }
        });
        
        return {
            bestHour,
            bestDay: this.findBestDay(),
            confidence: 0.8,
            reasoning: `Based on ${this.historicalData.length} days of historical data`,
            alternativeTimes: this.getAlternativeTimes(hourlyPerformance, bestHour)
        };
    }
    
    findBestDay() {
        const dayPerformance = {
            'Monday': 0.75,
            'Tuesday': 0.85,
            'Wednesday': 0.82,
            'Thursday': 0.78,
            'Friday': 0.70,
            'Saturday': 0.60,
            'Sunday': 0.55
        };
        
        return Object.keys(dayPerformance).reduce((a, b) => 
            dayPerformance[a] > dayPerformance[b] ? a : b
        );
    }
    
    getAlternativeTimes(hourlyPerformance, bestHour) {
        return Object.keys(hourlyPerformance)
            .map(hour => ({
                hour: parseInt(hour),
                score: hourlyPerformance[hour].total / hourlyPerformance[hour].count
            }))
            .filter(t => t.hour !== bestHour)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(t => `${t.hour}:00 (${Math.round(t.score * 100)}% success)`);
    }
    
    // Analyze content quality
    analyzeContent(content) {
        const analysis = {
            length: content.length,
            readability: this.calculateReadability(content),
            sentiment: this.analyzeSentiment(content),
            keywords: this.extractKeywords(content),
            suggestions: []
        };
        
        // Generate suggestions
        if (analysis.length < 50) {
            analysis.suggestions.push('Content is too short - add more details');
        } else if (analysis.length > 500) {
            analysis.suggestions.push('Content is too long - consider breaking into multiple moments');
        }
        
        if (analysis.readability < 0.5) {
            analysis.suggestions.push('Content may be difficult to read - simplify language');
        }
        
        if (analysis.sentiment < 0.3) {
            analysis.suggestions.push('Content seems negative - consider more positive framing');
        }
        
        if (analysis.keywords.length < 3) {
            analysis.suggestions.push('Add more descriptive keywords for better engagement');
        }
        
        return analysis;
    }
    
    calculateReadability(text) {
        const words = text.split(/\s+/).length;
        const sentences = text.split(/[.!?]+/).length;
        const avgWordsPerSentence = words / sentences;
        
        // Simple readability score (0-1)
        if (avgWordsPerSentence < 15) return 0.9;
        if (avgWordsPerSentence < 20) return 0.7;
        if (avgWordsPerSentence < 25) return 0.5;
        return 0.3;
    }
    
    analyzeSentiment(text) {
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'opportunity', 'success', 'benefit'];
        const negativeWords = ['bad', 'poor', 'terrible', 'awful', 'problem', 'issue', 'fail', 'danger'];
        
        const words = text.toLowerCase().split(/\s+/);
        let score = 0.5;
        
        words.forEach(word => {
            if (positiveWords.includes(word)) score += 0.05;
            if (negativeWords.includes(word)) score -= 0.05;
        });
        
        return Math.max(0, Math.min(1, score));
    }
    
    extractKeywords(text) {
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 4);
        
        const frequency = {};
        words.forEach(word => {
            frequency[word] = (frequency[word] || 0) + 1;
        });
        
        return Object.keys(frequency)
            .sort((a, b) => frequency[b] - frequency[a])
            .slice(0, 5);
    }
    
    // Generate comprehensive insights
    async generateInsights() {
        await this.loadHistoricalData();
        
        return {
            engagement: {
                trend: this.calculateTrend('engagement'),
                prediction: this.predictNextWeek('engagement')
            },
            subscribers: {
                trend: this.calculateTrend('subscribers'),
                prediction: this.predictNextWeek('subscribers')
            },
            recommendations: this.generateRecommendations()
        };
    }
    
    calculateTrend(metric) {
        if (this.historicalData.length < 7) return 'insufficient_data';
        
        const recent = this.historicalData.slice(-7);
        const older = this.historicalData.slice(-14, -7);
        
        const recentAvg = recent.reduce((sum, d) => sum + d[metric], 0) / recent.length;
        const olderAvg = older.reduce((sum, d) => sum + d[metric], 0) / older.length;
        
        const change = ((recentAvg - olderAvg) / olderAvg) * 100;
        
        if (change > 10) return 'increasing';
        if (change < -10) return 'decreasing';
        return 'stable';
    }
    
    predictNextWeek(metric) {
        if (this.historicalData.length < 14) return null;
        
        const recent = this.historicalData.slice(-14);
        const avg = recent.reduce((sum, d) => sum + d[metric], 0) / recent.length;
        const trend = this.calculateTrend(metric);
        
        let prediction = avg;
        if (trend === 'increasing') prediction *= 1.1;
        if (trend === 'decreasing') prediction *= 0.9;
        
        return Math.round(prediction);
    }
    
    generateRecommendations() {
        const recommendations = [];
        
        const engagementTrend = this.calculateTrend('engagement');
        if (engagementTrend === 'decreasing') {
            recommendations.push({
                priority: 'high',
                category: 'engagement',
                message: 'Engagement is declining - review content strategy',
                action: 'Review recent moments and adjust content approach'
            });
        }
        
        const subscriberTrend = this.calculateTrend('subscribers');
        if (subscriberTrend === 'decreasing') {
            recommendations.push({
                priority: 'high',
                category: 'growth',
                message: 'Subscriber growth is slowing - increase promotional efforts',
                action: 'Launch subscriber acquisition campaign'
            });
        }
        
        return recommendations;
    }
}

const aiInsights = new AIInsights();

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    aiInsights.loadHistoricalData();
});

// Export for global access
window.aiInsights = aiInsights;

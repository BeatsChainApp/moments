// Offline Support Manager
class OfflineManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.queue = [];
        this.db = null;
    }
    
    async init() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker registered:', registration.scope);
            } catch (error) {
                console.error('❌ Service Worker registration failed:', error);
            }
        }
        
        // Setup online/offline listeners
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Initialize IndexedDB
        await this.initDB();
        
        // Show initial status
        this.updateStatus();
    }
    
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('moments-offline', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('queue')) {
                    db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }
    
    handleOnline() {
        this.isOnline = true;
        this.updateStatus();
        showNotification('Back online! Syncing queued actions...', 'success');
        this.syncQueue();
    }
    
    handleOffline() {
        this.isOnline = false;
        this.updateStatus();
        showNotification('You are offline. Actions will be queued.', 'warning');
    }
    
    updateStatus() {
        const indicator = document.getElementById('offline-indicator');
        if (!indicator) {
            this.createIndicator();
            return;
        }
        
        if (this.isOnline) {
            indicator.style.display = 'none';
        } else {
            indicator.style.display = 'flex';
            indicator.innerHTML = `
                <span style="color: #f59e0b;">⚠️ Offline Mode</span>
                <span style="font-size: 0.75rem; color: #6b7280;">Actions will be queued</span>
            `;
        }
    }
    
    createIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'offline-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            background: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            z-index: 1000;
            display: none;
            flex-direction: column;
            gap: 0.25rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        document.body.appendChild(indicator);
        this.updateStatus();
    }
    
    async queueAction(url, options) {
        if (this.isOnline) {
            return fetch(url, options);
        }
        
        const action = {
            url,
            options,
            timestamp: Date.now()
        };
        
        const transaction = this.db.transaction(['queue'], 'readwrite');
        const store = transaction.objectStore('queue');
        await store.add(action);
        
        showNotification('Action queued for when you\'re back online', 'info');
        
        return { offline: true, queued: true };
    }
    
    async syncQueue() {
        if (!this.db) return;
        
        const transaction = this.db.transaction(['queue'], 'readonly');
        const store = transaction.objectStore('queue');
        const request = store.getAll();
        
        request.onsuccess = async () => {
            const queue = request.result;
            
            if (queue.length === 0) return;
            
            showNotification(`Syncing ${queue.length} queued actions...`, 'info');
            
            for (const action of queue) {
                try {
                    await fetch(action.url, action.options);
                    await this.removeFromQueue(action.id);
                } catch (error) {
                    console.error('Failed to sync action:', error);
                }
            }
            
            showNotification('All actions synced!', 'success');
        };
    }
    
    async removeFromQueue(id) {
        const transaction = this.db.transaction(['queue'], 'readwrite');
        const store = transaction.objectStore('queue');
        await store.delete(id);
    }
}

const offlineManager = new OfflineManager();

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    offlineManager.init();
});

// Export for global access
window.offlineManager = offlineManager;

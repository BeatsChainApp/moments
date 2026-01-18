// Bulk Actions for Moments

const bulkActions = {
    selected: new Set(),
    
    init() {
        console.log('✅ Bulk actions initialized');
    },
    
    toggleSelect(id) {
        if (this.selected.has(id)) {
            this.selected.delete(id);
        } else {
            this.selected.add(id);
        }
        this.updateUI();
    },
    
    selectAll(ids) {
        ids.forEach(id => this.selected.add(id));
        this.updateUI();
    },
    
    selectNone() {
        this.selected.clear();
        this.updateUI();
    },
    
    updateUI() {
        const count = this.selected.size;
        const toolbar = document.getElementById('bulk-toolbar');
        const counter = document.getElementById('bulk-counter');
        
        if (toolbar) {
            toolbar.style.display = count > 0 ? 'flex' : 'none';
        }
        
        if (counter) {
            counter.textContent = `${count} selected`;
        }
        
        // Update checkboxes
        document.querySelectorAll('.bulk-checkbox').forEach(cb => {
            cb.checked = this.selected.has(cb.dataset.id);
        });
    },
    
    async bulkDelete() {
        if (this.selected.size === 0) return;
        
        if (!confirm(`Delete ${this.selected.size} items?`)) return;
        
        try {
            // TODO: Implement actual delete API call
            console.log('Deleting:', Array.from(this.selected));
            
            window.dashboardCore.showNotification(`Deleted ${this.selected.size} items`, 'success');
            this.selectNone();
            
            // Reload list
            if (typeof loadMoments === 'function') {
                await loadMoments();
            }
        } catch (error) {
            window.dashboardCore.handleError(error, 'bulkDelete');
        }
    },
    
    async bulkArchive() {
        if (this.selected.size === 0) return;
        
        try {
            // TODO: Implement actual archive API call
            console.log('Archiving:', Array.from(this.selected));
            
            window.dashboardCore.showNotification(`Archived ${this.selected.size} items`, 'success');
            this.selectNone();
            
            // Reload list
            if (typeof loadMoments === 'function') {
                await loadMoments();
            }
        } catch (error) {
            window.dashboardCore.handleError(error, 'bulkArchive');
        }
    },
    
    async bulkChangeStatus(status) {
        if (this.selected.size === 0) return;
        
        try {
            // TODO: Implement actual status change API call
            console.log('Changing status to', status, ':', Array.from(this.selected));
            
            window.dashboardCore.showNotification(`Updated ${this.selected.size} items to ${status}`, 'success');
            this.selectNone();
            
            // Reload list
            if (typeof loadMoments === 'function') {
                await loadMoments();
            }
        } catch (error) {
            window.dashboardCore.handleError(error, 'bulkChangeStatus');
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => bulkActions.init());

// Export for use
window.bulkActions = bulkActions;

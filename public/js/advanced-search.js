// Advanced Search Engine
class AdvancedSearch {
    constructor() {
        this.index = new Map();
        this.documents = [];
        this.filters = {
            dateRange: null,
            status: [],
            region: [],
            category: [],
            source: []
        };
    }
    
    // Build search index
    buildIndex(documents, fields = ['title', 'content']) {
        this.documents = documents;
        this.index.clear();
        
        documents.forEach((doc, docIndex) => {
            fields.forEach(field => {
                const text = doc[field] || '';
                const words = this.tokenize(text);
                
                words.forEach(word => {
                    if (!this.index.has(word)) {
                        this.index.set(word, new Set());
                    }
                    this.index.get(word).add(docIndex);
                });
            });
        });
        
        console.log(`🔍 Search index built: ${this.index.size} terms, ${documents.length} documents`);
    }
    
    // Tokenize text into searchable words
    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2); // Ignore short words
    }
    
    // Search with ranking
    search(query, options = {}) {
        const {
            fuzzy = true,
            limit = 50,
            minScore = 0.1
        } = options;
        
        const queryWords = this.tokenize(query);
        if (queryWords.length === 0) return this.documents;
        
        const scores = new Map();
        
        queryWords.forEach(queryWord => {
            // Exact matches
            if (this.index.has(queryWord)) {
                this.index.get(queryWord).forEach(docIndex => {
                    scores.set(docIndex, (scores.get(docIndex) || 0) + 1);
                });
            }
            
            // Fuzzy matches
            if (fuzzy) {
                this.index.forEach((docIndices, indexWord) => {
                    if (this.similarity(queryWord, indexWord) > 0.7) {
                        docIndices.forEach(docIndex => {
                            scores.set(docIndex, (scores.get(docIndex) || 0) + 0.5);
                        });
                    }
                });
            }
        });
        
        // Apply filters
        const filtered = Array.from(scores.entries())
            .filter(([docIndex, score]) => {
                const doc = this.documents[docIndex];
                return this.matchesFilters(doc) && score >= minScore;
            })
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([docIndex]) => this.documents[docIndex]);
        
        return filtered;
    }
    
    // String similarity (Levenshtein distance)
    similarity(a, b) {
        const matrix = [];
        
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        const distance = matrix[b.length][a.length];
        const maxLength = Math.max(a.length, b.length);
        return 1 - distance / maxLength;
    }
    
    // Check if document matches current filters
    matchesFilters(doc) {
        if (this.filters.status.length > 0 && !this.filters.status.includes(doc.status)) {
            return false;
        }
        if (this.filters.region.length > 0 && !this.filters.region.includes(doc.region)) {
            return false;
        }
        if (this.filters.category.length > 0 && !this.filters.category.includes(doc.category)) {
            return false;
        }
        if (this.filters.source.length > 0 && !this.filters.source.includes(doc.content_source)) {
            return false;
        }
        if (this.filters.dateRange) {
            const docDate = new Date(doc.created_at);
            if (docDate < this.filters.dateRange.start || docDate > this.filters.dateRange.end) {
                return false;
            }
        }
        return true;
    }
    
    // Set filters
    setFilter(type, values) {
        if (type === 'dateRange') {
            this.filters.dateRange = values;
        } else {
            this.filters[type] = Array.isArray(values) ? values : [values];
        }
    }
    
    // Clear filters
    clearFilters() {
        this.filters = {
            dateRange: null,
            status: [],
            region: [],
            category: [],
            source: []
        };
    }
    
    // Highlight search terms in text
    highlight(text, query) {
        const words = this.tokenize(query);
        let highlighted = text;
        
        words.forEach(word => {
            const regex = new RegExp(`\\b${word}\\w*`, 'gi');
            highlighted = highlighted.replace(regex, match => `<mark>${match}</mark>`);
        });
        
        return highlighted;
    }
    
    // Get search suggestions
    getSuggestions(query, limit = 5) {
        const words = this.tokenize(query);
        if (words.length === 0) return [];
        
        const lastWord = words[words.length - 1];
        const suggestions = [];
        
        this.index.forEach((_, indexWord) => {
            if (indexWord.startsWith(lastWord) && indexWord !== lastWord) {
                suggestions.push(indexWord);
            }
        });
        
        return suggestions.slice(0, limit);
    }
}

// Initialize search engine
const advancedSearch = new AdvancedSearch();

// Setup advanced search UI
function setupAdvancedSearch() {
    const searchBox = document.getElementById('search-box');
    if (!searchBox) return;
    
    // Create suggestions dropdown
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.id = 'search-suggestions';
    suggestionsDiv.style.cssText = `
        position: absolute;
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        max-height: 200px;
        overflow-y: auto;
        display: none;
        z-index: 100;
        width: 100%;
    `;
    searchBox.parentElement.style.position = 'relative';
    searchBox.parentElement.appendChild(suggestionsDiv);
    
    // Show suggestions on input
    searchBox.addEventListener('input', (e) => {
        const query = e.target.value;
        if (query.length < 2) {
            suggestionsDiv.style.display = 'none';
            return;
        }
        
        const suggestions = advancedSearch.getSuggestions(query);
        if (suggestions.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }
        
        suggestionsDiv.innerHTML = suggestions.map(word => `
            <div class="suggestion-item" style="padding: 0.5rem; cursor: pointer; hover:background: #f3f4f6;">
                ${word}
            </div>
        `).join('');
        
        suggestionsDiv.style.display = 'block';
        
        // Click handler for suggestions
        suggestionsDiv.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                searchBox.value = item.textContent.trim();
                suggestionsDiv.style.display = 'none';
                searchBox.dispatchEvent(new Event('input'));
            });
        });
    });
    
    // Hide suggestions on blur
    searchBox.addEventListener('blur', () => {
        setTimeout(() => {
            suggestionsDiv.style.display = 'none';
        }, 200);
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    setupAdvancedSearch();
});

// Export for global access
window.advancedSearch = advancedSearch;

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function MomentsPage() {
  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ region: '', category: '', status: '' });

  useEffect(() => {
    async function fetchMoments() {
      try {
        const params = new URLSearchParams();
        if (filters.region) params.append('region', filters.region);
        if (filters.category) params.append('category', filters.category);
        if (filters.status) params.append('status', filters.status);
        
        const res = await fetch(`/api/moments?${params}`);
        if (res.ok) {
          const data = await res.json();
          setMoments(data.data || data || []);
        }
      } catch (e) {
        console.log('Failed to fetch moments:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchMoments();
  }, [filters]);

  const regions = ['KZN', 'WC', 'GP', 'EC', 'FS', 'LP', 'MP', 'NC', 'NW'];
  const categories = ['Education', 'Safety', 'Culture', 'Opportunity', 'Events', 'Health', 'Technology'];
  const statuses = ['draft', 'scheduled', 'broadcasted'];

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: { background: '#f3f4f6', color: '#374151' },
      scheduled: { background: '#fef3c7', color: '#92400e' },
      broadcasted: { background: '#d1fae5', color: '#065f46' }
    };
    return (
      <span style={{
        ...styles[status] || styles.draft,
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 500
      }}>
        {status?.toUpperCase() || 'DRAFT'}
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px'}}>
        <div>
          <h1 style={{fontSize: '1.8rem', fontWeight: 700, color: '#1f2937', marginBottom: '4px'}}>📢 Community Moments</h1>
          <p style={{color: '#6b7280'}}>Stay connected with local events, opportunities, and important announcements</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{marginBottom: '24px'}}>
        <h3 style={{marginBottom: '16px', color: '#1f2937'}}>Filter Moments</h3>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px'}}>
          <div>
            <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#374151'}}>Region</label>
            <select 
              value={filters.region} 
              onChange={(e) => setFilters({...filters, region: e.target.value})}
              style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px'}}
            >
              <option value="">All Regions</option>
              {regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#374151'}}>Category</label>
            <select 
              value={filters.category} 
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px'}}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#374151'}}>Status</label>
            <select 
              value={filters.status} 
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px'}}
            >
              <option value="">All Statuses</option>
              {statuses.map(status => (
                <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        {(filters.region || filters.category || filters.status) && (
          <button 
            onClick={() => setFilters({ region: '', category: '', status: '' })}
            style={{marginTop: '12px', padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', cursor: 'pointer'}}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{textAlign: 'center', padding: '40px'}}>
          <div style={{fontSize: '2rem', marginBottom: '8px'}}>⏳</div>
          <p style={{color: '#6b7280'}}>Loading moments...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && moments.length === 0 && (
        <div className="card" style={{textAlign: 'center', padding: '40px'}}>
          <div style={{fontSize: '3rem', marginBottom: '16px'}}>📢</div>
          <h3 style={{color: '#1f2937', marginBottom: '8px'}}>No moments found</h3>
          <p style={{color: '#6b7280', marginBottom: '16px'}}>There are no moments matching your current filters.</p>
          {(filters.region || filters.category || filters.status) && (
            <button 
              onClick={() => setFilters({ region: '', category: '', status: '' })}
              className="btn btn-primary"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Moments Grid */}
      {!loading && moments.length > 0 && (
        <div style={{display: 'grid', gap: '16px'}}>
          {moments.map(moment => (
            <div key={moment.id} className="card" style={{position: 'relative'}}>
              {/* Status Badge */}
              <div style={{position: 'absolute', top: '12px', right: '12px'}}>
                {getStatusBadge(moment.status)}
              </div>
              
              {/* Sponsored Label */}
              {moment.is_sponsored && (
                <div style={{background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, display: 'inline-block', marginBottom: '12px'}}>
                  🌟 Sponsored Content
                </div>
              )}
              
              {/* Content */}
              <div style={{paddingRight: '80px'}}>
                <h3 style={{color: '#1f2937', marginBottom: '8px', fontSize: '1.1rem', fontWeight: 600}}>
                  {moment.title || 'Untitled Moment'}
                </h3>
                
                <p style={{color: '#4b5563', marginBottom: '12px', lineHeight: 1.6}}>
                  {moment.content || 'No content available'}
                </p>
                
                {/* Meta Information */}
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '14px', color: '#6b7280'}}>
                  {moment.region && (
                    <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                      📍 {moment.region}
                    </span>
                  )}
                  {moment.category && (
                    <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                      🏷️ {moment.category}
                    </span>
                  )}
                  {moment.scheduled_at && (
                    <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                      🕰️ {formatDate(moment.scheduled_at)}
                    </span>
                  )}
                  {moment.created_at && (
                    <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                      📅 Created {formatDate(moment.created_at)}
                    </span>
                  )}
                </div>
                
                {/* Sponsor Information */}
                {moment.sponsor_name && (
                  <div style={{marginTop: '12px', padding: '8px', background: '#f9fafb', borderRadius: '4px', fontSize: '14px'}}>
                    <span style={{color: '#6b7280'}}>Brought to you by:</span> <strong style={{color: '#1f2937'}}>{moment.sponsor_name}</strong>
                  </div>
                )}
                
                {/* PWA Link */}
                {moment.pwa_link && (
                  <div style={{marginTop: '12px'}}>
                    <a 
                      href={moment.pwa_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{textDecoration: 'none', fontSize: '14px'}}
                    >
                      🌐 Learn More
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WhatsApp CTA */}
      <div className="card" style={{background: '#f0fdf4', border: '1px solid #bbf7d0', marginTop: '32px', textAlign: 'center'}}>
        <h3 style={{color: '#166534', marginBottom: '8px'}}>📱 Get Moments on WhatsApp</h3>
        <p style={{color: '#166534', marginBottom: '12px'}}>Receive these moments directly on WhatsApp by messaging us:</p>
        <div style={{background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #bbf7d0', marginBottom: '12px', display: 'inline-block'}}>
          <strong style={{color: '#166534'}}>+27 65 829 5041</strong>
        </div>
        <p style={{fontSize: '14px', color: '#166534'}}>Send <strong>START</strong> or <strong>JOIN</strong> to subscribe</p>
      </div>
    </div>
  );
}

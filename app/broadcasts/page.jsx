'use client';

import { useState, useEffect } from 'react';

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', region: '' });

  useEffect(() => {
    async function fetchBroadcasts() {
      try {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.region) params.append('region', filters.region);
        
        const res = await fetch(`/api/broadcasts?${params}`);
        if (res.ok) {
          const data = await res.json();
          setBroadcasts(data.data || data || []);
        }
      } catch (e) {
        console.log('Failed to fetch broadcasts:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchBroadcasts();
  }, [filters]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
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
      pending: { background: '#fef3c7', color: '#92400e' },
      in_progress: { background: '#dbeafe', color: '#1e40af' },
      completed: { background: '#d1fae5', color: '#065f46' },
      failed: { background: '#fee2e2', color: '#dc2626' }
    };
    return (
      <span style={{
        ...styles[status] || styles.pending,
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 500
      }}>
        {status?.toUpperCase().replace('_', ' ') || 'PENDING'}
      </span>
    );
  };

  const calculateSuccessRate = (broadcast) => {
    if (!broadcast.recipient_count || broadcast.recipient_count === 0) return 0;
    return Math.round((broadcast.success_count / broadcast.recipient_count) * 100);
  };

  const getSuccessRateColor = (rate) => {
    if (rate >= 90) return '#059669';
    if (rate >= 70) return '#d97706';
    return '#dc2626';
  };

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom: '24px'}}>
        <h1 style={{fontSize: '1.8rem', fontWeight: 700, color: '#1f2937', marginBottom: '4px'}}>📡 Broadcast History</h1>
        <p style={{color: '#6b7280'}}>Track all community broadcasts and their delivery success rates</p>
      </div>

      {/* Filters */}
      <div className="card" style={{marginBottom: '24px'}}>
        <h3 style={{marginBottom: '16px', color: '#1f2937'}}>Filter Broadcasts</h3>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px'}}>
          <div>
            <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#374151'}}>Status</label>
            <select 
              value={filters.status} 
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px'}}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500, color: '#374151'}}>Region</label>
            <select 
              value={filters.region} 
              onChange={(e) => setFilters({...filters, region: e.target.value})}
              style={{width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px'}}
            >
              <option value="">All Regions</option>
              <option value="KZN">KZN</option>
              <option value="WC">WC</option>
              <option value="GP">GP</option>
              <option value="EC">EC</option>
              <option value="FS">FS</option>
              <option value="LP">LP</option>
              <option value="MP">MP</option>
              <option value="NC">NC</option>
              <option value="NW">NW</option>
            </select>
          </div>
        </div>
        {(filters.status || filters.region) && (
          <button 
            onClick={() => setFilters({ status: '', region: '' })}
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
          <p style={{color: '#6b7280'}}>Loading broadcasts...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && broadcasts.length === 0 && (
        <div className="card" style={{textAlign: 'center', padding: '40px'}}>
          <div style={{fontSize: '3rem', marginBottom: '16px'}}>📡</div>
          <h3 style={{color: '#1f2937', marginBottom: '8px'}}>No broadcasts found</h3>
          <p style={{color: '#6b7280'}}>There are no broadcasts matching your current filters.</p>
        </div>
      )}

      {/* Broadcasts List */}
      {!loading && broadcasts.length > 0 && (
        <div style={{display: 'grid', gap: '16px'}}>
          {broadcasts.map(broadcast => {
            const successRate = calculateSuccessRate(broadcast);
            return (
              <div key={broadcast.id} className="card">
                {/* Header */}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px'}}>
                  <div style={{flex: 1}}>
                    <h3 style={{color: '#1f2937', marginBottom: '4px', fontSize: '1.1rem', fontWeight: 600}}>
                      {broadcast.moment_title || `Broadcast #${broadcast.id}`}
                    </h3>
                    <div style={{fontSize: '14px', color: '#6b7280'}}>
                      {broadcast.moment_region && (
                        <span style={{marginRight: '12px'}}>📍 {broadcast.moment_region}</span>
                      )}
                      {broadcast.moment_category && (
                        <span>🏷️ {broadcast.moment_category}</span>
                      )}
                    </div>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    {getStatusBadge(broadcast.status)}
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '16px'}}>
                  <div style={{textAlign: 'center', padding: '12px', background: '#f9fafb', borderRadius: '6px'}}>
                    <div style={{fontSize: '1.5rem', fontWeight: 600, color: '#1f2937'}}>{broadcast.recipient_count || 0}</div>
                    <div style={{fontSize: '12px', color: '#6b7280'}}>Recipients</div>
                  </div>
                  <div style={{textAlign: 'center', padding: '12px', background: '#f0fdf4', borderRadius: '6px'}}>
                    <div style={{fontSize: '1.5rem', fontWeight: 600, color: '#059669'}}>{broadcast.success_count || 0}</div>
                    <div style={{fontSize: '12px', color: '#6b7280'}}>Delivered</div>
                  </div>
                  <div style={{textAlign: 'center', padding: '12px', background: '#fef2f2', borderRadius: '6px'}}>
                    <div style={{fontSize: '1.5rem', fontWeight: 600, color: '#dc2626'}}>{broadcast.failure_count || 0}</div>
                    <div style={{fontSize: '12px', color: '#6b7280'}}>Failed</div>
                  </div>
                  <div style={{textAlign: 'center', padding: '12px', background: '#fefce8', borderRadius: '6px'}}>
                    <div style={{fontSize: '1.5rem', fontWeight: 600, color: getSuccessRateColor(successRate)}}>{successRate}%</div>
                    <div style={{fontSize: '12px', color: '#6b7280'}}>Success Rate</div>
                  </div>
                </div>

                {/* Progress Bar */}
                {broadcast.status === 'in_progress' && (
                  <div style={{marginBottom: '16px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px'}}>
                      <span style={{fontSize: '14px', color: '#374151', fontWeight: 500}}>Broadcast Progress</span>
                      <span style={{fontSize: '14px', color: '#6b7280'}}>{successRate}% complete</span>
                    </div>
                    <div style={{width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden'}}>
                      <div 
                        style={{
                          width: `${successRate}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '14px', color: '#6b7280'}}>
                  {broadcast.broadcast_started_at && (
                    <div>
                      <strong style={{color: '#374151'}}>Started:</strong> {formatDate(broadcast.broadcast_started_at)}
                    </div>
                  )}
                  {broadcast.broadcast_completed_at && (
                    <div>
                      <strong style={{color: '#374151'}}>Completed:</strong> {formatDate(broadcast.broadcast_completed_at)}
                    </div>
                  )}
                  {broadcast.created_at && (
                    <div>
                      <strong style={{color: '#374151'}}>Created:</strong> {formatDate(broadcast.created_at)}
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {broadcast.status === 'failed' && broadcast.error_message && (
                  <div style={{marginTop: '12px', padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px'}}>
                    <div style={{fontSize: '14px', fontWeight: 500, color: '#dc2626', marginBottom: '4px'}}>Error Details:</div>
                    <div style={{fontSize: '14px', color: '#7f1d1d'}}>{broadcast.error_message}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      {!loading && broadcasts.length > 0 && (
        <div className="card" style={{marginTop: '32px', background: '#f8fafc'}}>
          <h3 style={{color: '#1f2937', marginBottom: '16px'}}>Summary Statistics</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px'}}>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: '1.5rem', fontWeight: 600, color: '#2563eb'}}>{broadcasts.length}</div>
              <div style={{fontSize: '14px', color: '#6b7280'}}>Total Broadcasts</div>
            </div>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: '1.5rem', fontWeight: 600, color: '#059669'}}>
                {broadcasts.filter(b => b.status === 'completed').length}
              </div>
              <div style={{fontSize: '14px', color: '#6b7280'}}>Completed</div>
            </div>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: '1.5rem', fontWeight: 600, color: '#d97706'}}>
                {broadcasts.filter(b => b.status === 'in_progress').length}
              </div>
              <div style={{fontSize: '14px', color: '#6b7280'}}>In Progress</div>
            </div>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: '1.5rem', fontWeight: 600, color: '#dc2626'}}>
                {broadcasts.filter(b => b.status === 'failed').length}
              </div>
              <div style={{fontSize: '14px', color: '#6b7280'}}>Failed</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

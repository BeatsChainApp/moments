'use client';

import { useState, useEffect } from 'react';

export default function HomePage() {
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState({ moments: 0, subscribers: 0, broadcasts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has connected via WhatsApp (stored in localStorage)
    const isConnected = localStorage.getItem('whatsapp_connected') === 'true';
    setConnected(isConnected);
    
    // Fetch public stats
    async function fetchStats() {
      try {
        const res = await fetch('/api/public-stats');
        if (res.ok) {
          const data = await res.json();
          setStats({
            moments: data.totalMoments || 0,
            subscribers: data.activeSubscribers || 0,
            broadcasts: data.totalBroadcasts || 0
          });
        }
      } catch (e) {
        console.log('Stats not available');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const handleWhatsAppConnect = () => {
    // Open WhatsApp with pre-filled message
    const message = encodeURIComponent('START - I want to join Unami Moments community updates');
    const whatsappUrl = `https://wa.me/27658295041?text=${message}`;
    window.open(whatsappUrl, '_blank');
    
    // Mark as connected (user will confirm after sending message)
    setTimeout(() => {
      localStorage.setItem('whatsapp_connected', 'true');
      setConnected(true);
    }, 2000);
  };

  if (!connected) {
    return (
      <div style={{maxWidth: '600px', margin: '0 auto', textAlign: 'center'}}>
        {/* Welcome Section */}
        <div className="card" style={{background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', marginBottom: '24px'}}>
          <div style={{fontSize: '3rem', marginBottom: '16px'}}>🌍</div>
          <h1 style={{fontSize: '2.5rem', marginBottom: '12px', fontWeight: 700}}>Welcome to Unami Moments</h1>
          <p style={{fontSize: '1.2rem', opacity: 0.9, lineHeight: 1.6}}>100% WhatsApp-native community engagement platform connecting South African communities</p>
        </div>

        {/* Connection Steps */}
        <div className="card" style={{marginBottom: '24px', textAlign: 'left'}}>
          <h2 style={{color: '#1f2937', marginBottom: '20px', textAlign: 'center'}}>Get Started in 3 Simple Steps</h2>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{background: '#2563eb', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>1</div>
              <div>
                <strong>Connect via WhatsApp</strong>
                <p style={{color: '#6b7280', margin: '4px 0 0 0'}}>Click below to send a message to our WhatsApp number</p>
              </div>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{background: '#059669', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>2</div>
              <div>
                <strong>Choose Your Preferences</strong>
                <p style={{color: '#6b7280', margin: '4px 0 0 0'}}>Select regions and topics you're interested in</p>
              </div>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{background: '#dc2626', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>3</div>
              <div>
                <strong>Receive Community Updates</strong>
                <p style={{color: '#6b7280', margin: '4px 0 0 0'}}>Get moments, events, and opportunities directly on WhatsApp</p>
              </div>
            </div>
          </div>
        </div>

        {/* Connect Button */}
        <button 
          onClick={handleWhatsAppConnect}
          className="btn btn-primary"
          style={{fontSize: '1.1rem', padding: '12px 24px', marginBottom: '24px', width: '100%', maxWidth: '300px'}}
        >
          📱 Connect via WhatsApp
        </button>

        {/* Community Stats */}
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px'}}>
          <div className="card" style={{textAlign: 'center', padding: '12px'}}>
            <div style={{fontSize: '1.5rem', color: '#2563eb', marginBottom: '4px'}}>📢</div>
            <div style={{fontSize: '1.2rem', fontWeight: 600}}>{loading ? '...' : stats.moments}</div>
            <div style={{color: '#6b7280', fontSize: '12px'}}>Moments</div>
          </div>
          <div className="card" style={{textAlign: 'center', padding: '12px'}}>
            <div style={{fontSize: '1.5rem', color: '#059669', marginBottom: '4px'}}>👥</div>
            <div style={{fontSize: '1.2rem', fontWeight: 600}}>{loading ? '...' : stats.subscribers}</div>
            <div style={{color: '#6b7280', fontSize: '12px'}}>Members</div>
          </div>
          <div className="card" style={{textAlign: 'center', padding: '12px'}}>
            <div style={{fontSize: '1.5rem', color: '#dc2626', marginBottom: '4px'}}>📡</div>
            <div style={{fontSize: '1.2rem', fontWeight: 600}}>{loading ? '...' : stats.broadcasts}</div>
            <div style={{color: '#6b7280', fontSize: '12px'}}>Updates</div>
          </div>
        </div>

        {/* WhatsApp Info */}
        <div className="card" style={{background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '14px'}}>
          <p style={{color: '#166534', marginBottom: '8px'}}><strong>WhatsApp Number:</strong> +27 65 829 5041</p>
          <p style={{color: '#166534'}}>Send "START" to begin receiving community updates</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="card" style={{background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', textAlign: 'center', marginBottom: '24px'}}>
        <h1 style={{fontSize: '2rem', marginBottom: '8px', fontWeight: 700}}>🌍 Welcome to Unami Moments</h1>
        <p style={{fontSize: '1.1rem', opacity: 0.9, marginBottom: '16px'}}>100% WhatsApp-native community engagement platform for South Africa</p>
        <div style={{display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap'}}>
          <a href="/preferences" className="btn" style={{background: 'rgba(255,255,255,0.2)', color: 'white', textDecoration: 'none'}}>⚙️ Set Preferences</a>
          <a href="/moments" className="btn" style={{background: 'rgba(255,255,255,0.2)', color: 'white', textDecoration: 'none'}}>📢 View Moments</a>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px'}}>
        <div className="card" style={{textAlign: 'center'}}>
          <div style={{fontSize: '2rem', color: '#2563eb', marginBottom: '8px'}}>📢</div>
          <div style={{fontSize: '1.5rem', fontWeight: 600, color: '#1f2937'}}>{loading ? '...' : stats.moments || 0}</div>
          <div style={{color: '#6b7280', fontSize: '14px'}}>Total Moments</div>
        </div>
        <div className="card" style={{textAlign: 'center'}}>
          <div style={{fontSize: '2rem', color: '#059669', marginBottom: '8px'}}>👥</div>
          <div style={{fontSize: '1.5rem', fontWeight: 600, color: '#1f2937'}}>{loading ? '...' : stats.subscribers || 0}</div>
          <div style={{color: '#6b7280', fontSize: '14px'}}>Active Subscribers</div>
        </div>
        <div className="card" style={{textAlign: 'center'}}>
          <div style={{fontSize: '2rem', color: '#dc2626', marginBottom: '8px'}}>📡</div>
          <div style={{fontSize: '1.5rem', fontWeight: 600, color: '#1f2937'}}>{loading ? '...' : stats.broadcasts || 0}</div>
          <div style={{color: '#6b7280', fontSize: '14px'}}>Broadcasts Sent</div>
        </div>
      </div>

      {/* Features Grid */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px'}}>
        <div className="card">
          <h3 style={{color: '#1f2937', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            📢 <span>Community Moments</span>
          </h3>
          <p style={{color: '#6b7280', marginBottom: '16px', lineHeight: 1.6}}>Stay connected with your community through curated moments, local events, and important announcements delivered directly via WhatsApp.</p>
          <a href="/moments" className="btn btn-primary" style={{textDecoration: 'none'}}>Browse Moments</a>
        </div>
        
        <div className="card">
          <h3 style={{color: '#1f2937', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            📡 <span>Broadcast History</span>
          </h3>
          <p style={{color: '#6b7280', marginBottom: '16px', lineHeight: 1.6}}>View all broadcasts sent to your community, track engagement, and see what content resonates most with subscribers.</p>
          <a href="/broadcasts" className="btn btn-primary" style={{textDecoration: 'none'}}>View Broadcasts</a>
        </div>
        
        <div className="card">
          <h3 style={{color: '#1f2937', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            ⚙️ <span>Preferences</span>
          </h3>
          <p style={{color: '#6b7280', marginBottom: '16px', lineHeight: 1.6}}>Customize your experience by selecting regions, categories, and notification preferences for the content you want to receive.</p>
          <a href="/settings" className="btn btn-primary" style={{textDecoration: 'none'}}>Manage Settings</a>
        </div>
      </div>

      {/* WhatsApp Integration Info */}
      <div className="card" style={{background: '#f0fdf4', border: '1px solid #bbf7d0'}}>
        <h3 style={{color: '#166534', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'}}>
          📱 <span>WhatsApp Integration</span>
        </h3>
        <p style={{color: '#166534', marginBottom: '12px'}}>Connect with us on WhatsApp for instant community updates:</p>
        <div style={{background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #bbf7d0', marginBottom: '12px'}}>
          <strong style={{color: '#166534'}}>WhatsApp Number:</strong> <span style={{fontFamily: 'monospace', color: '#1f2937'}}>+27 65 829 5041</span>
        </div>
        <div style={{fontSize: '14px', color: '#166534'}}>
          <p><strong>Commands:</strong></p>
          <ul style={{marginLeft: '20px', marginTop: '4px'}}>
            <li><code style={{background: 'rgba(22,101,52,0.1)', padding: '2px 4px', borderRadius: '3px'}}>START</code> or <code style={{background: 'rgba(22,101,52,0.1)', padding: '2px 4px', borderRadius: '3px'}}>JOIN</code> - Opt into broadcasts</li>
            <li><code style={{background: 'rgba(22,101,52,0.1)', padding: '2px 4px', borderRadius: '3px'}}>STOP</code> or <code style={{background: 'rgba(22,101,52,0.1)', padding: '2px 4px', borderRadius: '3px'}}>UNSUBSCRIBE</code> - Opt out of broadcasts</li>
          </ul>
        </div>
      </div>

      {/* Admin Link */}
      <div style={{textAlign: 'center', marginTop: '32px', padding: '16px', background: '#f8f9fa', borderRadius: '8px'}}>
        <p style={{color: '#6c757d', marginBottom: '8px'}}>Are you an administrator?</p>
        <a href="/admin.html" className="btn" style={{background: '#6c757d', color: 'white', textDecoration: 'none'}}>Access Admin Dashboard</a>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

export default function PreferencesPage() {
  const [preferences, setPreferences] = useState({
    regions: [],
    categories: [],
    phone: ''
  });
  const [saved, setSaved] = useState(false);

  const regions = [
    { code: 'KZN', name: 'KwaZulu-Natal' },
    { code: 'WC', name: 'Western Cape' },
    { code: 'GP', name: 'Gauteng' },
    { code: 'EC', name: 'Eastern Cape' },
    { code: 'FS', name: 'Free State' },
    { code: 'LP', name: 'Limpopo' },
    { code: 'MP', name: 'Mpumalanga' },
    { code: 'NC', name: 'Northern Cape' },
    { code: 'NW', name: 'North West' }
  ];

  const categories = [
    { id: 'Education', name: 'Education & Learning', icon: '📚' },
    { id: 'Safety', name: 'Safety & Security', icon: '🛡️' },
    { id: 'Culture', name: 'Culture & Arts', icon: '🎭' },
    { id: 'Opportunity', name: 'Job Opportunities', icon: '💼' },
    { id: 'Events', name: 'Community Events', icon: '🎉' },
    { id: 'Health', name: 'Health & Wellness', icon: '🏥' },
    { id: 'Technology', name: 'Technology & Innovation', icon: '💻' }
  ];

  useEffect(() => {
    const saved = localStorage.getItem('user_preferences');
    if (saved) {
      setPreferences(JSON.parse(saved));
    }
  }, []);

  const toggleRegion = (regionCode) => {
    setPreferences(prev => ({
      ...prev,
      regions: prev.regions.includes(regionCode)
        ? prev.regions.filter(r => r !== regionCode)
        : [...prev.regions, regionCode]
    }));
  };

  const toggleCategory = (categoryId) => {
    setPreferences(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(c => c !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  const handleSave = () => {
    localStorage.setItem('user_preferences', JSON.stringify(preferences));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{maxWidth: '800px', margin: '0 auto'}}>
      <div className="card" style={{background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', textAlign: 'center', marginBottom: '24px'}}>
        <h1 style={{fontSize: '2rem', marginBottom: '8px'}}>⚙️ Your Preferences</h1>
        <p style={{opacity: 0.9}}>Customize what community updates you receive</p>
      </div>

      <div className="card" style={{marginBottom: '24px'}}>
        <h3 style={{marginBottom: '12px', color: '#1f2937'}}>📱 WhatsApp Number</h3>
        <input
          type="tel"
          placeholder="+27 XX XXX XXXX"
          value={preferences.phone}
          onChange={(e) => setPreferences(prev => ({...prev, phone: e.target.value}))}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '16px'
          }}
        />
      </div>

      <div className="card" style={{marginBottom: '24px'}}>
        <h3 style={{marginBottom: '12px', color: '#1f2937'}}>🗺️ Regions</h3>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px'}}>
          {regions.map(region => (
            <button
              key={region.code}
              onClick={() => toggleRegion(region.code)}
              style={{
                padding: '12px',
                border: '2px solid',
                borderColor: preferences.regions.includes(region.code) ? '#2563eb' : '#e5e7eb',
                borderRadius: '8px',
                background: preferences.regions.includes(region.code) ? '#eff6ff' : 'white',
                color: preferences.regions.includes(region.code) ? '#2563eb' : '#374151',
                cursor: 'pointer'
              }}
            >
              <div style={{fontWeight: 'bold'}}>{region.code}</div>
              <div style={{fontSize: '14px'}}>{region.name}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{marginBottom: '24px'}}>
        <h3 style={{marginBottom: '12px', color: '#1f2937'}}>🏷️ Topics</h3>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px'}}>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              style={{
                padding: '16px',
                border: '2px solid',
                borderColor: preferences.categories.includes(category.id) ? '#059669' : '#e5e7eb',
                borderRadius: '8px',
                background: preferences.categories.includes(category.id) ? '#f0fdf4' : 'white',
                cursor: 'pointer'
              }}
            >
              <span style={{fontSize: '1.2rem', marginRight: '8px'}}>{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{textAlign: 'center', marginBottom: '24px'}}>
        <button
          onClick={handleSave}
          className="btn btn-primary"
          style={{
            fontSize: '1.1rem',
            padding: '12px 32px',
            background: saved ? '#059669' : '#2563eb'
          }}
        >
          {saved ? '✅ Saved!' : '💾 Save Preferences'}
        </button>
      </div>

      <div className="card" style={{background: '#f0fdf4', border: '1px solid #bbf7d0'}}>
        <h4 style={{color: '#166534', marginBottom: '12px'}}>📱 Next: Connect WhatsApp</h4>
        <p style={{color: '#166534', marginBottom: '12px'}}>Send "START" to +27 65 829 5041</p>
        <a 
          href="https://wa.me/27658295041?text=START"
          target="_blank"
          className="btn"
          style={{background: '#25d366', color: 'white', textDecoration: 'none'}}
        >
          📱 Open WhatsApp
        </a>
      </div>
    </div>
  );
}
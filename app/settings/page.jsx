'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [preferences, setPreferences] = useState({
    regions: [],
    categories: [],
    language: 'en',
    notifications: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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
    'Education', 'Safety', 'Culture', 'Opportunity', 'Events', 'Health', 'Technology'
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'af', name: 'Afrikaans' },
    { code: 'zu', name: 'isiZulu' },
    { code: 'xh', name: 'isiXhosa' },
    { code: 'st', name: 'Sesotho' },
    { code: 'tn', name: 'Setswana' },
    { code: 've', name: 'Tshivenda' },
    { code: 'ts', name: 'Xitsonga' },
    { code: 'ss', name: 'siSwati' },
    { code: 'nr', name: 'isiNdebele' },
    { code: 'nso', name: 'Sepedi' }
  ];

  useEffect(() => {
    const savedPrefs = localStorage.getItem('unami-preferences');
    if (savedPrefs) {
      setPreferences(JSON.parse(savedPrefs));
    }
    setLoading(false);
  }, []);

  const handleRegionChange = (regionCode) => {
    setPreferences(prev => ({
      ...prev,
      regions: prev.regions.includes(regionCode)
        ? prev.regions.filter(r => r !== regionCode)
        : [...prev.regions, regionCode]
    }));
  };

  const handleCategoryChange = (category) => {
    setPreferences(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem('unami-preferences', JSON.stringify(preferences));
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage('✅ Preferences saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Failed to save preferences. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{textAlign: 'center', padding: '40px'}}>
        <div style={{fontSize: '2rem', marginBottom: '8px'}}>⚙️</div>
        <p style={{color: '#6b7280'}}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{marginBottom: '24px'}}>
        <h1 style={{fontSize: '1.8rem', fontWeight: 700, color: '#1f2937', marginBottom: '4px'}}>⚙️ Settings & Preferences</h1>
        <p style={{color: '#6b7280'}}>Customize your Unami Moments experience and notification preferences</p>
      </div>

      {message && (
        <div className="card" style={{
          background: message.includes('✅') ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${message.includes('✅') ? '#bbf7d0' : '#fecaca'}`,
          marginBottom: '24px'
        }}>
          <p style={{color: message.includes('✅') ? '#166534' : '#dc2626', margin: 0}}>{message}</p>
        </div>
      )}

      <div className="card" style={{marginBottom: '24px'}}>
        <h3 style={{color: '#1f2937', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'}}>
          📍 <span>Regional Preferences</span>
        </h3>
        <p style={{color: '#6b7280', marginBottom: '16px', fontSize: '14px'}}>Select the regions you're interested in receiving updates from:</p>
        
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px'}}>
          {regions.map(region => (
            <label key={region.code} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', cursor: 'pointer'}}>
              <input
                type="checkbox"
                checked={preferences.regions.includes(region.code)}
                onChange={() => handleRegionChange(region.code)}
                style={{width: '16px', height: '16px'}}
              />
              <span style={{fontSize: '14px', color: '#374151'}}>
                <strong>{region.code}</strong> - {region.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="card" style={{marginBottom: '24px'}}>
        <h3 style={{color: '#1f2937', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'}}>
          🏷️ <span>Category Preferences</span>
        </h3>
        <p style={{color: '#6b7280', marginBottom: '16px', fontSize: '14px'}}>Choose the types of content you want to receive:</p>
        
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px'}}>
          {categories.map(category => (
            <label key={category} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', cursor: 'pointer'}}>
              <input
                type="checkbox"
                checked={preferences.categories.includes(category)}
                onChange={() => handleCategoryChange(category)}
                style={{width: '16px', height: '16px'}}
              />
              <span style={{fontSize: '14px', color: '#374151'}}>{category}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="card" style={{marginBottom: '24px'}}>
        <h3 style={{color: '#1f2937', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'}}>
          🌍 <span>Language Preference</span>
        </h3>
        <select 
          value={preferences.language} 
          onChange={(e) => setPreferences(prev => ({...prev, language: e.target.value}))}
          style={{width: '100%', maxWidth: '300px', padding: '12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px'}}
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>
      </div>

      <div className="card" style={{background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '24px'}}>
        <h3 style={{color: '#166534', marginBottom: '12px'}}>📱 WhatsApp Integration</h3>
        <p style={{color: '#166534', marginBottom: '12px'}}>Message us on WhatsApp: <strong>+27 65 829 5041</strong></p>
        <p style={{fontSize: '14px', color: '#166534'}}>Send <strong>START</strong> or <strong>JOIN</strong> to subscribe</p>
      </div>

      <div style={{textAlign: 'center'}}>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{
            fontSize: '16px',
            padding: '12px 32px',
            opacity: saving ? 0.7 : 1,
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? '💾 Saving...' : '💾 Save Preferences'}
        </button>
      </div>
    </div>
  );
}

// Cookie Consent Banner - GDPR/POPIA Compliant
(function() {
  const CONSENT_KEY = 'moments_cookie_consent';
  
  function hasConsent() {
    return localStorage.getItem(CONSENT_KEY);
  }
  
  function setConsent(value) {
    localStorage.setItem(CONSENT_KEY, value);
    if (value === 'accepted' && typeof gtag === 'function') {
      gtag('consent', 'update', {
        'analytics_storage': 'granted'
      });
    }
  }
  
  function createBanner() {
    const banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.innerHTML = `
      <div style="position:fixed;bottom:0;left:0;right:0;background:#1f2937;color:white;padding:1rem;box-shadow:0 -2px 10px rgba(0,0,0,0.3);z-index:9999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
          <div style="flex:1;min-width:250px;">
            <p style="margin:0;font-size:0.875rem;line-height:1.5;">
              🍪 We use cookies to improve your experience and analyze site traffic. By clicking "Accept", you consent to our use of cookies. 
              <a href="/privacy.html" style="color:#60a5fa;text-decoration:underline;">Learn more</a>
            </p>
          </div>
          <div style="display:flex;gap:0.5rem;flex-shrink:0;">
            <button id="cookie-decline" style="background:#374151;color:white;border:none;padding:0.5rem 1rem;border-radius:0.375rem;cursor:pointer;font-size:0.875rem;font-weight:500;">
              Decline
            </button>
            <button id="cookie-accept" style="background:#2563eb;color:white;border:none;padding:0.5rem 1.5rem;border-radius:0.375rem;cursor:pointer;font-size:0.875rem;font-weight:500;">
              Accept
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(banner);
    
    document.getElementById('cookie-accept').addEventListener('click', () => {
      setConsent('accepted');
      banner.remove();
    });
    
    document.getElementById('cookie-decline').addEventListener('click', () => {
      setConsent('declined');
      banner.remove();
      if (typeof gtag === 'function') {
        gtag('consent', 'update', {
          'analytics_storage': 'denied'
        });
      }
    });
  }
  
  // Initialize consent
  if (typeof gtag === 'function') {
    gtag('consent', 'default', {
      'analytics_storage': 'denied'
    });
  }
  
  // Show banner if no consent recorded
  if (!hasConsent()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createBanner);
    } else {
      createBanner();
    }
  } else if (hasConsent() === 'accepted' && typeof gtag === 'function') {
    gtag('consent', 'update', {
      'analytics_storage': 'granted'
    });
  }
})();

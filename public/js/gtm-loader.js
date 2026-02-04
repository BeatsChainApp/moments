// GTM Loader - Dynamically loads Google Tag Manager based on admin settings
(async function() {
    try {
        // Fetch GTM settings from public endpoint
        const response = await fetch('/api/gtm-settings');
        if (!response.ok) return;
        
        const settings = await response.json();
        
        // Check if GTM is enabled and container ID exists
        if (!settings.enabled || !settings.container_id) return;
        
        // Inject GTM script
        const gtmScript = document.createElement('script');
        gtmScript.async = true;
        gtmScript.src = `https://www.googletagmanager.com/gtm.js?id=${settings.container_id}`;
        
        // Add dataLayer initialization
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            'gtm.start': new Date().getTime(),
            event: 'gtm.js'
        });
        
        document.head.appendChild(gtmScript);
        
        // Inject GTM noscript iframe
        const noscript = document.createElement('noscript');
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.googletagmanager.com/ns.html?id=${settings.container_id}`;
        iframe.height = '0';
        iframe.width = '0';
        iframe.style.display = 'none';
        iframe.style.visibility = 'hidden';
        noscript.appendChild(iframe);
        document.body.insertBefore(noscript, document.body.firstChild);
        
        // Inject custom tracking scripts if provided
        if (settings.custom_scripts) {
            const customScript = document.createElement('script');
            customScript.innerHTML = settings.custom_scripts;
            document.head.appendChild(customScript);
        }
        
        console.log('✅ GTM loaded:', settings.container_id);
    } catch (error) {
        console.warn('GTM loader failed:', error.message);
    }
})();

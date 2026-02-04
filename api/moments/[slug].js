import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { slug } = req.query;

  try {
    const { data: moment, error } = await supabase
      .from('moments')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'broadcasted')
      .single();

    if (error || !moment) {
      return res.status(404).send(generate404());
    }

    const html = generatePage(moment);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(html);
  } catch (error) {
    console.error('Moment render error:', error);
    res.status(500).send('Error loading moment');
  }
}

function generatePage(m) {
  const title = `${m.title} - ${m.region || 'National'} | Unami Foundation Moments`;
  const desc = m.content.substring(0, 155).replace(/\n/g, ' ');
  const url = `https://moments.unamifoundation.org/moments/${m.slug}`;
  
  let attr = '';
  if (m.authority_context) {
    const a = m.authority_context;
    const roleKey = (a.role || '').toLowerCase().replace(/\s+/g, '_');
    const roles = {
      community_leader: 'Community Leader',
      school_principal: 'School Principal',
      admin: 'Administrator',
      partner: 'Partner Organization'
    };
    const role = roles[roleKey] || a.role_label || a.role || 'Community Member';
    const org = a.scope_identifier || a.organization || 'Unami Foundation Moments App';
    
    attr = `<div class="attribution">
      <div class="attribution-title">📢 ${esc(role)} (Verified)</div>
      <div class="attribution-detail">🏛️ ${esc(org)}</div>
      <div class="attribution-detail">📍 ${esc(m.region || 'National')}</div>
      <div class="attribution-detail">🏷️ ${esc(m.category || 'Community')}</div>
    </div>`;
  }

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": m.title,
    "datePublished": m.broadcasted_at || m.created_at,
    "author": {"@type": "Organization", "name": "Unami Foundation Moments App"},
    "publisher": {
      "@type": "Organization",
      "name": "Unami Foundation",
      "logo": {"@type": "ImageObject", "url": "https://moments.unamifoundation.org/logo.png"}
    },
    "description": desc
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-EBBC8NZYNK"></script>
<script>
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('consent','default',{'analytics_storage':'denied'});
gtag('config','G-EBBC8NZYNK');
gtag('event','moment_view',{moment_title:'${esc(m.title)}',moment_category:'${esc(m.category)}',moment_region:'${esc(m.region)}'});
</script>
<script src="/js/cookie-consent.js" defer></script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(m.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Unami Foundation Moments App">
<meta name="twitter:card" content="summary">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#2563eb">
<script type="application/ld+json">${schema}</script>
<script src="/js/gtm-loader.js" defer></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;line-height:1.6}
.nav{background:white;box-shadow:0 2px 4px rgba(0,0,0,0.1);position:sticky;top:0;z-index:100}
.nav-container{max-width:1200px;margin:0 auto;padding:0 20px;display:flex;justify-content:space-between;align-items:center;height:60px}
.nav-logo{font-size:1.5rem;font-weight:bold;color:#2563eb;text-decoration:none;display:flex;align-items:center;gap:0.5rem}
.nav-logo img{height:24px;width:auto}
.nav-links{display:flex;gap:2rem;align-items:center}
.nav-links a{text-decoration:none;color:#374151;font-weight:500;transition:color 0.2s}
.nav-links a:hover{color:#2563eb}
.nav-toggle{display:none;background:none;border:none;font-size:1.5rem;cursor:pointer}
.container{max-width:800px;margin:0 auto;padding:1rem}
.moment-card{background:white;border-radius:1rem;padding:2rem;margin:2rem 0;box-shadow:0 4px 6px rgba(0,0,0,0.1)}
.moment-title{font-size:1.75rem;font-weight:700;margin-bottom:1rem;color:#1f2937}
.moment-meta{display:flex;gap:0.5rem;margin-bottom:1.5rem;flex-wrap:wrap}
.badge{padding:0.25rem 0.75rem;border-radius:9999px;font-size:0.75rem;font-weight:500}
.region-badge{background:#dbeafe;color:#1e40af}
.category-badge{background:#f3e8ff;color:#7c3aed}
.attribution{background:#f8fafc;border-left:4px solid #2563eb;padding:1rem;margin-bottom:1.5rem;border-radius:0.5rem}
.attribution-title{font-weight:600;color:#1f2937;margin-bottom:0.5rem}
.attribution-detail{font-size:0.875rem;color:#6b7280;margin-bottom:0.25rem}
.moment-content{color:#374151;font-size:1.125rem;line-height:1.8;margin-bottom:1.5rem;white-space:pre-wrap}
.media-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem;margin:1.5rem 0}
.media-item{position:relative;border-radius:0.5rem;overflow:hidden;background:#f3f4f6}
.media-item img{width:100%;height:auto;max-height:600px;object-fit:contain;display:block}
.download-btn{position:absolute;bottom:0.5rem;right:0.5rem;background:rgba(0,0,0,0.7);color:white;padding:0.5rem;border-radius:0.375rem;text-decoration:none;font-size:0.875rem}
.download-btn:hover{background:rgba(0,0,0,0.9)}
.moment-footer{border-top:1px solid #e5e7eb;padding-top:1.5rem;margin-top:1.5rem}
.whatsapp-cta{background:#25D366;color:white;padding:1rem 2rem;border-radius:0.5rem;text-decoration:none;display:inline-flex;align-items:center;gap:0.5rem;font-weight:500}
.whatsapp-cta:hover{background:#128C7E}
.footer{background:#1f2937;color:white;padding:60px 0 30px;text-align:center}
.footer-content{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:40px;margin-bottom:40px;text-align:left;max-width:1200px;margin:0 auto 40px;padding:0 20px}
.footer-section h4{font-size:1.2rem;margin-bottom:20px;color:#60a5fa}
.footer-section p,.footer-section a{color:#d1d5db;text-decoration:none;display:block;margin-bottom:10px}
.footer-section a:hover{color:white}
.footer-bottom{border-top:1px solid #374151;padding-top:30px;text-align:center;color:#9ca3af;max-width:1200px;margin:0 auto;padding:30px 20px 0}
@media (max-width:768px){
.nav-container{padding:0 15px}
.nav-links{display:none;position:absolute;top:100%;left:0;right:0;background:white;flex-direction:column;padding:1rem;box-shadow:0 4px 6px rgba(0,0,0,0.1)}
.nav-links.active{display:flex}
.nav-toggle{display:block}
.footer{padding:40px 0 20px}
.footer-content{text-align:center}
}
</style>
</head>
<body>
<nav class="nav">
<div class="nav-container">
<a href="/" class="nav-logo">
<img src="/logo.png" alt="Unami Foundation" onerror="this.style.display='none'">
Moments App
</a>
<div class="nav-links" id="nav-links">
<a href="/">Home</a>
<a href="/moments">Moments</a>
<a href="https://wa.me/27658295041?text=START" target="_blank">Join WhatsApp</a>
</div>
<button class="nav-toggle" id="nav-toggle">☰</button>
</div>
</nav>
<div class="container">
<div class="moment-card">
<h1 class="moment-title">${esc(m.title)}</h1>
<div class="moment-meta">
<span class="badge region-badge">📍 ${esc(m.region || 'National')}</span>
<span class="badge category-badge">🏷️ ${esc(m.category || 'Community')}</span>
</div>
${attr}
<div class="moment-content">${esc(m.content)}</div>
${m.media_urls && m.media_urls.length > 0 ? `<div class="media-gallery">${m.media_urls.map(url => `<div class="media-item"><img src="${esc(url)}" alt="Moment media" loading="lazy"><a href="${esc(url)}" download class="download-btn">📥 Save</a></div>`).join('')}</div>` : ''}
<div class="moment-footer">
<p style="color:#6b7280;margin-bottom:1rem">💬 ${m.media_urls && m.media_urls.length > 0 ? 'View photos & share your thoughts' : 'Get updates like this'}</p>
<a href="https://wa.me/27658295041?text=${encodeURIComponent('FEEDBACK: ' + m.title)}" class="whatsapp-cta" onclick="gtag('event','whatsapp_click',{event_category:'engagement',event_label:'moment_detail_cta',moment_title:'${esc(m.title)}'});">📱 ${m.media_urls && m.media_urls.length > 0 ? 'Message on WhatsApp' : 'Join on WhatsApp'}</a>
</div>
</div>
</div>
<footer class="footer">
<div class="container">
<div class="footer-content">
<div class="footer-section">
<h4>📢 Your Neighborhood Notice Board</h4>
<p>Real moments from real neighbors. Job openings, local events, safety alerts - amplified to reach who needs them.</p>
</div>
<div class="footer-section">
<h4>Get Started</h4>
<a href="https://wa.me/27658295041?text=START">💬 Send START to join</a>
<a href="https://wa.me/27658295041?text=REGIONS">📍 Choose your provinces</a>
<a href="https://wa.me/27658295041?text=HELP">❓ See all commands</a>
</div>
<div class="footer-section">
<h4>9 Provinces Connected</h4>
<p>KZN • WC • GP • EC • FS</p>
<p>LP • MP • NC • NW</p>
</div>
<div class="footer-section">
<h4>Contact</h4>
<p>WhatsApp: <a href="https://wa.me/27658295041">+27 65 829 5041</a></p>
<p>Email: info@unamifoundation.org</p>
</div>
<div class="footer-section">
<h4>Legal & Compliance</h4>
<a href="/privacy.html">Privacy Policy</a>
<a href="/terms.html">Terms of Service</a>
<a href="/about.html">About Us</a>
<a href="/subscribe.html">How to Subscribe</a>
</div>
</div>
<div class="footer-bottom">
<p>Real moments that matter, amplified. Empowering South African communities through accessible, privacy-respecting connection.</p>
<p style="margin-top:0.5rem">&copy; 2026 Unami Foundation. Proudly South African 🇿🇦</p>
</div>
</div>
</footer>
<script>
document.getElementById('nav-toggle').addEventListener('click',()=>{
document.getElementById('nav-links').classList.toggle('active');
});
document.addEventListener('click',(e)=>{
if(!e.target.closest('.nav')){
document.getElementById('nav-links').classList.remove('active');
}
});
</script>
</body>
</html>`;
}

function generate404() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Moment Not Found | Unami Foundation Moments</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;padding:3rem}h1{color:#dc2626}a{color:#2563eb;text-decoration:none}</style>
</head>
<body>
<h1>Moment Not Found</h1>
<p>This moment may have been removed or the link is incorrect.</p>
<p><a href="/">← Back to Home</a></p>
</body>
</html>`;
}

function esc(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

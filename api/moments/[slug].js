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
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;line-height:1.6}
.container{max-width:800px;margin:0 auto;padding:1rem}
.header{background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:white;padding:2rem 1rem;text-align:center}
.header h1{font-size:1.5rem;margin-bottom:0.5rem}
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
.moment-footer{border-top:1px solid #e5e7eb;padding-top:1.5rem;margin-top:1.5rem}
.whatsapp-cta{background:#25D366;color:white;padding:1rem 2rem;border-radius:0.5rem;text-decoration:none;display:inline-flex;align-items:center;gap:0.5rem;font-weight:500}
.whatsapp-cta:hover{background:#128C7E}
</style>
</head>
<body>
<div class="header">
<h1>📢 Unami Foundation Moments App</h1>
<p>Your Digital Notice Board</p>
</div>
<div class="container">
<div class="moment-card">
<h1 class="moment-title">${esc(m.title)}</h1>
<div class="moment-meta">
<span class="badge region-badge">📍 ${esc(m.region || 'National')}</span>
<span class="badge category-badge">🏷️ ${esc(m.category || 'Community')}</span>
</div>
${attr}
<div class="moment-content">${esc(m.content)}</div>
<div class="moment-footer">
<p style="color:#6b7280;margin-bottom:1rem">💬 Want to respond or get updates like this?</p>
<a href="https://wa.me/27658295041?text=START" class="whatsapp-cta">📱 Join on WhatsApp</a>
</div>
</div>
</div>
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

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  const { category } = req.query;
  const map = {education:'Education',opportunities:'Opportunity',safety:'Safety',health:'Health',events:'Events',culture:'Culture',technology:'Technology'};
  const name = map[category] || 'Community';

  try {
    const { data: moments } = await supabase.from('moments').select('slug,title,content,region,broadcasted_at').eq('status','broadcasted').eq('category',name).order('broadcasted_at',{ascending:false}).limit(20);
    const html = gen(category, name, moments || []);
    res.setHeader('Content-Type','text/html');
    res.setHeader('Cache-Control','public,s-maxage=1800,stale-while-revalidate=3600');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).send('Error loading category');
  }
}

function gen(slug, name, moments) {
  const title = `${name} Moments - South Africa | Unami Foundation`;
  const desc = `Discover ${name.toLowerCase()} opportunities, updates, and community moments across South Africa. WhatsApp-native digital notice board.`;
  const url = `https://moments.unamifoundation.org/category/${slug}`;
  const list = moments.map(m => `<div class="card"><h3><a href="/moments/${m.slug}">${e(m.title)}</a></h3><p class="meta">📍 ${e(m.region)} • ${new Date(m.broadcasted_at).toLocaleDateString()}</p><p>${e(m.content.substring(0,150))}...</p></div>`).join('');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${e(title)}</title><meta name="description" content="${e(desc)}"><link rel="canonical" href="${url}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(desc)}"><meta property="og:url" content="${url}"><link rel="manifest" href="/manifest.json"><meta name="theme-color" content="#2563eb"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;line-height:1.6}.header{background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:white;padding:3rem 1rem;text-align:center}.header h1{font-size:2rem;margin-bottom:0.5rem}.container{max-width:1000px;margin:0 auto;padding:2rem 1rem}.card{background:white;padding:1.5rem;margin-bottom:1.5rem;border-radius:0.5rem;box-shadow:0 2px 4px rgba(0,0,0,0.1)}.card h3{margin-bottom:0.5rem}.card h3 a{color:#1f2937;text-decoration:none}.card h3 a:hover{color:#2563eb}.meta{color:#6b7280;font-size:0.875rem;margin-bottom:0.5rem}.cta{background:#25D366;color:white;padding:1rem 2rem;border-radius:0.5rem;text-decoration:none;display:inline-block;margin-top:2rem}</style></head><body><div class="header"><h1>📚 ${e(name)} Moments</h1><p>Community updates and opportunities across South Africa</p></div><div class="container">${list||'<p>No moments yet in this category.</p>'}<a href="https://wa.me/27658295041?text=START" class="cta">📱 Join on WhatsApp</a></div></body></html>`;
}

function e(t) {
  if (!t) return '';
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

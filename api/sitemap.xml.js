import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    const { data: moments } = await supabase
      .from('moments')
      .select('slug, broadcasted_at, updated_at')
      .eq('status', 'broadcasted')
      .order('broadcasted_at', { ascending: false })
      .limit(1000);

    const xml = generateSitemap(moments || []);
    
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Sitemap error:', error);
    res.status(500).send('Error generating sitemap');
  }
}

function generateSitemap(moments) {
  const base = 'https://moments.unamifoundation.org';
  const now = new Date().toISOString();
  
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/about.html', priority: '0.8', changefreq: 'monthly' },
    { url: '/privacy.html', priority: '0.5', changefreq: 'monthly' },
    { url: '/terms.html', priority: '0.5', changefreq: 'monthly' },
    { url: '/subscribe.html', priority: '0.7', changefreq: 'monthly' },
    { url: '/category/education', priority: '0.9', changefreq: 'weekly' },
    { url: '/category/opportunities', priority: '0.9', changefreq: 'weekly' },
    { url: '/category/safety', priority: '0.9', changefreq: 'weekly' },
    { url: '/category/health', priority: '0.8', changefreq: 'weekly' },
    { url: '/category/events', priority: '0.8', changefreq: 'weekly' },
    { url: '/category/culture', priority: '0.8', changefreq: 'weekly' },
    { url: '/category/technology', priority: '0.8', changefreq: 'weekly' }
  ];

  let urls = staticPages.map(p => `
  <url>
    <loc>${base}${p.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('');

  urls += moments.map(m => `
  <url>
    <loc>${base}/moments/${m.slug}</loc>
    <lastmod>${m.updated_at || m.broadcasted_at}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

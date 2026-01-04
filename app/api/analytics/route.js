export async function GET(request) {
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE || 'http://localhost:8080';
    
    const res = await fetch(`${base}/admin/analytics`, {
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') && {
          'authorization': request.headers.get('authorization')
        })
      }
    });
    
    if (!res.ok) {
      throw new Error(`Backend responded with ${res.status}`);
    }
    
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    // Return default stats as fallback
    return new Response(JSON.stringify({
      moments: 0,
      subscribers: 0,
      broadcasts: 0,
      success_rate: 0
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
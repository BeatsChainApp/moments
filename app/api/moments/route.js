export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const base = process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE || 'http://localhost:8080';
    
    // Build query string from search params
    const queryString = searchParams.toString();
    const url = `${base}/admin/moments${queryString ? `?${queryString}` : ''}`;
    
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        // Forward any auth headers if present
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
    console.error('Moments API error:', error);
    // Return empty array as fallback
    return new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const base = process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE || 'http://localhost:8080';
    
    const res = await fetch(`${base}/admin/moments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') && {
          'authorization': request.headers.get('authorization')
        })
      },
      body: JSON.stringify(body)
    });
    
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Moments POST error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create moment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

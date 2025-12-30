// Add to server.js after health endpoint
app.get('/test-supabase', async (req, res) => {
  try {
    const { data, error } = await supabase.from('messages').select('count').limit(1);
    if (error) throw error;
    res.json({ status: 'supabase_connected', data });
  } catch (err) {
    res.json({ status: 'supabase_failed', error: err.message });
  }
});

app.get('/test-mcp', async (req, res) => {
  try {
    const testData = {
      message: 'test',
      language: 'eng',
      media_type: 'text',
      from_number: '27123456789',
      timestamp: new Date().toISOString()
    };
    const advisory = await callMCPAdvisory({ id: 'test', ...testData });
    res.json({ status: 'mcp_working', advisory });
  } catch (err) {
    res.json({ status: 'mcp_failed', error: err.message });
  }
});
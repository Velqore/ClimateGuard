(async () => {
  try {
    const body = {
      message: 'Please call tool: {"tool":"get_risk_data","arguments":{"city":"Tokyo"}}'
    };

    const res = await fetch('http://localhost:3000/api/mcp/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const j = await res.json();
    console.log(JSON.stringify({ ok: res.ok, status: res.status, body: j }, null, 2));
  } catch (err) {
    console.error('TEST ERROR', err);
    process.exit(1);
  }
})();

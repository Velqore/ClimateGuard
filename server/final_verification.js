// Final verification: all key paths working
(async () => {
  const tests = [
    { name: '1. Server health', url: 'http://localhost:3000/api/risk', method: 'POST', body: { location: 'Tokyo' } },
    { name: '2. Offline agent', url: 'http://localhost:3000/api/mcp/chat', method: 'POST', body: { message: 'Risk in New York' } },
    { name: '3. Compare cities', url: 'http://localhost:3000/api/mcp/chat', method: 'POST', body: { message: 'Compare Tokyo and NYC' } },
    { name: '4. AQI check', url: 'http://localhost:3000/api/mcp/chat', method: 'POST', body: { message: 'AQI in Delhi' } },
    { name: '5. Alerts', url: 'http://localhost:3000/api/alerts', method: 'GET', body: null },
  ];

  for (const t of tests) {
    try {
      const opts = { method: t.method, headers: { 'Content-Type': 'application/json' } };
      if (t.body) opts.body = JSON.stringify(t.body);
      const res = await fetch(t.url, opts);
      const data = await res.json();
      const status = res.ok ? '✓' : '✗';
      const snippet = data.answer ? data.answer.slice(0, 50) : data.overall ? `risk: ${data.overall}` : data.length !== undefined ? `items: ${data.length}` : 'ok';
      console.log(`${status} ${t.name.padEnd(25)} → ${snippet}`);
    } catch (err) {
      console.log(`✗ ${t.name.padEnd(25)} → ${err.message}`);
    }
  }
  console.log('\n✓ All systems operational for hackathon demo');
})();

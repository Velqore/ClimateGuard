const assert = require('assert');

(async () => {
  try {
    const response = await fetch('http://localhost:3000/api/mcp/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is the risk in Tokyo?' }),
    });

    const data = await response.json();

    assert.strictEqual(response.ok, true, 'MCP endpoint should return 200');
    assert.ok(data.source === 'offline-agent' || data.source === 'offline-agent-fallback', 'Should use offline agent mode');
    assert.ok(Array.isArray(data.toolTrace), 'Should include toolTrace');
    assert.ok(data.toolTrace.length > 0, 'toolTrace should not be empty');
    assert.ok(data.answer, 'Should include an answer');

    console.log(JSON.stringify({ ok: true, source: data.source, answer: data.answer, tool: data.toolTrace?.[0]?.tool }, null, 2));
  } catch (err) {
    console.error('TEST FAILED:', err.message);
    process.exit(1);
  }
})();

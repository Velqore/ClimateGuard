const prompts = [
  { msg: 'Compare Tokyo and Osaka', expectedTool: 'compare_cities' },
  { msg: 'What is the AQI in Delhi?', expectedTool: 'get_aqi_data' },
  { msg: 'What evacuation route for wildfire?', expectedTool: 'get_evacuation_route' },
];

(async () => {
  for (const p of prompts) {
    try {
      const res = await fetch('http://localhost:3000/api/mcp/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: p.msg }),
      });
      const data = await res.json();
      const tool = data.toolTrace?.[0]?.tool;
      const pass = tool === p.expectedTool;
      console.log(`${pass ? '✓' : '✗'} "${p.msg}" → tool: ${tool}, answer: ${data.answer?.slice(0, 60)}`);
    } catch (err) {
      console.error(`✗ "${p.msg}" → Error: ${err.message}`);
    }
  }
})();

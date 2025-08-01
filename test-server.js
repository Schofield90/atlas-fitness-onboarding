const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Test Server Working!</h1><p>If you can see this, localhost is working.</p>');
});

const port = 9999;
server.listen(port, '0.0.0.0', () => {
  console.log(`Test server running at:`);
  console.log(`  - http://localhost:${port}`);
  console.log(`  - http://127.0.0.1:${port}`);
  console.log(`  - http://0.0.0.0:${port}`);
  console.log('\nPress Ctrl+C to stop');
});
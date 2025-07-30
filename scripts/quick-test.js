#!/usr/bin/env node

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const [endpoint = '/api/health', method = 'GET', bodyFile] = process.argv.slice(2);

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
let baseUrl = 'http://localhost:3000';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const appUrlMatch = envContent.match(/NEXT_PUBLIC_APP_URL=(.+)/);
  if (appUrlMatch) {
    baseUrl = appUrlMatch[1].trim();
  }
}

// Check if running locally
const isLocal = baseUrl.includes('localhost');

// Build request options
const url = new URL(endpoint, baseUrl);
const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname + url.search,
  method: method.toUpperCase(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Load body from file if provided
let bodyData = null;
if (bodyFile && fs.existsSync(bodyFile)) {
  bodyData = fs.readFileSync(bodyFile, 'utf-8');
  options.headers['Content-Length'] = Buffer.byteLength(bodyData);
}

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

console.log(`${colors.cyan}🧪 Testing API Endpoint${colors.reset}`);
console.log(`${colors.blue}URL: ${colors.reset}${baseUrl}${endpoint}`);
console.log(`${colors.blue}Method: ${colors.reset}${method}`);
if (bodyData) {
  console.log(`${colors.blue}Body: ${colors.reset}${bodyData}`);
}
console.log('');

// Make the request
const startTime = Date.now();
const protocol = url.protocol === 'https:' ? https : http;

const req = protocol.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const duration = Date.now() - startTime;
    
    // Print response info
    console.log(`${colors.bright}Response:${colors.reset}`);
    console.log(`${colors.yellow}Status: ${colors.reset}${res.statusCode} ${res.statusMessage}`);
    console.log(`${colors.yellow}Duration: ${colors.reset}${duration}ms`);
    console.log(`${colors.yellow}Headers: ${colors.reset}`);
    
    Object.entries(res.headers).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    console.log('');
    
    // Try to parse as JSON
    try {
      const json = JSON.parse(data);
      console.log(`${colors.green}Body (JSON):${colors.reset}`);
      console.log(JSON.stringify(json, null, 2));
    } catch {
      console.log(`${colors.green}Body (Text):${colors.reset}`);
      console.log(data);
    }
    
    // Color code based on status
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`\n${colors.green}✅ Success${colors.reset}`);
    } else if (res.statusCode >= 400) {
      console.log(`\n${colors.red}❌ Error${colors.reset}`);
    } else {
      console.log(`\n${colors.yellow}⚠️  Status: ${res.statusCode}${colors.reset}`);
    }
  });
});

req.on('error', (error) => {
  console.error(`${colors.red}❌ Request failed:${colors.reset}`, error.message);
  
  if (isLocal) {
    console.log(`\n${colors.yellow}💡 Tip: Make sure your dev server is running with 'npm run dev'${colors.reset}`);
  }
});

// Set timeout
req.setTimeout(30000, () => {
  req.destroy();
  console.error(`${colors.red}❌ Request timeout after 30 seconds${colors.reset}`);
});

// Send body if provided
if (bodyData) {
  req.write(bodyData);
}

req.end();
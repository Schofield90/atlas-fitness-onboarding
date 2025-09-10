#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_2682c8999a59f1baae07d2f6a87e5e9637685ef3';
const PROJECT_REF = 'lzlrojoaxrqvmhempnkn';

async function runSQL(sqlContent) {
  const data = JSON.stringify({
    query: sqlContent
  });

  const options = {
    hostname: 'api.supabase.com',
    port: 443,
    path: `/v1/projects/${PROJECT_REF}/database/query`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let response = '';
      
      res.on('data', (chunk) => {
        response += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('SQL executed successfully');
          resolve(JSON.parse(response));
        } else {
          console.error(`Error: ${res.statusCode}`);
          reject(new Error(response));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Read SQL file from command line argument
const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Usage: node run-remote-sql.js <sql-file>');
  process.exit(1);
}

const sqlContent = fs.readFileSync(path.resolve(sqlFile), 'utf8');

runSQL(sqlContent)
  .then(result => {
    console.log('Result:', JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error('Failed to execute SQL:', error);
    process.exit(1);
  });
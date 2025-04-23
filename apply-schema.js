#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

// Check if required environment variables are set
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your .env file.');
  process.exit(1);
}

// Read the schema.sql file
const schemaPath = path.join(__dirname, 'supabase', 'schema.sql');
if (!fs.existsSync(schemaPath)) {
  console.error(`Error: Schema file not found at ${schemaPath}`);
  process.exit(1);
}

const schemaSql = fs.readFileSync(schemaPath, 'utf8');

// Function to execute SQL via Supabase REST API
async function executeSql(sql) {
  return new Promise((resolve, reject) => {
    // Parse the URL to get hostname and path
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`Request failed with status code ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(JSON.stringify({ query: sql }));
    req.end();
  });
}

// Main function
async function main() {
  console.log('Applying schema.sql to your Supabase project...');
  
  try {
    const result = await executeSql(schemaSql);
    console.log('Schema applied successfully!');
    console.log(result);
  } catch (error) {
    console.error('Error applying schema:', error.message);
    process.exit(1);
  }
}

main();

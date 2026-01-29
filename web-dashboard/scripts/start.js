#!/usr/bin/env node

/**
 * Cross-platform startup script for Next.js
 * Reads SERVICE_PORT from .env and passes it to Next.js
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load .env file
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      if (key && value !== undefined) {
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

// Generate client-side environment config
// This creates src/config/client-env.ts from CONFIG_* variables
const generateEnvScript = path.join(__dirname, 'generate-client-env.js');
if (fs.existsSync(generateEnvScript)) {
  try {
    execSync(`node "${generateEnvScript}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to generate client env config:', err.message);
  }
}

// Get command (dev or start)
const command = process.argv[2] || 'start';

// Get port from SERVICE_PORT or default (3001 for dashboard)
const port = process.env.SERVICE_PORT || '3001';

console.log(`Starting Next.js in ${command} mode on port ${port}...`);

// Build args
const args = command === 'dev'
  ? ['next', 'dev', '-p', port]
  : ['next', 'start', '-p', port];

// Spawn npx with Next.js
const isWindows = process.platform === 'win32';
const npx = isWindows ? 'npx.cmd' : 'npx';

const child = spawn(npx, args, {
  stdio: 'inherit',
  shell: isWindows,
  env: process.env
});

child.on('error', (err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});

child.on('close', (code) => {
  process.exit(code || 0);
});

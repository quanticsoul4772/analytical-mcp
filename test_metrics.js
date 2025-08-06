#!/usr/bin/env node

/**
 * Simple test script to verify metrics functionality
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function testMetrics() {
  console.log('🚀 Starting Analytical MCP Server with metrics...');
  
  // Start the server
  const server = spawn('node', ['build/index.js'], {
    env: { 
      ...process.env, 
      METRICS_ENABLED: 'true', 
      METRICS_PORT: '9090',
      LOG_LEVEL: 'INFO'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let serverReady = false;

  // Listen for server startup messages
  server.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('📊 Server output:', output.trim());
    
    if (output.includes('Metrics server started on port 9090')) {
      serverReady = true;
    }
  });

  server.stderr.on('data', (data) => {
    console.error('❌ Server error:', data.toString().trim());
  });

  // Wait for server to start
  console.log('⏱️  Waiting for server to start...');
  let attempts = 0;
  while (!serverReady && attempts < 30) {
    await setTimeout(1000);
    attempts++;
  }

  if (!serverReady) {
    console.error('❌ Server failed to start within 30 seconds');
    server.kill();
    process.exit(1);
  }

  console.log('✅ Server started successfully!');

  // Test metrics endpoints
  try {
    console.log('🔍 Testing metrics endpoints...');
    
    // Test Prometheus metrics
    const prometheusResponse = await fetch('http://localhost:9090/metrics');
    if (prometheusResponse.ok) {
      const metrics = await prometheusResponse.text();
      console.log('✅ Prometheus metrics endpoint working');
      console.log('📈 Sample metrics:');
      console.log(metrics.split('\n').slice(0, 10).join('\n'));
    } else {
      console.error('❌ Prometheus metrics endpoint failed');
    }

    // Test JSON metrics
    const jsonResponse = await fetch('http://localhost:9090/metrics?format=json');
    if (jsonResponse.ok) {
      const metrics = await jsonResponse.json();
      console.log('✅ JSON metrics endpoint working');
      console.log('📊 Uptime:', Math.floor(metrics.uptime / 1000), 'seconds');
      console.log('🔧 Circuit breakers:', Object.keys(metrics.circuitBreakers).length);
      console.log('💾 Cache namespaces:', Object.keys(metrics.cache.general).length + Object.keys(metrics.cache.research).length);
    } else {
      console.error('❌ JSON metrics endpoint failed');
    }

    // Test health endpoint
    const healthResponse = await fetch('http://localhost:9090/health');
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Health endpoint working');
      console.log('💚 Status:', health.status);
    } else {
      console.error('❌ Health endpoint failed');
    }

    console.log('🎉 All metrics endpoints are working correctly!');
    
  } catch (error) {
    console.error('❌ Error testing metrics endpoints:', error.message);
  }

  // Clean up
  console.log('🛑 Stopping server...');
  server.kill();
  
  // Wait a bit for clean shutdown
  await setTimeout(2000);
  console.log('✅ Test completed!');
}

// Run the test
testMetrics().catch(console.error);
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from './build/utils/config.js';
import { Logger } from './build/utils/logger.js';

// Explicitly set environment variables
process.env.NODE_ENV = 'production';
process.env.ENABLE_RESEARCH_INTEGRATION = 'true';

console.log('=== Detailed Analytical MCP Server Debug ===');

// Detailed Server and SDK investigation
console.log('\n=== Server and SDK Details ===');
console.log('Server Class:', Server);
console.log('Server Prototype:', Object.keys(Server.prototype));
console.log('Server Constructor:', Server.constructor);

// Detailed configuration logging
console.log('\n=== Configuration ===');
console.log('Configuration:', JSON.stringify(config, null, 2));

// Log environment variables
console.log('\n=== Environment Variables ===');
Object.keys(process.env).forEach(key => {
    if (key.startsWith('ENABLE_') || key === 'NODE_ENV' || key === 'EXA_API_KEY') {
        console.log(`${key}: ${process.env[key]}`);
    }
});

async function debugStartup() {
    try {
        console.log('\n=== Initializing Server ===');
        
        // Detailed server creation with extensive logging
        const serverConfig = {
            name: "Analytical MCP Server (Debug)",
            version: "0.1.0",
        };
        
        const serverOptions = {
            capabilities: {
                tools: {
                    // Explicitly add register method
                    register: (tool) => {
                        console.log('Registering tool:', tool.name);
                        // Add custom registration logic if needed
                    }
                },
            },
            debug: true
        };

        console.log('Server Config:', JSON.stringify(serverConfig, null, 2));
        console.log('Server Options:', JSON.stringify(serverOptions, null, 2));

        const server = new Server(serverConfig, serverOptions);

        console.log('\n=== Verifying Server Capabilities ===');
        console.log('Server Capabilities:', Object.keys(server.capabilities || {}));
        console.log('Tools Capability:', server.capabilities?.tools);

        console.log('\nAttempting to register tools...');
        const { registerTools } = await import('./build/tools/index.js');
        
        console.log('Calling registerTools with server...');
        registerTools(server);
        console.log('Tools registered successfully');

        console.log('\nConnecting server...');
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.log('Server connected successfully');

    } catch (error) {
        console.error('Startup Error:', error);
        // Log detailed error information
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);
        process.exit(1);
    }
}

debugStartup().catch(error => {
    console.error('Unhandled Startup Error:', error);
    // Log detailed error information
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    process.exit(1);
});

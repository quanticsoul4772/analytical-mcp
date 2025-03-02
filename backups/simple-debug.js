#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

async function simpleDebug() {
    try {
        console.log('Creating server...');
        
        // Create a customized tools capability manager
        const toolsCapability = {
            registeredTools: [],
            register: function(tool) {
                console.log(`CUSTOM REGISTER: Adding tool ${tool.name}`);
                this.registeredTools.push(tool);
                return this;
            },
            list: function() {
                return this.registeredTools.map(tool => tool.name);
            },
            call: function(toolName, args) {
                const tool = this.registeredTools.find(t => t.name === toolName);
                if (!tool) throw new Error(`Tool ${toolName} not found`);
                return tool.handler(args);
            }
        };

        // Create server with basic capabilities
        const server = new Server(
            {
                name: "Analytical MCP Server",
                version: "0.1.0",
            }, 
            {
                capabilities: {
                    logging: true,
                    resources: false,
                    sampling: false,
                    tools: toolsCapability
                },
                debug: true
            }
        );

        // Explicitly set the tools capability on the server object
        server.tools = toolsCapability;

        console.log('Server instance created');
        
        // Register a test tool directly
        console.log('Registering test tool...');
        server.tools.register({
            name: "test_tool",
            description: "A test tool",
            schema: { type: "object", properties: {} },
            handler: () => ({ result: "Test successful" })
        });
        
        // Log registered tools
        console.log('Registered Tools:', server.tools.list());
        
        // Log capabilities
        console.log('Server Capabilities:', 
            JSON.stringify(server.getCapabilities(), null, 2)
        );
        
        console.log('Debug complete');
    } catch (error) {
        console.error('Debug Error:', error);
        console.error('Error Details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
    }
}

simpleDebug().catch(error => {
    console.error('Unhandled Error:', error);
});

#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from './build/utils/config.js';
import { Logger } from './build/utils/logger.js';

// Explicitly set environment variables
process.env.NODE_ENV = 'production';
process.env.ENABLE_RESEARCH_INTEGRATION = 'true';

async function debugStartup() {
    try {
        console.log('Creating server with capabilities...');
        
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
        // This ensures it's accessible to the registerTools function
        server.tools = toolsCapability;

        console.log('Server instance created');
        
        // Log initial capabilities
        console.log('Initial Server Capabilities:');
        try {
            const capabilities = server.getCapabilities();
            console.log(JSON.stringify(capabilities, null, 2));
        } catch (error) {
            console.log('Error serializing capabilities:', error.message);
            console.log('Capabilities:', server.capabilities);
        }

        // Import and register tools
        console.log('Importing registerTools...');
        const { registerTools } = await import('./build/tools/index.js');
        
        // Detailed error handling for tool registration
        try {
            console.log('Calling registerTools...');
            registerTools(server);
            console.log('Tool registration completed successfully');
            
            // Log capabilities after tool registration
            let capabilitiesAfterRegistration;
            console.log('Server Capabilities After Registration:');
            try {
                capabilitiesAfterRegistration = server.getCapabilities();
                console.log(JSON.stringify(capabilitiesAfterRegistration, null, 2));
            } catch (error) {
                console.log('Error serializing capabilities:', error.message);
                console.log('Capabilities:', server.capabilities);
                // Use server.capabilities as fallback
                capabilitiesAfterRegistration = server.capabilities;
            }

            // Log registered tools
            try {
                const registeredTools = server.tools?.list 
                    ? server.tools.list() 
                    : 'No tools list method';
                console.log('Registered Tools:', registeredTools);

                // Manually verify tools
                if (server.tools?.registeredTools) {
                    console.log('Registered Tools Details:');
                    server.tools.registeredTools.forEach(tool => {
                        console.log(`- ${tool.name}: ${tool.description}`);
                    });
                }
            } catch (error) {
                console.log('Error listing tools:', error.message);
            }
        } catch (registrationError) {
            console.error('DETAILED Tool Registration Error:');
            console.error('Error Name:', registrationError.name);
            console.error('Error Message:', registrationError.message);
            console.error('Error Stack:', registrationError.stack);
            throw registrationError;
        }

        // Connect server
        console.log('Creating stdio transport...');
        const transport = new StdioServerTransport();
        
        console.log('Connecting server...');
        await server.connect(transport);
        
        console.log('Server startup complete');
    } catch (error) {
        console.error('TOP-LEVEL Startup Error:', error);
        console.error('Error Details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
}

debugStartup().catch(error => {
    console.error('Unhandled Startup Error:', error);
    process.exit(1);
});

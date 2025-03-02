#!/usr/bin/env node
import fs from 'fs';

function hexDump(str) {
    return str.split('').map(char => {
        const hex = char.charCodeAt(0).toString(16).padStart(2, '0');
        return `\\x${hex}`;
    }).join(' ');
}

function debugJSONParsing(jsonString) {
    console.log('=== JSON Parsing Debug ===');
    console.log('Raw JSON String Length:', jsonString.length);
    console.log('First 50 characters:', JSON.stringify(jsonString.slice(0, 50)));
    console.log('Hex Dump of First 50 Characters:', hexDump(jsonString.slice(0, 50)));
    console.log('Character Codes:', jsonString.slice(0, 50).split('').map(char => char.charCodeAt(0)));
    
    // Check for BOM or hidden characters
    const hasBOM = jsonString.charCodeAt(0) === 0xFEFF;
    console.log('Has Byte Order Mark (BOM):', hasBOM);

    try {
        // Try parsing with different methods
        console.log('\n=== Parsing Attempts ===');
        
        console.log('JSON.parse():');
        const parsed = JSON.parse(jsonString);
        console.log('Parsing successful');
        console.log('Parsed result:', JSON.stringify(parsed, null, 2));
    } catch (error) {
        console.error('Parsing Error:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });

        // Try to isolate the problematic area
        console.log('\n=== Error Isolation ===');
        for (let i = 0; i < jsonString.length; i++) {
            try {
                JSON.parse(jsonString.slice(0, i));
            } catch (partialError) {
                console.log(`Parsing fails at index ${i}`);
                console.log('Problematic substring:', JSON.stringify(jsonString.slice(0, i)));
                console.log('Error message:', partialError.message);
                break;
            }
        }
    }
}

// Read the configuration file
const configPath = process.argv[2] || 'path/to/your/config.json';
const configContent = fs.readFileSync(configPath, 'utf8');
debugJSONParsing(configContent);

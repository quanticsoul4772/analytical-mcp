#!/usr/bin/env node
import fs from 'fs';

function hexDump(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
}

function analyzeFile(filePath) {
    console.log(`=== Analyzing file: ${filePath} ===`);
    
    // Read as buffer to see exact bytes
    const buffer = fs.readFileSync(filePath);
    console.log('File size:', buffer.length, 'bytes');
    console.log('Hex dump of first 50 bytes:', hexDump(buffer.slice(0, 50)));
    
    // Check for BOM or hidden characters
    const hasBOM = buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
    console.log('Has UTF-8 BOM:', hasBOM);
    
    // Try parsing with different methods
    const encodings = ['utf8', 'utf16le', 'ascii', 'latin1'];
    
    encodings.forEach(encoding => {
        console.log(`\nParsing with ${encoding} encoding:`);
        try {
            const content = fs.readFileSync(filePath, encoding);
            const parsed = JSON.parse(content);
            console.log('Parsing successful');
            console.log('Parsed result:', JSON.stringify(parsed, null, 2));
        } catch (error) {
            console.error('Parsing error:', error.message);
        }
    });
}

const filesToCheck = [
    'C:\\Users\\rbsmi\\AppData\\Roaming\\Claude\\mcp_servers.json',
    'C:\\Users\\rbsmi\\AppData\\Roaming\\Claude\\claude_desktop_config.json'
];

filesToCheck.forEach(analyzeFile);

#!/usr/bin/env node
import fs from 'fs';

function debugJSONParsing(configPath) {
    console.log('=== Precise JSON Parsing Debug ===');
    
    // Read file with different encodings
    const encodings = ['utf8', 'utf16le', 'latin1'];
    
    encodings.forEach(encoding => {
        console.log(`\nTrying encoding: ${encoding}`);
        try {
            const rawContent = fs.readFileSync(configPath, encoding);
            
            console.log('Raw content first 20 bytes:', 
                rawContent.slice(0, 20)
                    .split('')
                    .map(char => `0x${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
                    .join(' ')
            );
            
            const parsed = JSON.parse(rawContent);
            console.log('Parsing successful with', encoding);
        } catch (error) {
            console.error(`Parsing failed with ${encoding}:`, error.message);
        }
    });
}

const configPath = process.argv[2] || 'path/to/config.json';
debugJSONParsing(configPath);

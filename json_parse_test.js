import { readFileSync } from 'fs';

function debugJSONParsing(jsonString) {
    console.log('First 20 characters:', JSON.stringify(jsonString.slice(0, 20)));
    console.log('Character codes:', jsonString.slice(0, 20).split('').map(char => char.charCodeAt(0)));
    
    try {
        const parsed = JSON.parse(jsonString);
        console.log('Parsing successful');
    } catch (error) {
        console.error('Parsing Error:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
    }
}

// Read the configuration file
const configPath = process.argv[2] || 'path/to/your/config.json';
const configContent = readFileSync(configPath, 'utf8');
debugJSONParsing(configContent);

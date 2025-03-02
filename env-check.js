console.log('Node.js Environment Variable Check');
console.log('Process Environment:');
console.log(JSON.stringify(process.env, null, 2));

const requiredVars = ['EXA_API_KEY', 'ENABLE_RESEARCH_INTEGRATION', 'ENABLE_RESEARCH_CACHE'];
console.log('\nRequired Variables:');
requiredVars.forEach(varName => {
    console.log(`${varName}: ${process.env[varName] || 'NOT SET'}`);
});

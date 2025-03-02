#!/usr/bin/env node

/**
 * Cache Management Utility
 * 
 * A command-line tool for managing the cache in the Analytical MCP server.
 * 
 * Usage:
 *   node tools/cache-manager.js <command> [options]
 * 
 * Commands:
 *   stats              Show cache statistics
 *   clear              Clear all caches
 *   clear <namespace>  Clear a specific cache namespace
 *   preload            Preload cache from disk
 */

import dotenv from 'dotenv';
import { cacheManager } from '../build/utils/cache_manager.js';
import { researchCache, ResearchCacheNamespace } from '../build/utils/research_cache.js';
import { config } from '../build/utils/config.js';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';
const options = args.slice(1);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Define available namespaces
const namespaces = Object.values(ResearchCacheNamespace);
const availableNamespaces = namespaces.map(ns => ns.replace('research:', ''));

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper function to format time
function formatTime(timestamp) {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  return date.toLocaleString();
}

// Helper function to calculate cache directory size
async function getCacheDirectorySize() {
  const cacheDir = config.CACHE_DIR;
  
  try {
    let totalSize = 0;
    
    const files = await fs.promises.readdir(cacheDir);
    
    for (const file of files) {
      if (file.startsWith('cache_')) {
        const stats = await fs.promises.stat(path.join(cacheDir, file));
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    return 0;
  }
}

// Helper function to list cache files
async function listCacheFiles() {
  const cacheDir = config.CACHE_DIR;
  
  try {
    const files = await fs.promises.readdir(cacheDir);
    const cacheFiles = files.filter(f => f.startsWith('cache_'));
    
    const fileDetails = [];
    
    for (const file of cacheFiles) {
      const stats = await fs.promises.stat(path.join(cacheDir, file));
      
      fileDetails.push({
        name: file,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      });
    }
    
    return fileDetails;
  } catch (error) {
    return [];
  }
}

// Check if caching is enabled
function checkCachingEnabled() {
  if (config.ENABLE_RESEARCH_CACHE !== 'true') {
    console.warn("\n⚠️ Warning: Research caching is disabled in the environment.");
    console.log("To enable caching, set ENABLE_RESEARCH_CACHE=true in your .env file.");
    return false;
  }
  return true;
}

// Show cache statistics
async function showStats() {
  console.log("\n=== CACHE STATISTICS ===\n");
  
  if (!checkCachingEnabled()) {
    return;
  }
  
  // Calculate size of cache directory
  const diskSize = await getCacheDirectorySize();
  
  // Get cache file details
  const cacheFiles = await listCacheFiles();
  const fileCount = cacheFiles.length;
  
  // Print cache files if requested
  if (options.includes('--files')) {
    console.log(`Cache Files (${fileCount}):`);
    console.log("┌───────────────────────────────────┬──────────┬─────────────────────────┐");
    console.log("│ Filename                          │ Size     │ Last Modified           │");
    console.log("├───────────────────────────────────┼──────────┼─────────────────────────┤");
    
    for (const file of cacheFiles.slice(0, 20)) { // Limit to 20 files for display
      const fileName = file.name.length > 30 ? file.name.substring(0, 27) + "..." : file.name.padEnd(35);
      console.log(`│ ${fileName} │ ${formatBytes(file.size).padEnd(8)} │ ${formatTime(file.modified)} │`);
    }
    
    if (cacheFiles.length > 20) {
      console.log(`│ ... and ${cacheFiles.length - 20} more files             │          │                         │`);
    }
    
    console.log("└───────────────────────────────────┴──────────┴─────────────────────────┘");
    console.log();
  }
  
  // Get namespaces statistics
  const stats = researchCache.getStats();
  
  console.log("Cache Namespaces:");
  console.log("┌───────────────────────┬──────┬──────┬──────┬──────────┬───────────────────┐");
  console.log("│ Namespace             │ Size │ Hits │ Miss │ Evictions│ Last Hit          │");
  console.log("├───────────────────────┼──────┼──────┼──────┼──────────┼───────────────────┤");
  
  for (const namespace of namespaces) {
    const ns = namespace.replace('research:', '').padEnd(21);
    const stat = stats[namespace] || { size: 0, hits: 0, misses: 0, evictions: 0, newestEntry: null };
    
    console.log(`│ ${ns} │ ${String(stat.size).padEnd(4)} │ ${String(stat.hits).padEnd(4)} │ ${String(stat.misses).padEnd(4)} │ ${String(stat.evictions).padEnd(8)} │ ${formatTime(stat.newestEntry).padEnd(17)} │`);
  }
  
  console.log("└───────────────────────┴──────┴──────┴──────┴──────────┴───────────────────┘");
  
  // Print summary
  console.log("\nCache Summary:");
  console.log(`  Total Memory Cache Entries: ${cacheManager.size()}`);
  console.log(`  Total Disk Cache Files: ${fileCount}`);
  console.log(`  Total Disk Cache Size: ${formatBytes(diskSize)}`);
  console.log(`  Cache Directory: ${path.resolve(config.CACHE_DIR)}`);
  console.log(`  Persistent Cache: ${config.CACHE_PERSISTENT === 'true' ? 'Enabled' : 'Disabled'}`);
  
  // Print TTL settings
  console.log("\nCache TTL Settings:");
  console.log(`  Default TTL: ${formatTime(Date.now() - parseInt(config.CACHE_DEFAULT_TTL))} to ${formatTime(Date.now())}`);
  console.log(`  Search TTL: ${(parseInt(config.CACHE_TTL_SEARCH) / 3600000).toFixed(1)} hours`);
  console.log(`  Facts TTL: ${(parseInt(config.CACHE_TTL_FACTS) / 3600000).toFixed(1)} hours`);
  console.log(`  Validation TTL: ${(parseInt(config.CACHE_TTL_VALIDATION) / 3600000).toFixed(1)} hours`);
  console.log(`  Cross-Domain TTL: ${(parseInt(config.CACHE_TTL_CROSS_DOMAIN) / 3600000).toFixed(1)} hours`);
}

// Clear cache
function clearCache() {
  if (!checkCachingEnabled()) {
    return;
  }
  
  const targetNamespace = options[0];
  
  if (!targetNamespace) {
    // Clear all caches
    rl.question("\n⚠️ Are you sure you want to clear ALL caches? This cannot be undone. (y/N): ", async (answer) => {
      if (answer.toLowerCase() === 'y') {
        researchCache.clearAll();
        console.log("✅ All caches cleared successfully.");
        
        // Also clear disk cache if requested
        if (options.includes('--disk')) {
          try {
            const cacheFiles = await listCacheFiles();
            for (const file of cacheFiles) {
              await fs.promises.unlink(path.join(config.CACHE_DIR, file.name));
            }
            console.log(`✅ Removed ${cacheFiles.length} cache files from disk.`);
          } catch (error) {
            console.error(`❌ Error clearing disk cache: ${error.message}`);
          }
        }
      } else {
        console.log("❌ Operation cancelled.");
      }
      rl.close();
    });
  } else {
    // Clear specific namespace
    const namespace = targetNamespace.toLowerCase();
    
    if (!availableNamespaces.includes(namespace)) {
      console.error(`❌ Invalid namespace: ${namespace}`);
      console.log(`Available namespaces: ${availableNamespaces.join(', ')}`);
      rl.close();
      return;
    }
    
    const fullNamespace = `research:${namespace}`;
    
    rl.question(`\n⚠️ Are you sure you want to clear the "${namespace}" cache? (y/N): `, (answer) => {
      if (answer.toLowerCase() === 'y') {
        researchCache.clear(fullNamespace);
        console.log(`✅ Cache namespace "${namespace}" cleared successfully.`);
      } else {
        console.log("❌ Operation cancelled.");
      }
      rl.close();
    });
  }
}

// Preload cache
async function preloadCache() {
  if (!checkCachingEnabled()) {
    rl.close();
    return;
  }
  
  console.log("\n🔄 Preloading cache from disk...");
  
  try {
    const loadedEntries = await cacheManager.preload();
    console.log(`✅ Loaded ${loadedEntries} cache entries from disk.`);
    
    // Show stats after preloading
    await showStats();
  } catch (error) {
    console.error(`❌ Error preloading cache: ${error.message}`);
  }
  
  rl.close();
}

// Show help
function showHelp() {
  console.log(`
Cache Manager Utility
=====================

A command-line tool for managing the cache in the Analytical MCP server.

Usage:
  node tools/cache-manager.js <command> [options]

Commands:
  stats              Show cache statistics
  stats --files      Show cache statistics with file listing
  clear              Clear all caches
  clear --disk       Clear all caches including disk cache
  clear <namespace>  Clear a specific cache namespace
  preload            Preload cache from disk
  help               Show this help message

Available Namespaces:
  ${availableNamespaces.join(', ')}

Examples:
  node tools/cache-manager.js stats
  node tools/cache-manager.js clear search
  node tools/cache-manager.js preload
  `);
  
  rl.close();
}

// Execute command
switch (command) {
  case 'stats':
    await showStats();
    rl.close();
    break;
  case 'clear':
    clearCache();
    break;
  case 'preload':
    await preloadCache();
    break;
  case 'help':
  default:
    showHelp();
    break;
}

#!/bin/bash

# Analytical MCP Server - Test Runner
# Consolidated test script for all integration and unit tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run a test with status reporting
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "${YELLOW}Running $test_name...${NC}"
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_name passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        return 1
    fi
}

# Available test suites
case "${1:-all}" in
    "api-keys")
        run_test "API Key Tests" "npm run test:api-keys"
        ;;
    "server")
        run_test "Server Tests" "npm run test:server"
        ;;
    "integration")
        run_test "Integration Tests" "npm run test:integration"
        ;;
    "exa")
        run_test "Exa Research Tests" "npm run test:exa"
        ;;
    "research")
        run_test "Research Tests" "npm run test:research"
        ;;
    "data-pipeline")
        run_test "Data Pipeline Tests" "npm run test:data-pipeline"
        ;;
    "market-analysis")
        run_test "Market Analysis Tests" "npm run test:market-analysis"
        ;;
    "all")
        echo -e "${YELLOW}Running all test suites...${NC}"
        
        run_test "API Key Tests" "npm run test:api-keys"
        run_test "Server Tests" "npm run test:server" 
        run_test "Integration Tests" "npm run test:integration"
        run_test "Research Tests" "npm run test:research"
        run_test "Data Pipeline Tests" "npm run test:data-pipeline"
        
        echo -e "${GREEN}All tests completed!${NC}"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [test-suite]"
        echo ""
        echo "Available test suites:"
        echo "  api-keys      - Test API key validation"
        echo "  server        - Test server functionality"
        echo "  integration   - Run integration tests"
        echo "  exa           - Test Exa research integration"
        echo "  research      - Test research verification"
        echo "  data-pipeline - Test data processing pipeline"
        echo "  market-analysis - Test market analysis workflows"
        echo "  all           - Run all test suites (default)"
        echo "  help          - Show this help message"
        ;;
    *)
        echo -e "${RED}Unknown test suite: $1${NC}"
        echo "Use '$0 help' to see available options"
        exit 1
        ;;
esac

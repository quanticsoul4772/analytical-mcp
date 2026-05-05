#!/bin/bash

# Analytical MCP Server - Test Runner
# Thin wrapper over npm test scripts.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

case "${1:-all}" in
    "unit")
        run_test "Unit Tests" "npm run test:unit"
        ;;
    "integration")
        run_test "Integration Tests" "npm run test:integration"
        ;;
    "integration:no-api")
        run_test "Integration Tests (no-api)" "npm run test:integration:no-api"
        ;;
    "all")
        run_test "Unit Tests" "npm run test:unit"
        run_test "Integration Tests" "npm run test:integration"
        echo -e "${GREEN}All tests completed!${NC}"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [test-suite]"
        echo ""
        echo "Available test suites:"
        echo "  unit               - Run unit tests"
        echo "  integration        - Run integration tests (requires EXA_API_KEY)"
        echo "  integration:no-api - Run integration tests excluding live-API tests"
        echo "  all                - Run unit + integration (default)"
        echo "  help               - Show this help message"
        ;;
    *)
        echo -e "${RED}Unknown test suite: $1${NC}"
        echo "Use '$0 help' to see available options"
        exit 1
        ;;
esac

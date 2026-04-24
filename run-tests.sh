#!/bin/bash

# Test runner script for Subscription Revenue Simulator
# Starts server and runs tests

echo "═══════════════════════════════════════════════════════════"
echo "  SUBSCRIPTION REVENUE SIMULATOR - TEST RUNNER"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to cleanup
cleanup() {
    echo ""
    echo "Cleaning up..."
    pkill -f "node.*server.js" 2>/dev/null
    exit
}

# Trap Ctrl+C
trap cleanup INT

# Check if server is already running
echo "Checking server status..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server already running${NC}"
    SERVER_ALREADY_RUNNING=true
else
    echo "Starting server..."
    cd backend
    npm start > /tmp/server.log 2>&1 &
    SERVER_PID=$!
    cd ..
    
    # Wait for server to start
    echo "Waiting for server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Server started${NC}"
            break
        fi
        sleep 1
        echo -n "."
    done
    
    if ! curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${RED}❌ Server failed to start${NC}"
        echo "Check /tmp/server.log for errors"
        exit 1
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  RUNNING TESTS"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Run tests
if command -v npx &> /dev/null && [ -f "playwright.config.js" ]; then
    echo "Attempting Playwright tests..."
    npx playwright test 2>&1 | tee /tmp/test-output.log
    TEST_EXIT_CODE=$?
    
    # If Playwright failed due to Node.js version, run fallback
    if grep -q "Node.js 18 or higher" /tmp/test-output.log 2>/dev/null; then
        echo ""
        echo -e "${YELLOW}⚠️  Playwright requires Node.js 18+${NC}"
        echo "Running fallback test runner instead..."
        echo ""
        node playwright-fallback.js 2>&1 | tee /tmp/test-output.log
        TEST_EXIT_CODE=$?
    fi
else
    echo "Running fallback test runner..."
    node playwright-fallback.js 2>&1 | tee /tmp/test-output.log
    TEST_EXIT_CODE=$?
fi

echo ""
echo "═══════════════════════════════════════════════════════════"

# Stop server if we started it
if [ -z "$SERVER_ALREADY_RUNNING" ] && [ -n "$SERVER_PID" ]; then
    echo "Stopping server..."
    kill $SERVER_PID 2>/dev/null
fi

# Summary
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo -e "${RED}❌ Some tests failed${NC}"
fi

echo ""
echo "Test output saved to: /tmp/test-output.log"
echo "═══════════════════════════════════════════════════════════"

exit $TEST_EXIT_CODE

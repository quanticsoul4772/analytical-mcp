#!/bin/bash
# Script to run all integration tests
# Provides a summary of test results

# Function to run a test and track its status
run_test() {
  local test_name=$1
  local test_script=$2
  local start_time=$(date +%s)
  
  echo "Running $test_name tests..."
  
  # Run the test script
  $test_script > /tmp/$test_name.log 2>&1
  local status=$?
  
  # Calculate duration
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  # Return test status and duration
  echo "$status $duration"
}

# Print header
echo "================================================================" 
echo "        Running All Integration Tests - $(date)"
echo "================================================================" 

# Check if EXA_API_KEY is set, if not, use a mock key for testing
if [ -z "$EXA_API_KEY" ]; then
  echo "WARNING: EXA_API_KEY not found in environment, using a mock key for testing."
  export EXA_API_KEY="mock-exa-api-key-for-testing-only"
fi

# Array to track test results
declare -A test_results
declare -A test_durations

# Run each test and collect results
echo "Starting test execution..."
echo ""

# Server tests
result=$(run_test "server" "./tools/run-server-tests.sh")
status=$(echo $result | cut -d' ' -f1)
duration=$(echo $result | cut -d' ' -f2)
test_results["server"]=$status
test_durations["server"]=$duration

# Data pipeline tests
result=$(run_test "data-pipeline" "./tools/run-data-pipeline-tests.sh")
status=$(echo $result | cut -d' ' -f1)
duration=$(echo $result | cut -d' ' -f2)
test_results["data-pipeline"]=$status
test_durations["data-pipeline"]=$duration

# Market analysis tests
result=$(run_test "market-analysis" "./tools/run-market-analysis-tests.sh")
status=$(echo $result | cut -d' ' -f1)
duration=$(echo $result | cut -d' ' -f2)
test_results["market-analysis"]=$status
test_durations["market-analysis"]=$duration

# API key tests
result=$(run_test "api-keys" "./tools/run-api-key-tests.sh")
status=$(echo $result | cut -d' ' -f1)
duration=$(echo $result | cut -d' ' -f2)
test_results["api-keys"]=$status
test_durations["api-keys"]=$duration

# Exa tests
result=$(run_test "exa" "./tools/run-exa-tests.sh")
status=$(echo $result | cut -d' ' -f1)
duration=$(echo $result | cut -d' ' -f2)
test_results["exa"]=$status
test_durations["exa"]=$duration

# Research tests
result=$(run_test "research" "./tools/run-research-tests.sh")
status=$(echo $result | cut -d' ' -f1)
duration=$(echo $result | cut -d' ' -f2)
test_results["research"]=$status
test_durations["research"]=$duration

# Print results table
echo ""
echo "================================================================" 
echo "                 Integration Tests Summary"
echo "================================================================" 
echo "Test               | Status    | Duration (seconds)"
echo "------------------ | --------- | ------------------"

# Track overall pass/fail
total_tests=0
passed_tests=0

# Print each test result
for test in "${!test_results[@]}"; do
  status="${test_results[$test]}"
  duration="${test_durations[$test]}"
  
  # Format status string
  if [ "$status" -eq 0 ]; then
    status_str="✅ PASS"
    passed_tests=$((passed_tests + 1))
  else
    status_str="❌ FAIL"
  fi
  
  # Increment total tests
  total_tests=$((total_tests + 1))
  
  # Print table row
  printf "%-18s | %-9s | %-18s\n" "$test" "$status_str" "$duration"
done

# Print summary line
echo "----------------------------------------------------------------"
echo "Total: $passed_tests/$total_tests passed"

# Cleanup - unset mock keys if we set them
if [ "$EXA_API_KEY" = "mock-exa-api-key-for-testing-only" ]; then
  unset EXA_API_KEY
fi

# Return overall status
if [ "$passed_tests" -eq "$total_tests" ]; then
  echo "All tests passed! ✨"
  exit 0
else
  echo "Some tests failed. Check logs for details."
  exit 1
fi
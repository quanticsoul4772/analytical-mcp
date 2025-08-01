# CI/CD Workflow Guide

This document explains the Continuous Integration and Continuous Deployment workflows implemented for the Analytical MCP Server project, including GitHub Actions setup, Claude Code Review integration, and troubleshooting guidance.

## Overview

The project uses GitHub Actions for automated testing, code quality checks, and Claude-powered code reviews. The CI/CD pipeline ensures code quality, maintains test coverage, and provides automated feedback on pull requests.

## Workflow Files

### 1. Claude Code Integration (`.github/workflows/claude.yml`)

Primary workflow for Claude-powered code assistance and reviews.

```yaml
name: Claude Code
on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  issues:
    types: [opened, assigned]
  pull_request_review:
    types: [submitted]

jobs:
  claude:
    if: contains(github.event.comment.body, '@claude') || 
        contains(github.event.issue.body, '@claude')
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
      id-token: write
      actions: read
```

#### Key Features:
- **Trigger Phrases**: `@claude` in comments or issue bodies
- **Permissions**: Read access to contents, PRs, and issues
- **Tools Allowed**: Specific npm commands for testing and building
- **Environment**: Test environment with EXA_API_KEY

#### Configuration Options:
```yaml
allowed_tools: "Bash(npm install),Bash(npm run build),Bash(npm run test:*),Bash(npm run lint:*),Bash(npm run typecheck:*)"

claude_env: |
  NODE_ENV: test
  EXA_API_KEY: ${{ secrets.EXA_API_KEY }}
```

### 2. Code Review Workflow (`.github/workflows/claude-code-review.yml`)

Automated code review workflow (if configured).

### 3. Main CI Pipeline (`.github/workflows/npm-gulp.yml`)

Standard Node.js testing and building pipeline.

## Required Secrets

### CLAUDE_CODE_OAUTH_TOKEN

OAuth token for Claude Code integration.

**Setup Steps:**
1. Go to repository Settings → Secrets and variables → Actions
2. Add new repository secret: `CLAUDE_CODE_OAUTH_TOKEN`
3. Obtain token from Claude Code setup process
4. Ensure token has appropriate permissions

### EXA_API_KEY

API key for Exa research functionality.

**Setup Steps:**
1. Obtain API key from [Exa AI](https://docs.exa.ai/)
2. Add as repository secret: `EXA_API_KEY`
3. Used in test environment for API integration tests

## Workflow Triggers

### Issue Comments
```
Triggers when:
- Issue comment contains "@claude"
- Pull request comment contains "@claude"
```

### Issue Events
```
Triggers when:
- New issue opened with "@claude" in body
- Issue assigned to user (if configured)
```

### Pull Request Events
```
Triggers when:
- PR review submitted with "@claude"
- PR review comment contains "@claude"
```

## Automated Testing Pipeline

### Test Execution Sequence

1. **Environment Setup**
   ```bash
   npm ci                    # Clean install dependencies
   export NODE_ENV=test     # Set test environment
   ```

2. **Code Quality Checks**
   ```bash
   npm run typecheck        # TypeScript compilation check
   npm run lint             # ESLint code quality
   npm run format:check     # Prettier formatting
   ```

3. **Test Execution**
   ```bash
   npm run test:ci          # CI-optimized test run
   npm run test:coverage    # Generate coverage report
   ```

4. **Build Verification**
   ```bash
   npm run build           # Production build
   ```

### Test Configuration for CI

**Jest CI Configuration:**
```javascript
// jest.config.js - CI-specific settings
{
  ci: true,
  coverage: true,
  maxWorkers: 2,
  silent: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ]
}
```

**Environment Variables:**
```yaml
NODE_ENV: test
LOG_LEVEL: error
DISABLE_EXTERNAL_APIS: true
CI: true
```

## Code Quality Gates

### Required Checks

1. **TypeScript Compilation**
   - No compilation errors
   - Strict type checking enabled
   - All types properly defined

2. **Linting Standards**
   - ESLint rules compliance
   - No critical or error-level issues
   - Warning threshold: < 10

3. **Test Coverage**
   - Minimum 63% overall coverage (current)
   - Target: 80% overall coverage
   - Critical paths: 100% coverage

4. **Formatting**
   - Prettier formatting compliance
   - Consistent code style
   - No formatting violations

### Coverage Thresholds

```javascript
coverageThresholds: {
  global: {
    branches: 70,
    functions: 80,
    lines: 80,
    statements: 80
  },
  './src/tools/': {
    branches: 80,
    functions: 90,
    lines: 85,
    statements: 85
  }
}
```

## Performance Monitoring

### Build Performance
- Target build time: < 2 minutes
- Dependency installation: < 1 minute
- Test execution: < 5 minutes

### Resource Usage
- Memory limit: 4GB
- Concurrent workers: 2 (CI environment)
- Timeout limits: 10 minutes per job

## Branch Protection Rules

### Main Branch Protection

```yaml
Required status checks:
  - Claude Code workflow
  - Test suite completion
  - Code quality checks
  - Coverage threshold

Required reviews:
  - At least 1 approval
  - Dismiss stale reviews
  - Require review from code owners

Restrictions:
  - Restrict pushes to matching branches
  - Force push disabled
  - Deletion disabled
```

### Development Workflow

1. **Feature Branch Creation**
   ```bash
   git checkout -b feature/new-feature
   git push -u origin feature/new-feature
   ```

2. **Development Process**
   - Make changes
   - Run local tests: `npm test`
   - Commit changes with conventional commit format

3. **Pull Request Process**
   - Create PR against main branch
   - Automated CI checks run
   - Claude Code review (if triggered with @claude)
   - Manual review required

4. **Merge Process**
   - All checks must pass
   - Squash and merge preferred
   - Delete feature branch after merge

## Claude Code Review Features

### Automatic Code Analysis

Claude analyzes:
- Code quality and best practices
- Security vulnerabilities
- Performance implications
- Error handling patterns
- Test coverage gaps

### Interactive Features

**Trigger Claude with:**
```
@claude review this PR
@claude help with error handling
@claude suggest improvements
@claude run tests
```

**Claude can:**
- Review code changes
- Suggest improvements
- Fix issues automatically
- Run tests and build
- Update documentation
- Explain complex code sections

### Review Scope

Claude reviews:
- TypeScript/JavaScript changes
- Test files and coverage
- Configuration updates
- Documentation changes
- Package dependencies

## Troubleshooting CI/CD Issues

### Common Workflow Failures

#### 1. Test Failures
```bash
# Debug locally
npm run test:debug
npm run test -- --verbose

# Check specific test
npm test -- --testPathPattern="failing-test"
```

**Solutions:**
- Check recent code changes
- Verify test data and mocks
- Ensure async operations complete
- Check environment variables

#### 2. Build Failures
```bash
# Local build check
npm run build
npm run typecheck
```

**Common causes:**
- TypeScript compilation errors
- Missing dependencies
- Import/export issues
- Configuration problems

#### 3. Coverage Failures
```bash
# Generate coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

**Solutions:**
- Add tests for uncovered lines
- Remove dead code
- Update coverage thresholds
- Check test file patterns

#### 4. Linting Failures
```bash
# Fix automatically
npm run lint:fix
npm run format

# Check specific issues
npm run lint -- --debug
```

### Claude Code Issues

#### Authentication Problems
- Verify CLAUDE_CODE_OAUTH_TOKEN secret
- Check token permissions
- Ensure repository access

#### Trigger Issues
- Verify "@claude" spelling in comments
- Check workflow trigger conditions
- Review branch protection rules

#### Permission Errors
- Verify workflow permissions
- Check repository settings
- Ensure secret access

### Performance Issues

#### Slow CI Runs
```yaml
# Optimize strategies
- Use npm ci instead of npm install
- Cache dependencies
- Reduce test parallelism
- Skip optional checks in draft PRs
```

#### Memory Issues
```yaml
# Increase resources
- Increase max-old-space-size
- Use runInBand for tests
- Reduce concurrent workers
```

## Monitoring and Alerting

### GitHub Actions Insights

Monitor:
- Workflow success rates
- Average run times
- Resource usage
- Failure patterns

### Key Metrics

- **Build Success Rate**: Target >95%
- **Average Build Time**: Target <5 minutes
- **Test Success Rate**: Target >98%
- **Coverage Trend**: Monitor increases/decreases

### Alerts Setup

Configure notifications for:
- Consecutive workflow failures
- Coverage drops below threshold
- Security vulnerabilities detected
- Performance degradation

## Best Practices

### Workflow Optimization

1. **Use Caching**
   ```yaml
   - uses: actions/cache@v3
     with:
       path: ~/.npm
       key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
   ```

2. **Parallel Execution**
   ```yaml
   strategy:
     matrix:
       node-version: [18, 20]
   ```

3. **Conditional Steps**
   ```yaml
   - name: Run integration tests
     if: github.event_name == 'pull_request'
   ```

### Security Considerations

1. **Secret Management**
   - Use repository secrets for sensitive data
   - Never log secret values
   - Rotate secrets regularly

2. **Dependency Security**
   ```bash
   npm audit                 # Check vulnerabilities
   npm audit fix            # Fix automatically
   ```

3. **Code Scanning**
   - Enable GitHub Advanced Security
   - Use CodeQL analysis
   - Monitor dependency alerts

## Future Enhancements

### Planned Improvements

1. **Advanced Testing**
   - Visual regression testing
   - Performance benchmarks
   - Load testing integration

2. **Deployment Automation**
   - Automated releases
   - Version tagging
   - Changelog generation

3. **Enhanced Monitoring**
   - Real-time performance metrics
   - Error tracking integration
   - Usage analytics

## Quick Reference

### Essential Commands
```bash
# Local development
npm run build              # Build project
npm run test:ci           # Run CI tests
npm run lint              # Check code quality
npm run typecheck         # Verify types

# Debugging
npm run test:debug        # Debug tests
npm run test:coverage     # Coverage report
npm run inspector         # MCP inspector
```

### Workflow Files
- `.github/workflows/claude.yml` - Claude Code integration
- `.github/workflows/claude-code-review.yml` - Automated reviews
- `.github/workflows/npm-gulp.yml` - Standard CI pipeline

### Required Secrets
- `CLAUDE_CODE_OAUTH_TOKEN` - Claude authentication
- `EXA_API_KEY` - Research API access

### Status Badges
Add to README.md:
```markdown
[![CI/CD Status](https://github.com/user/repo/actions/workflows/claude.yml/badge.svg)](https://github.com/user/repo/actions/workflows/claude.yml)
[![Test Coverage](https://img.shields.io/badge/coverage-63%25-yellow)](https://github.com/user/repo/actions)
```
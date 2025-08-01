# CI/CD Documentation

This document describes the Continuous Integration and Continuous Deployment workflows for the Analytical MCP Server project.

## Overview

The project uses GitHub Actions for automated testing, building, and deployment. Our CI/CD pipeline ensures code quality, runs comprehensive tests, and automates deployment processes.

## Workflow Files

### 1. NodeJS CI Pipeline (`.github/workflows/npm-gulp.yml`)

The main CI pipeline that runs on all pushes and pull requests to the `main` branch.

#### Trigger Events
```yaml
on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]
```

#### Matrix Strategy
Tests across multiple Node.js versions to ensure compatibility:
- Node.js 18.x (LTS)
- Node.js 20.x (LTS) 
- Node.js 22.x (Current)

#### Pipeline Steps

1. **Checkout Code**
   ```yaml
   - uses: actions/checkout@v4
   ```

2. **Setup Node.js Environment**
   ```yaml
   - name: Use Node.js ${{ matrix.node-version }}
     uses: actions/setup-node@v4
     with:
       node-version: ${{ matrix.node-version }}
   ```

3. **Environment Configuration**
   ```yaml
   - name: Setup environment
     run: |
       cp .env.example .env.test
   ```

4. **Install Dependencies**
   ```yaml
   - name: Install dependencies
     run: npm install
   ```

5. **Build Project**
   ```yaml
   - name: Build
     run: npm run build
   ```

6. **Type Checking**
   ```yaml
   - name: Type check
     run: npm run typecheck:src
   ```

7. **Run Tests**
   ```yaml
   - name: Run tests
     run: npm run test:optimized
     env:
       NODE_ENV: test
       EXA_API_KEY: ${{ secrets.EXA_API_KEY }}
   ```

### 2. Claude Code Review (`.github/workflows/claude-code-review.yml`)

Automated code review workflow using Claude AI for pull requests.

### 3. Claude Integration (`.github/workflows/claude.yml`)

Integration workflow for Claude-specific automation tasks.

## Environment Variables and Secrets

### Required Secrets

#### `EXA_API_KEY`
- **Purpose**: Enables research verification tools during testing
- **Scope**: Used in CI test runs
- **Setup**: Configure in repository Settings > Secrets and variables > Actions

### Environment Configuration

#### Test Environment
```bash
NODE_ENV=test
EXA_API_KEY=${{ secrets.EXA_API_KEY }}
```

#### Build Environment
- Node.js versions: 18.x, 20.x, 22.x
- Platform: ubuntu-latest
- Package manager: npm

## Test Strategy in CI

### Test Commands Used
- `npm run test:optimized` - Memory-optimized test execution for CI
- `npm run typecheck:src` - TypeScript compilation check
- `npm run build` - Production build verification

### Test Configuration
```bash
# Optimized for CI environment
--maxWorkers=2          # Limit parallel workers
--ci                    # CI-specific optimizations
--coverage              # Generate coverage reports
--silent                # Reduce log output
```

### Coverage Requirements
- Minimum 80% coverage across all metrics
- Coverage reports generated but not uploaded (local verification)
- Failed coverage fails the build

## Workflow Optimization

### Performance Optimizations
1. **Parallel Matrix Builds**: Tests run in parallel across Node.js versions
2. **Optimized Test Runner**: Uses `test:optimized` for resource efficiency
3. **Dependency Caching**: Node.js setup action includes npm cache
4. **Silent Mode**: Reduces log noise in CI environment

### Resource Management
- **Worker Limitation**: `--maxWorkers=2` prevents resource exhaustion
- **Memory Management**: Uses `--max-old-space-size=4096` when needed
- **Timeout Configuration**: Reasonable timeouts for test execution

## Troubleshooting CI/CD Issues

### Common Build Failures

#### 1. Test Failures
**Symptoms**: Tests pass locally but fail in CI
**Causes**:
- Environment differences
- Missing environment variables
- Race conditions in parallel tests
- API rate limiting

**Solutions**:
```bash
# Debug CI-specific test issues
npm run test:ci  # Replicate CI test conditions locally

# Check environment setup
cp .env.example .env.test
NODE_ENV=test npm test

# Run tests with CI flags
npm run test -- --ci --maxWorkers=2
```

#### 2. Build Failures
**Symptoms**: TypeScript compilation fails
**Causes**:
- Missing type definitions
- TypeScript version mismatches
- Import path issues

**Solutions**:
```bash
# Check TypeScript compilation
npm run typecheck:src

# Verify build process
npm run build

# Check for missing dependencies
npm audit
```

#### 3. Environment Issues
**Symptoms**: Tests fail due to missing environment variables
**Causes**:
- Missing GitHub secrets
- Incorrect environment setup
- API key issues

**Solutions**:
- Verify `EXA_API_KEY` is configured in GitHub secrets
- Check environment variable names match
- Ensure test environment file is created correctly

### Debugging Steps

#### Local Replication
```bash
# Replicate CI environment locally
cp .env.example .env.test
NODE_ENV=test npm run test:ci

# Test across multiple Node versions (using nvm)
nvm use 18 && npm test
nvm use 20 && npm test
nvm use 22 && npm test
```

#### CI Logs Analysis
1. Check the "Actions" tab in GitHub repository
2. Select the failed workflow run
3. Expand the failed step to see detailed logs
4. Look for specific error messages and stack traces

#### Common Error Patterns
- **"Cannot find module"**: Dependency or import path issue
- **"Timeout"**: Test taking too long, increase timeout or optimize
- **"API Error"**: External API issues, check rate limits or keys

## Security Considerations

### Secret Management
- Never commit API keys or secrets to repository
- Use GitHub secrets for sensitive environment variables
- Rotate secrets regularly
- Limit secret scope to necessary workflows

### Dependency Security
```bash
# Run security audit
npm audit

# Fix vulnerabilities
npm audit fix

# Check for high-severity issues
npm audit --audit-level=high
```

### Access Control
- Repository secrets accessible only to workflow runs
- No secret exposure in logs or outputs
- Limited workflow permissions

## Monitoring and Alerting

### Build Status Monitoring
- GitHub provides build status badges
- Failed builds trigger email notifications to committers
- Pull request status checks prevent merging failing code

### Performance Monitoring
- Track build duration trends
- Monitor test execution times
- Resource usage monitoring in workflow runs

### Coverage Tracking
- Coverage reports generated for each build
- Threshold enforcement prevents coverage regression
- Coverage trends visible in CI logs

## Deployment Strategy

### Current State
The project currently focuses on CI (testing and validation) without automated deployment.

### Future Deployment Considerations
- **NPM Package**: Could publish to npm registry
- **Docker Images**: Could build and push Docker images
- **Documentation Sites**: Could deploy docs to GitHub Pages
- **Release Automation**: Could automate GitHub releases

### Proposed Deployment Workflow
```yaml
# Future deployment workflow structure
name: Deploy
on:
  release:
    types: [published]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Build and publish
        run: |
          npm run build
          npm publish  # If publishing to npm
```

## Maintenance Tasks

### Regular Maintenance
1. **Update Dependencies**: Monthly dependency updates
2. **Node.js Versions**: Update matrix as Node.js LTS changes
3. **Action Versions**: Keep GitHub Actions updated
4. **Secret Rotation**: Rotate API keys quarterly

### Workflow Updates
```bash
# Test workflow changes locally using act
npm install -g @github/act
act -j build  # Run build job locally
```

### Performance Review
- Monthly review of CI performance metrics
- Optimize slow-running tests
- Review resource usage patterns
- Update test parallelization strategy

## Best Practices

### Workflow Design
- Keep workflows focused and single-purpose
- Use matrix strategies for multi-environment testing
- Implement proper error handling and reporting
- Cache dependencies when possible

### Test Integration
- All tests must pass before merge
- Coverage thresholds enforced at CI level
- Integration tests run in CI environment
- Mocking strategies for external dependencies

### Documentation
- Keep workflow documentation updated
- Document secret requirements clearly
- Provide troubleshooting guides
- Include performance considerations

## Migration and Updates

### Updating Node.js Versions
When updating the Node.js version matrix:

1. Update `.github/workflows/npm-gulp.yml`
2. Test locally with new Node.js versions
3. Update `package.json` engines field if needed
4. Update documentation references

### Adding New Workflows
When adding new GitHub Actions workflows:

1. Follow existing naming conventions
2. Include proper documentation
3. Test thoroughly before deployment
4. Consider resource usage impact

### Secrets Management Migration
If changing secret names or adding new secrets:

1. Update workflow files
2. Configure new secrets in GitHub
3. Test with new configuration
4. Remove old secrets after verification

This CI/CD setup ensures reliable, automated testing and maintains high code quality standards across all contributions to the Analytical MCP Server project.
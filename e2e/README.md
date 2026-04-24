# Playwright E2E Tests

This directory contains end-to-end tests using [Playwright](https://playwright.dev/) for the Subscription Revenue Simulator.

## Test Files

| File | Description |
|------|-------------|
| `auth.spec.js` | Authentication flow tests |
| `dashboard.spec.js` | Dashboard functionality tests |
| `simulation.spec.js` | Revenue simulation tests |
| `phase5-features.spec.js` | Phase 5 specific feature tests |
| `api.spec.js` | API endpoint tests |
| `visual.spec.js` | Visual regression tests |

## Running Tests

### Run all tests
```bash
npx playwright test
```

### Run specific test file
```bash
npx playwright test auth.spec.js
```

### Run with UI mode (for debugging)
```bash
npx playwright test --ui
```

### Run in headed mode (see browser)
```bash
npx playwright test --headed
```

### Run on specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=Mobile Chrome
```

### Generate HTML report
```bash
npx playwright test --reporter=html
n```

## Test Configuration

Tests are configured in `playwright.config.js`:
- Base URL: `http://localhost:3001`
- Browsers: Chromium, Mobile Chrome
- Screenshots: On failure
- Videos: On first retry
- Trace: On first retry

## Test Data

Tests use the demo account:
- Email: `demo@example.com`
- Password: `demo123`

## Phase 5 Features Tested

### Multi-Currency
- Currency selector display
- Currency symbols in UI
- API endpoints responding

### Cohort Analysis
- Cohort section visibility
- Retention curve display
- Benchmarks API

### AI Forecasting
- Forecast section visibility
- 12-month predictions
- Confidence intervals

### PDF Reports
- Report templates API
- PDF generation capability

### QuickBooks Integration
- Connection status API
- OAuth URL generation

### Multi-Tenant/Agency
- Agency section visibility
- Workspace API
- Team management

### PWA
- Manifest.json validity
- Service Worker registration
- Installability

## Visual Regression

Screenshots are stored in:
- `e2e/__snapshots__/`

To update snapshots:
```bash
npx playwright test --update-snapshots
```

## Continuous Integration

Tests can be run in CI with:
```bash
npx playwright test --reporter=html
```

Reports are generated in `playwright-report/`.

## Debugging

1. Use `--ui` flag for interactive debugging
2. Check `test-results/` for traces and screenshots
3. Use `await page.pause()` in tests to pause execution

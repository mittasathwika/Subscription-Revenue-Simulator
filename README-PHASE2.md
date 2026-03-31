# Subscription Revenue Simulator - Phase 2

## Overview
Phase 2 implements the core features from the PRD:
- **Real data processing** with database persistence
- **Metrics calculation engine** (backend + frontend)
- **Basic simulation functionality** with scenario saving/comparison
- **Export functionality** for data portability

## Phase 2 Features

### ✅ Real Data Processing
- SQLite database for data persistence
- Real metrics storage (customers, MRR, churn, ad spend, CAC)
- Demo data seeded automatically
- Backend API with fallback to localStorage

### ✅ Metrics Calculation Engine
- Backend: `utils/metricsEngine.js` with full calculation logic
- Frontend: Enhanced JavaScript class with same formulas
- LTV, ARR, ARPU, CAC, LTV:CAC ratio, Payback Period
- 12-month projections with customer/revenue arrays

### ✅ Simulation Functionality
- Calculate projections based on user inputs
- Input validation with error messages
- Warning flags for unrealistic values (high churn, low LTV:CAC)
- Comparison of real vs simulated data

### ✅ Scenario Management
- Save simulations with custom names
- List all saved scenarios
- Load scenarios back into the simulator
- Delete scenarios
- Compare multiple scenarios side-by-side
- Persisted in localStorage (with backend sync when available)

### ✅ Export Functionality
- Export current projection as JSON
- Includes inputs, projections, and calculated metrics
- Downloadable file with timestamp

### ✅ Backend API
- **Express.js** server with SQLite database
- RESTful endpoints:
  - `GET /api/health` - Health check
  - `GET /api/metrics` - Get real metrics
  - `POST /api/metrics/calculate` - Run simulation
  - `POST /api/metrics/real` - Update real metrics
  - `GET /api/metrics/compare` - Compare real vs simulated
  - `GET /api/scenarios` - List scenarios
  - `POST /api/scenarios` - Create scenario
  - `GET /api/scenarios/:id` - Get specific scenario
  - `PUT /api/scenarios/:id` - Update scenario
  - `DELETE /api/scenarios/:id` - Delete scenario
  - `POST /api/scenarios/compare` - Compare scenarios
  - `POST /api/auth/login` - User login
  - `POST /api/auth/signup` - User registration

## Files Structure
```
backend/
├── server.js              # Express server entry point
├── package.json           # Backend dependencies
├── routes/
│   ├── metrics.js         # Metrics API endpoints
│   ├── scenarios.js       # Scenario management endpoints
│   └── auth.js            # Authentication endpoints
├── models/
│   └── database.js        # SQLite database setup
└── utils/
    └── metricsEngine.js   # Calculation engine

phase2-script.js           # Enhanced frontend with API integration
README-PHASE2.md           # This documentation
```

## Running Phase 2

### Option 1: Frontend Only (localStorage mode)
1. Open `index.html` in a browser
2. The enhanced `phase2-script.js` will auto-detect no backend
3. Uses localStorage for scenarios and real metrics
4. All calculation happens in browser

### Option 2: Full Stack (with backend)
1. Install Node.js dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Start the backend server:
   ```bash
   npm start
   # or for development:
   npm run dev
   ```
3. Open `index.html` in a browser
4. Frontend will auto-connect to backend API

## Data Flow

### Without Backend (localStorage Mode)
```
User Inputs → Frontend Calculator → Charts + Metrics
                                    ↓
                              localStorage (scenarios)
```

### With Backend
```
User Inputs → Frontend → Backend API → Database
                ↓           ↓
            Charts    Calculation Engine
```

## Key Calculations

### LTV (Lifetime Value)
```
LTV = ARPU / Churn Rate
(if churn = 0, capped at ARPU × 24 months)
```

### Payback Period
```
Payback Period = CAC / Monthly Price
```

### ARR
```
ARR = MRR × 12
```

### Customer Growth
```
New Customers = (Ad Spend / CAC) × (1 + Growth Rate × Month)
Churned = Current Customers × Churn Rate
```

## Next: Phase 3
Phase 3 will include:
- Advanced UI/UX with animations
- PDF report generation
- Performance optimization
- Enhanced visualizations
- Multi-currency support preparation

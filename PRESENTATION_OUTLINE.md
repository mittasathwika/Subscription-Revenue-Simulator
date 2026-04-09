# Subscription Revenue Simulator - PowerPoint Outline

---

## Slide 1: Title Slide
**Title:** Subscription Revenue Simulator
**Subtitle:** Full-Stack SaaS Forecasting Application
**Your Name:** [Your Name]
**Date:** [Date]
**Course:** [Course Name]

**Visual:** Project logo or screenshot of main dashboard

---

## Slide 2: Problem Statement
**Title:** Why This Project?

**Bullet Points:**
- SaaS startups need to forecast revenue before investing in marketing
- Manual calculations are error-prone and time-consuming
- Difficult to compare different growth strategies
- Need to validate business model viability early

**Visual:** Before/After comparison or frustrated entrepreneur vs. confident analyst

---

## Slide 3: Solution Overview
**Title:** Subscription Revenue Simulator

**Key Capabilities:**
- ✅ 12-month revenue projections
- ✅ Auto-calculates key SaaS metrics (LTV, ARR, CAC)
- ✅ Visual charts and graphs
- ✅ Save and compare multiple scenarios
- ✅ User authentication system
- ✅ Cloud-deployed on AWS

**Visual:** Main dashboard screenshot

---

## Slide 4: Core Features
**Title:** What Does It Do?

**Feature 1: Business Parameters**
- Set subscription price, ad spend, churn rate, growth rate
- Input starting customer count and acquisition cost

**Feature 2: Automatic Calculations**
- Monthly customer projections
- Revenue forecasts
- Key metrics computation

**Feature 3: Visualization**
- Revenue growth chart
- Customer growth chart
- Metrics dashboard

**Feature 4: Scenario Management**
- Save multiple scenarios
- Compare "what-if" situations
- Export data

**Visual:** Split screen showing input form + charts + metrics

---

## Slide 5: Key SaaS Metrics Explained
**Title:** Understanding the Numbers

**Metric 1: LTV (Lifetime Value)**
- Total revenue expected from one customer
- Formula: Price / Churn Rate
- Higher is better

**Metric 2: CAC (Customer Acquisition Cost)**
- Cost to acquire one customer
- Formula: Ad Spend / New Customers
- Lower is better

**Metric 3: LTV/CAC Ratio**
- Health indicator for business model
- Goal: > 3:1 (spend $1, get $3 back)
- < 1:1 = losing money

**Metric 4: ARR (Annual Recurring Revenue)**
- Total yearly revenue from subscriptions
- Key investor metric

**Metric 5: Payback Period**
- Months to recover CAC from customer revenue
- Goal: < 12 months

**Visual:** Formula cards or infographic

---

## Slide 6: Tech Stack - Frontend
**Title:** Frontend Technologies

**Core Stack:**
- HTML5 - Page structure
- CSS3 - Styling and responsive design
- JavaScript (Vanilla) - Business logic

**Libraries:**
- Chart.js - Data visualization
- Font Awesome - Icons

**Key Features:**
- Responsive design (mobile + desktop)
- Real-time calculations
- Form validation
- Interactive charts

**Visual:** Tech stack logos or code snippet

---

## Slide 7: Tech Stack - Backend
**Title:** Backend Architecture

**Runtime:** Node.js (JavaScript)
**Framework:** Express.js (REST API)
**Database:** SQLite (file-based, zero-config)
**Authentication:** JWT (JSON Web Tokens)
**Security:** bcrypt (password hashing)

**API Endpoints:**
```
POST /api/auth/signup     - User registration
POST /api/auth/login      - User login
POST /api/metrics/calculate - Run projections
GET  /api/scenarios       - List saved scenarios
POST /api/scenarios       - Create scenario
```

**Visual:** API flow diagram or Postman screenshot

---

## Slide 8: Database Design
**Title:** Data Architecture

**Tables:**
1. **users** - User accounts (id, email, password_hash, created_at)
2. **scenarios** - Saved calculations (id, user_id, name, parameters, created_at)
3. **projections** - Cached results (optional)

**Relationships:**
- One user → Many scenarios
- SQLite = Serverless, file-based
- No separate database server needed

**Visual:** ER Diagram showing table relationships

---

## Slide 9: System Architecture
**Title:** How It All Connects

**Architecture Diagram:**
```
┌─────────────┐      HTTP      ┌─────────────────┐
│   Browser   │ ◄──────────────►│  Frontend       │
│  (Client)   │                 │  (AWS S3)       │
└─────────────┘                 └─────────────────┘
       │                               │
       │ AJAX/API Calls                │
       │                               │
       ▼                               ▼
┌─────────────────┐             ┌─────────────────┐
│   Backend API   │             │   Static Assets │
│ (Elastic Bean)  │             │  (CSS, JS, HTML)│
│   Node.js       │             └─────────────────┘
└────────┬────────┘
         │
         │ SQLite
         │
         ▼
┌─────────────────┐
│   Database      │
│  (data.db file) │
└─────────────────┘
```

**Visual:** Clean architecture diagram with arrows

---

## Slide 10: Deployment - AWS
**Title:** Cloud Infrastructure

**Frontend Hosting:**
- Service: AWS S3 (Simple Storage Service)
- Cost: FREE (under free tier limits)
- URL: Static website endpoint
- Features: Global CDN, high availability

**Backend Hosting:**
- Service: AWS Elastic Beanstalk
- Instance: t2.micro (750 hours/month free)
- Platform: Node.js 18
- Cost: FREE for 12 months

**Benefits:**
- Auto-scaling (handles traffic spikes)
- Managed environment (no server maintenance)
- Easy deployment (git push to deploy)

**Visual:** AWS service icons, deployment flow

---

## Slide 11: Live Demo
**Title:** See It In Action

**Demo Steps:**
1. **Login/Signup** - Show authentication
2. **Enter Parameters** - Input sample business data
   - Price: $99/month
   - Ad Spend: $5,000/month
   - Churn: 5%
   - Initial Customers: 100
3. **Calculate** - Click button, show loading state
4. **View Results** - Point out:
   - Metrics cards (LTV, ARR, LTV/CAC)
   - Revenue chart trend
   - Customer growth projection
5. **Save Scenario** - Show save functionality
6. **Compare** - Show multiple scenarios side-by-side

**Visual:** Live website screenshot or screen recording

---

## Slide 12: Business Impact
**Title:** Real-World Applications

**Use Cases:**
1. **Startup Pitch Decks** - Show investors realistic projections
2. **Marketing Budget Planning** - Optimize ad spend
3. **Pricing Strategy** - Test different price points
4. **Investor Due Diligence** - Validate business model
5. **Board Reporting** - Track metrics over time

**Example Scenario:**
- "What if we reduce churn from 5% to 3%?"
- Result: 40% increase in LTV
- Decision: Invest in customer success team

**Visual:** Business use case icons or testimonials

---

## Slide 13: Development Challenges & Solutions
**Title:** What I Learned

**Challenge 1: Database Choice**
- Problem: Needed free, easy database
- Solution: SQLite - no server, file-based

**Challenge 2: Deployment**
- Problem: First time deploying full-stack
- Solution: AWS S3 + Elastic Beanstalk tutorials

**Challenge 3: CORS Issues**
- Problem: Frontend couldn't talk to backend
- Solution: Configured CORS headers in Express

**Challenge 4: Authentication**
- Problem: Secure password storage
- Solution: bcrypt hashing + JWT tokens

**Challenge 5: Chart Rendering**
- Problem: Charts not updating dynamically
- Solution: Proper Chart.js destroy/recreate cycle

**Visual:** Problem-solution cards

---

## Slide 14: Code Structure
**Title:** Project Organization

```
subscription-revenue-simulator/
├── index.html              # Main dashboard
├── login.html              # Authentication page
├── styles.css              # All styling
├── script.js               # Core simulator logic
├── phase2-script.js        # Enhanced features
├── backend/
│   ├── server.js           # Express app entry
│   ├── routes/
│   │   ├── auth.js         # Login/signup APIs
│   │   ├── scenarios.js    # CRUD operations
│   │   └── metrics.js      # Calculation engine
│   ├── models/
│   │   └── database.js     # SQLite setup
│   └── package.json        # Dependencies
├── aws/
│   └── deploy.ps1          # Deployment script
└── tests/
    └── simulator.spec.js   # Playwright tests
```

**Lines of Code:** ~2,500+ total

**Visual:** Folder tree diagram

---

## Slide 15: Testing
**Title:** Quality Assurance

**Testing Approach:**
- **Unit Tests:** Core calculation functions
- **Integration Tests:** API endpoints
- **E2E Tests:** Playwright browser automation

**Test Coverage:**
- Input validation
- Calculation accuracy
- API responses
- User authentication flow
- UI interactions

**Example Test:**
```javascript
// Verify LTV calculation
test('LTV calculation with $99 price, 5% churn', () => {
    const ltv = calculateLTV(99, 0.05);
    expect(ltv).toBe(1980); // $99 / 0.05 = $1,980
});
```

**Visual:** Test results screenshot or testing pyramid

---

## Slide 16: GitHub & Version Control
**Title:** Project Management

**Repository:**
- **Platform:** GitHub
- **URL:** github.com/mittasathwika/Subscription-Revenue-Simulator
- **Branch:** test (active development)

**Workflow:**
1. Code locally → Test → Commit
2. Push to GitHub
3. Deploy to AWS from local

**Commits:**
- Initial Phase 1 (basic calculator)
- Phase 2 backend + database
- AWS deployment scripts
- Authentication system

**Visual:** GitHub repo screenshot, commit history

---

## Slide 17: Future Enhancements
**Title:** What's Next?

**Version 3.0 Ideas:**
1. **Stripe Integration** - Real payment data import
2. **Team Collaboration** - Share scenarios with team
3. **AI Predictions** - Machine learning forecasts
4. **PDF Reports** - Export professional reports
5. **Mobile App** - iOS/Android version
6. **Multi-currency** - International support
7. **Real-time Updates** - WebSocket live data

**Visual:** Roadmap timeline or feature mockups

---

## Slide 18: Key Takeaways
**Title:** Summary

**What I Built:**
✅ Full-stack web application
✅ SaaS business forecasting tool
✅ REST API with authentication
✅ Cloud-deployed on AWS
✅ Production-ready codebase

**Skills Demonstrated:**
- Frontend development (HTML/CSS/JS)
- Backend development (Node.js/Express)
- Database design (SQLite)
- API design (REST)
- Cloud deployment (AWS)
- Version control (Git/GitHub)

**Visual:** Checkmarks and skill icons

---

## Slide 19: Q&A
**Title:** Questions?

**Contact:**
- GitHub: github.com/mittasathwika
- Live Demo: [Your AWS URL]

**Visual:** Large question mark or contact info card

---

## Slide 20: Thank You
**Title:** Thank You!

**Subtitle:** Questions & Discussion

**Visual:** Project screenshot or closing graphic

---

# Speaker Notes & Timing

| Slide | Topic | Time |
|-------|-------|------|
| 1 | Title | 30 sec |
| 2-3 | Problem & Solution | 1 min |
| 4 | Features | 1 min |
| 5 | Metrics | 1.5 min |
| 6-7 | Tech Stack | 1.5 min |
| 8 | Database | 1 min |
| 9 | Architecture | 1 min |
| 10 | AWS Deployment | 1 min |
| 11 | Live Demo | 3 min |
| 12 | Business Impact | 1 min |
| 13 | Challenges | 1.5 min |
| 14-16 | Code & Testing | 1.5 min |
| 17-18 | Future & Summary | 1 min |
| 19-20 | Q&A | 2 min |
| **Total** | | **~18-20 min** |

---

# Tips for Presentation

1. **Start with the demo** - Hook attention immediately
2. **Use real numbers** - Show actual calculations
3. **Explain the "why"** - Why SaaS metrics matter
4. **Show the code briefly** - Prove you built it
5. **Share the live URL** - Let people try it
6. **Be ready for technical questions** - Know your stack

---

# Handout Materials (Optional)

- One-page feature summary
- Tech stack cheat sheet
- QR code to live demo
- GitHub repo link

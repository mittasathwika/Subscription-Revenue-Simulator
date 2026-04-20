# Phase 1 Wireframes

## Wireframe Overview

### Page Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                        HEADER                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │     Subscription Revenue Simulator                        │   │
│  │     Basic SaaS revenue calculations and projections     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    INPUT SECTION                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Business Parameters                                    │   │
│  │                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │Monthly Price│  │Churn Rate   │  │Ad Spend     │     │   │
│  │  │   ($)       │  │    (%)      │  │   ($)       │     │   │
│  │  │  [  99  ]   │  │  [   5  ]   │  │  [ 5000 ]   │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  │                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │Growth Rate  │  │Initial      │  │CAC          │     │   │
│  │  │    (%)      │  │Customers    │  │   ($)       │     │   │
│  │  │  [  10  ]   │  │  [  100 ]   │  │  [  500 ]   │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  │                                                         │   │
│  │  [ Calculate Projections ]                            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    METRICS SECTION                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Key Metrics                                            │   │
│  │                                                         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │   │
│  │  │   LTV    │  │   ARR    │  │LTV/CAC   │  │ Payback  │ │   │
│  │  │          │  │          │  │ Ratio    │  │  Period  │ │   │
│  │  │  $1,980  │  │ $118,800 │  │   3.96   │  │  5.05 mo │ │   │
│  │  │Lifetime  │  │Annual    │  │Efficiency│  │CAC       │ │   │
│  │  │ Value    │  │Recurring │  │ Metric   │  │Recovery  │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    CHARTS SECTION                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  12-Month Projections                                   │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │                                                 │   │   │
│  │  │     REVENUE CHART (Line/Bar)                    │   │   │
│  │  │     $140K ┤                                  ╭╮  │   │   │
│  │  │     $120K ┤                              ╭────╯│  │   │   │
│  │  │     $100K ┤                          ╭────╯    │  │   │   │
│  │  │      $80K ┤                      ╭────╯        │  │   │   │
│  │  │      $60K ┤                  ╭──╯            │  │   │   │
│  │  │      $40K ┤              ╭────╯               │  │   │   │
│  │  │      $20K ┤         ╭───╯                   │  │   │   │
│  │  │         0 ┼────┬────┬────┬────┬────┬────┬────┤  │   │   │
│  │  │            M1   M2   M3   M4   M5   M6   M12   │  │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │                                                 │   │   │
│  │  │     CUSTOMER GROWTH CHART (Line)                │   │   │
│  │  │      1200 ┤                                  ╭╮  │   │   │
│  │  │      1000 ┤                              ╭────╯│  │   │   │
│  │  │       800 ┤                          ╭────╯    │  │   │   │
│  │  │       600 ┤                      ╭────╯        │  │   │   │
│  │  │       400 ┤                  ╭───╯             │  │   │   │
│  │  │       200 ┤          ╭───────╯                 │  │   │   │
│  │  │         0 ┼────┬────┬────┬────┬────┬────┬────┤  │   │   │
│  │  │            M1   M2   M3   M4   M5   M6   M12   │  │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Specifications

### 1. Header Component
- **Height**: Auto (padding: 40px top, 20px bottom)
- **Background**: Transparent or subtle gradient
- **Elements**:
  - H1: "Subscription Revenue Simulator" (2.5rem, bold)
  - Subtitle: "Basic SaaS revenue calculations and projections" (1.1rem)
- **Alignment**: Center

### 2. Input Section Component
- **Background**: White card with shadow
- **Padding**: 30px
- **Border Radius**: 12px
- **Grid**: 3 columns on desktop, 1 column on mobile
- **Input Fields**:
  - Monthly Price: Number input, min=1, default=99
  - Churn Rate: Number input, min=0, max=100, step=0.1, default=5
  - Ad Spend: Number input, min=0, step=100, default=5000
  - Growth Rate: Number input, min=0, max=100, step=0.1, default=10
  - Initial Customers: Number input, min=0, default=100
  - CAC: Number input, min=0, step=10, default=500
- **Button**: 
  - Text: "Calculate Projections"
  - Style: Primary (blue gradient)
  - Size: Large (padding: 14px 28px)

### 3. Metrics Cards Component
- **Layout**: 4-column grid (responsive)
- **Card Style**:
  - Background: Light gray (#f7fafc)
  - Border: 1px solid #e2e8f0
  - Border Radius: 12px
  - Padding: 25px
  - Text Align: Center
- **Metric Display**:
  - Label: Uppercase, small, gray
  - Value: Large (2rem), bold, dark
  - Subtitle: Italic, small, lighter gray

### 4. Charts Section Component
- **Chart Containers**:
  - Background: White
  - Border: 1px solid #e2e8f0
  - Border Radius: 12px
  - Padding: 20px
  - Height: 300px fixed
  - Margin Bottom: 20px
- **Chart Types**:
  - Revenue: Line or Bar chart
  - Customers: Line chart

## Responsive Breakpoints

### Desktop (>768px)
- Input grid: 3 columns
- Metrics: 4 columns
- Charts: Full width, side by side possible

### Mobile (≤768px)
- Input grid: 1 column
- Metrics: 2 columns (or stack)
- Charts: Full width, stacked
- Container padding: 10px

## Color Scheme

### Primary Colors
- Background: #f8fafc (light gray-blue)
- Primary Button: #3182ce (blue)
- Primary Hover: #2c5aa0 (darker blue)
- Text Primary: #2d3748 (dark gray)
- Text Secondary: #718096 (medium gray)

### Metric Card Colors
- Background: #f7fafc
- Border: #e2e8f0
- Value Text: #2d3748
- Label Text: #718096

### Chart Colors
- Revenue Line: #3182ce (blue)
- Customer Line: #48bb78 (green)
- Grid Lines: #e2e8f0
- Background: white

## Typography

- **Font Family**: System font stack (-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto)
- **H1**: 2.5rem, bold
- **H2**: 1.8rem, semibold, with bottom border
- **Body**: 1rem, normal
- **Labels**: 0.9rem, semibold
- **Metric Values**: 2rem, bold
- **Metric Labels**: 0.9rem, uppercase, tracking wide

## Interactions

### Input Fields
- **Focus**: Blue border (#3182ce), subtle shadow
- **Hover**: Slight border color change
- **Validation**: Red border for errors

### Button
- **Default**: Blue background, white text
- **Hover**: Darker blue, lift effect (translateY -1px), shadow
- **Active**: Scale down slightly
- **Loading**: Pulse animation (optional for future)

### Metric Cards
- **Hover**: Lift effect (translateY -2px), enhanced shadow
- **Transition**: 0.3s ease

### Charts
- **Hover**: Tooltips showing exact values
- **Animation**: Smooth line drawing on load

## Accessibility

- All inputs have associated labels
- Color contrast meets WCAG 2.1 AA standards
- Keyboard navigation supported
- Focus indicators visible
- Screen reader friendly structure

## File Structure

```
project/
├── index.html          (main HTML structure)
├── styles.css          (all styling)
├── script.js           (calculations and chart rendering)
├── wireframes.md       (this document)
└── README.md           (documentation)
```

## Implementation Notes

1. Use CSS Grid for responsive layouts
2. Chart.js for chart rendering
3. No external CSS frameworks (vanilla CSS)
4. Mobile-first responsive design
5. Clean, minimal animations (performance focused)

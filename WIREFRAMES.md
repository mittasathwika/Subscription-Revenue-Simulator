# Phase 1 Wireframes - Subscription Revenue Simulator

## Overview
Simple, functional UI focused on core revenue calculations and basic visualizations.

---

## Wireframe 1: Main Calculator Page

```
┌─────────────────────────────────────────────────────────────┐
│  Subscription Revenue Simulator - Phase 1                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ INPUT PANEL                                         │   │
│  │                                                     │   │
│  │  Monthly Price:        [$______] / month            │   │
│  │                                                     │   │
│  │  Monthly Churn Rate:   [____]%                     │   │
│  │                                                     │   │
│  │  Monthly Ad Spend:     [$______]                   │   │
│  │                                                     │   │
│  │  Growth Rate:          [____]%                     │   │
│  │                                                     │   │
│  │  Initial Customers:    [______]                    │   │
│  │                                                     │   │
│  │  Customer CAC:         [$______]                   │   │
│  │                                                     │   │
│  │  ┌───────────────────────────────┐                 │   │
│  │  │  [  Calculate Projections  ]  │                 │   │
│  │  └───────────────────────────────┘                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ KEY METRICS (Read-Only)                             │   │
│  │                                                     │   │
│  │  LTV:            $____.__                           │   │
│  │  ARR:            $____.__                           │   │
│  │  LTV/CAC Ratio:  __.__                              │   │
│  │  Payback Period: __.__ months                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ CHARTS                                              │   │
│  │                                                     │   │
│  │  ┌───────────────────────────────────────────────┐ │   │
│  │  │                                               │ │   │
│  │  │   12-Month Revenue Projection                 │ │   │
│  │  │   [Line Chart - Revenue over 12 months]       │ │   │
│  │  │                                               │ │   │
│  │  └───────────────────────────────────────────────┘ │   │
│  │                                                     │   │
│  │  ┌───────────────────────────────────────────────┐ │   │
│  │  │                                               │ │   │
│  │  │   12-Month Customer Growth                    │ │   │
│  │  │   [Line Chart - Customers over 12 months]     │ │   │
│  │  │                                               │ │   │
│  │  └───────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Wireframe 2: Validation Error State

```
┌─────────────────────────────────────────────────────────────┐
│  Subscription Revenue Simulator - Phase 1                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ INPUT PANEL                                         │   │
│  │                                                     │   │
│  │  Monthly Price:        [$__0___] / month  ❌        │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ ⚠️ Price must be greater than 0              │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  Monthly Churn Rate:   [_150_]%          ❌        │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ ⚠️ Churn rate must be between 0% and 100%    │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  [Other inputs disabled until errors fixed]        │   │
│  │                                                     │   │
│  │  ┌───────────────────────────────────────────────┐ │   │
│  │  │  [  Calculate Projections  ] (Disabled)       │ │   │
│  │  └───────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Wireframe 3: Results Display State

```
┌─────────────────────────────────────────────────────────────┐
│  Subscription Revenue Simulator - Phase 1                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Input panel remains visible with entered values]           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✅ PROJECTIONS CALCULATED                           │   │
│  │                                                     │   │
│  │  KEY METRICS:                                       │   │
│  │  ┌──────────┬──────────┬──────────┬──────────┐       │   │
│  │  │   LTV    │   ARR    │ LTV/CAC  │ Payback  │       │   │
│  │  ├──────────┼──────────┼──────────┼──────────┤       │   │
│  │  │ $500.00  │ $12,000  │   5.0    │  2.0 mo  │       │   │
│  │  └──────────┴──────────┴──────────┴──────────┘       │   │
│  │                                                     │   │
│  │  12-MONTH PROJECTION TABLE:                         │   │
│  │  ┌───────┬───────────┬───────────┬───────────┐      │   │
│  │  │ Month │ Customers │  Revenue  │   Churn   │      │   │
│  │  ├───────┼───────────┼───────────┼───────────┤      │   │
│  │  │   1   │    100    │  $1,000   │     5     │      │   │
│  │  │   2   │    108    │  $1,080   │     5     │      │   │
│  │  │  ...  │    ...    │   ...     │    ...    │      │   │
│  │  │  12   │    245    │  $2,450   │    12     │      │   │
│  │  └───────┴───────────┴───────────┴───────────┘      │   │
│  │                                                     │   │
│  │  [CHART 1: Revenue Line Graph]                     │   │
│  │  [CHART 2: Customer Growth Line Graph]             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Responsive Behavior

### Desktop (>1024px)
- Input panel on left (40% width)
- Charts and metrics on right (60% width)
- Side-by-side chart layout

### Tablet (768px - 1024px)
- Input panel full width
- Metrics in 2x2 grid
- Charts stacked vertically

### Mobile (<768px)
- Single column layout
- Collapsible sections
- Full-width inputs
- Charts below fold

---

## Component Specifications

### Input Fields
- Type: Number inputs with validation
- Labels: Left-aligned, bold
- Error states: Red border + tooltip
- Success states: Green checkmark

### Buttons
- Primary: Calculate (Green/Blue)
- Disabled state: Grayed out
- Hover: Slight darken

### Charts (Chart.js)
- Revenue: Line chart (blue gradient)
- Customers: Line chart (green gradient)
- Grid: Light gray
- Legend: Bottom-aligned

### Metrics Cards
- 4-card grid layout
- Large number display
- Label below
- Color-coded (LTV=green, ARR=blue, etc.)

---

## Phase 1 Design Principles

1. **Function over Form** - Simple, clean UI
2. **Clear Feedback** - Validation messages, loading states
3. **Data-First** - Charts and metrics prominent
4. **No Animations** - Static, fast rendering
5. **Single Action** - Calculate button triggers all updates

---

*Wireframes created for Phase 1 MVP - Core Functionality*

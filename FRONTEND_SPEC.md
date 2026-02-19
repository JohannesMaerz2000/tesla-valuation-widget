# Tesla Quick Valuation App - Frontend Specification

## Overview
A React-based web application that provides transparent, real-time Tesla Model 3 and Model Y valuations based on actual B2B auction data. The app implements a "Glass Box" approach where users can see exactly how their valuation is calculated

## Tech Stack
- **Framework**: React 19 with Vite 7
- **Styling**: Pure CSS (no frameworks)
- **State Management**: React useState + useMemo hooks
- **Data**: Static JSON file (715 auction records)

## Project Structure
```
tesla-valuation-app/
├── src/
│   ├── data/
│   │   └── auctions.json           # Cleaned auction data (715 records)
│   ├── utils/
│   │   └── valuationAlgorithm.js   # Core valuation logic
│   ├── App.jsx                     # Main app with all components
│   ├── App.css                     # All styles
│   ├── index.css                   # Base reset
│   └── main.jsx                    # React entry point
├── index.html
├── package.json
└── vite.config.js
```

---

## Layout Architecture

### Two-Panel Layout
```
┌─────────────────────────────────────────────────────────────┐
│                        HEADER                                │
│              Tesla Quick Valuation                           │
├──────────────────┬──────────────────────────────────────────┤
│                  │                                           │
│   CONFIGURATOR   │         VALUATION DISPLAY                 │
│   (Left Panel)   │         (Estimated Value)                 │
│   380px fixed    │                                           │
│   sticky         │─────────────────────────────────────────│
│                  │                                           │
│                  │         COMPARABLE CARS                   │
│                  │         (Best Matches Grid)               │
│                  │                                           │
├──────────────────┴──────────────────────────────────────────┤
│                        FOOTER                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. CarConfigurator (Left Panel)
Sticky sidebar for configuring the target car. Changes trigger live recalculation.

#### Configuration Fields:

| Section | Field | Type | Options |
|---------|-------|------|---------|
| **Basic Info** | Model | Button Group | Model 3, Model Y |
| | Variant | Button Group | Standard Range, Long Range, Performance |
| | First Registration | Dropdowns | Month (Jan-Dec) + Year (2019-2025) |
| | Mileage | Number Input | 0-500,000 km |
| **Generation & Tax** | Highland | Button Group | Pre-Highland, Highland (M3 only) |
| | Tax Type | Button Group | Private/Margin, Company/VAT |
| **Condition** | Accident History | Button Group | Accident Free, Has Accident |
| **Equipment** | Autopilot | Button Group | Standard, Enhanced (EAP), Full Self-Driving |
| | Tires | Button Group | 4 Summer, 4 Winter, 4 All-Season, 8 Tires |
| | Heat Pump | Button Group | No Heat Pump, Has Heat Pump |
| | Trailer Hitch | Button Group | No Hitch, Has Hitch |

#### State Shape:
```javascript
{
  model: 'Model 3',              // 'Model 3' | 'Model Y'
  variant_clean: 'm3_lr',        // 'm3_sr' | 'm3_lr' | 'm3_p' | 'my_sr' | 'my_lr' | 'my_p'
  is_highland: false,            // boolean
  tax_type: 'margin',            // 'margin' | 'vat'
  is_accident_free: true,        // boolean
  autopilot: 'Standard',         // 'Standard' | 'EAP' | 'FSD'
  tire_strategy: '4_summer',     // '4_summer' | '4_winter' | '4_all_season' | '8_tires'
  has_heatpump: true,            // boolean
  has_hitch: false,              // boolean
  mileage: 50000,                // integer (km)
  first_registration_year: '2022',
  first_registration_month: '06'
}
```

### 2. ValuationDisplay (Right Panel - Top)
Shows the calculated valuation result.

#### Elements:
- **Accident Warning Banner** (conditional): Yellow warning if car has accident history
- **Price Display**: Large centered price in EUR (€XX,XXX)
- **Confidence Range**: Min-Max range from neighbors
- **Valuation Meta**: 3-column grid showing:
  - Your Car Age (months)
  - Comparables Found (cohort size)
  - Best Matches Used (K neighbors)
- **Why This Price**: Explanation text box

### 3. ComparableCars (Right Panel - Bottom)
Grid of comparable auction cards used in the valuation.

#### Card Structure (per neighbor):
```
┌─────────────────────────────────────────┐
│ #1 Match                    Weight: 85% │  ← Header (color-coded by rank)
├─────────────────────────────────────────┤
│ Sold Price:           €24,500           │  ← Price section
│ Adjusted Price:       €25,200           │
├─────────────────────────────────────────┤
│ Mileage: 45k km    │ Age: 36 months     │  ← Details grid (2 cols)
│ Auction: 15.01.26  │ Status: Sold       │
│ Trust Tier: Tier 1 │                    │
├─────────────────────────────────────────┤
│ DISTANCE PENALTIES                      │  ← Penalties table
│ Factor      │ Difference  │ Penalty     │
│ Mileage     │ 5k km       │ 10.0        │
│ Age         │ 2 months    │ 25.2        │
│ ...         │ ...         │ ...         │
│ TOTAL       │             │ 156.3       │
├─────────────────────────────────────────┤
│ PRICE ADJUSTMENTS                       │  ← Adjustments table
│ Factor      │ Reason           │ Adj    │
│ Mileage     │ Comp has 5k more │ +€250  │
└─────────────────────────────────────────┘
```

---

## Valuation Algorithm (valuationAlgorithm.js)

### Constants
```javascript
// Distance Weights
WEIGHTS = {
  M3_MILEAGE_PENALTY_PER_KM: 0.0020,
  MY_MILEAGE_PENALTY_PER_KM: 0.0025,
  M3_AGE_PENALTY_PER_MONTH: 12.6,
  MY_AGE_PENALTY_PER_MONTH: 17.1,
  RECENCY_PENALTY_PER_DAY: 0.49,
  TIRE_MISMATCH_8_VS_4: 32,
  TIRE_MISMATCH_4_VS_8: 22,
  TIRE_TYPE_MISMATCH: 15,
  HEAT_PUMP_MISMATCH: 34,
  AUTOPILOT_MISMATCH: 44,
  TRUST_TIER_2_PENALTY: 20,
  TRUST_TIER_3_PENALTY: 123,
}

// Price Adjustments
PRICE_ADJUSTMENTS = {
  M3_MILEAGE_ADJ_PER_KM: 0.05,  // €0.05/km
  MY_MILEAGE_ADJ_PER_KM: 0.08,  // €0.08/km
  HITCH_ADJ: 250                 // €250 fixed
}

IDW_POWER = 2.8    // Inverse Distance Weighting power
K_NEIGHBORS = 3    // Number of neighbors to use
```

### Algorithm Flow

#### 1. Hard Filters (Cohort Selection)
Only cars matching ALL criteria are considered:
- Same `model` (Model 3 or Model Y)
- Same `variant_clean` (e.g., m3_lr)
- Same `is_highland` value
- Same `tax_type` (margin or vat)
- `is_accident_free === true` (comparables must be clean)
- Has valid `final_price`

#### 2. Distance Calculation
For each car in cohort, calculate distance score (lower = better match):

```javascript
score = 0
score += |target.mileage - comp.mileage| * MILEAGE_PENALTY
score += |target.age_months - comp.age_at_auction_months| * AGE_PENALTY
score += days_since_auction * RECENCY_PENALTY
score += tire_mismatch_penalty
score += heatpump_mismatch_penalty
score += autopilot_mismatch_penalty
score += trust_tier_penalty
```

#### 3. Select K Nearest Neighbors
Sort by distance, take top 3.

#### 4. Price Adjustment
For each neighbor, adjust their sold price to match target car:
```javascript
adjusted_price = original_price
adjusted_price += (comp.mileage - target.mileage) * MILEAGE_ADJ_RATE
adjusted_price += hitch_adjustment  // ±€250
```

#### 5. Weighted Average (IDW)
```javascript
weight = 1 / (distance + epsilon)^2.8
estimated_value = sum(adjusted_price * weight) / sum(weight)
```

### Return Object
```javascript
{
  estimated_value: 25000,           // Final valuation
  confidence_range: {
    min: 23500,
    max: 26200
  },
  neighbors: [                      // Array of K neighbors with full details
    {
      auction_id: '...',
      distance: 156.3,
      penalties: [...],             // Breakdown of each penalty
      original_price: 24500,
      adjusted_price: 25200,
      price_adjustments: [...],     // Breakdown of adjustments
      weight: 0.85,
      weight_percentage: '85.0',
      // ...all original auction fields
    }
  ],
  cohort_size: 47,                  // Total comparables found
  target_age_months: 38,
  error: null                       // Or error message if no comparables
}
```

---

## Styling (App.css)

### CSS Variables
```css
:root {
  --tesla-red: #e82127;
  --tesla-dark: #171a20;
  --tesla-light: #f4f4f4;
  --success-green: #10b981;
  --warning-yellow: #f59e0b;
  --error-red: #ef4444;
  --tier-1: #22c55e;      /* Green - best match */
  --tier-2: #eab308;      /* Yellow - good match */
  --tier-3: #ef4444;      /* Red - okay match */
  --border-color: #e5e7eb;
}
```

### Key Layout Rules
- Left panel: 380px fixed width, sticky positioning
- Right panel: Flexible width
- Comparables grid: `auto-fit, minmax(320px, 1fr)` for responsive cards
- Compact spacing throughout (padding ~0.5-1rem, gaps ~0.35-0.75rem)
- Small font sizes (0.65rem - 0.95rem range)

### Visual Indicators
- **Rank colors**: #1=green, #2=yellow, #3=red borders
- **Trust Tier colors**: Tier 1=green, Tier 2=yellow, Tier 3=red text
- **Status colors**: Sold=green, Declined=yellow
- **Penalties**: Red background for rows with penalty > 0
- **Price adjustments**: Green for positive, red for negative

---

## Data Schema (auctions.json)

Each auction record:
```javascript
{
  auction_id: "uuid",
  model: "Model 3",                    // "Model 3" | "Model Y"
  variant_clean: "m3_lr",              // Power-based cluster ID
  is_highland: false,                  // Highland generation flag
  tax_type: "margin",                  // "margin" | "vat"
  is_accident_free: true,              // Both seller + cardentity confirmed
  tire_strategy: "4_summer",           // Tire configuration
  has_hitch: false,                    // Trailer hitch
  autopilot: "Standard",               // "Standard" | "EAP" | "FSD"
  has_heatpump: true,                  // Hardware generation marker
  mileage: 50000,                      // km
  age_at_auction_months: 36,           // Pre-calculated
  first_registration: "2022-06-01",
  end_time: "2026-01-15T10:00:00",     // Auction end timestamp
  final_price: 25000.0,                // Highest bid (EUR)
  status: "closed_seller_accepted",    // Auction outcome
  number_of_bids: 4,
  trust_tier: "Tier 1"                 // Pre-calculated trust level
}
```

---

## Running the App

```bash
cd tesla-valuation-app
npm install
npm run dev
# Opens at http://localhost:5173 (or next available port)
```

## Build for Production
```bash
npm run build
# Output in dist/ folder
```

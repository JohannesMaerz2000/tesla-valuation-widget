# Data & Valuation Algorithm Documentation

This document explicitly outlines the process for pulling data from the AWS S3 bucket, translating it into the application's JSON format, and the internal workings of the valuation algorithm.

## 1. Data Processing Pipeline (ETL)

### 1.1 Pulling Data from S3
The original auction data is stored as PostgreSQL database dumps in an Amazon S3 Bucket. The manual or automated process requires downloading these raw `.sql` files onto the local machine's `/tmp` directory.
- `deal.sql`: Contains the physical characteristics and configurations of the vehicles.
- `auction.sql`: Contains the end-of-sale pricing, timestamps, and bidding activity.

### 1.2 Translation Layer to JSON (`etl.cjs`)
To optimize frontend performance and completely bypass runtime database query latency, the raw SQL dumps are processed into a highly optimized, flat JSON file (`tesla_data.json`) which is served statically alongside the serverless function. 

The `etl.cjs` script executes the following translation steps:
1. **Streaming Reads**: It streams the massive `.sql` dumps line by line (bypassing Node.js memory limits) and extracts `INSERT INTO...` array payloads.
2. **String Parsing**: Uses a custom parser (`parsePostgresValues`) to correctly handle PostgreSQL literals, quotes, and `NULL` values.
3. **Filtering**: Restricts the parsing exclusively to records matching the `Tesla Model 3` and `Model Y`.
4. **Feature Engineering**: 
   - **Variant Deduction**: Because raw variant strings are chaotic in the database, the script checks the `power_kw` output (e.g., 208-239kW) to confidently assign standardized variants like `m3_sr` (Standard Range) or `my_p` (Performance).
   - **Tire & Tax Strategy**: Condenses complex tire arrays into simplified flags (4 vs 8 tires). Identifies if a sale is `VAT` deductible or `Margin`.
   - **Integrity**: Asserts that a car is completely accident-free using both the seller's claim and CarDentity verification flags.
5. **Relational Joining**: Links the `auction.sql` pricing and status exactly to the `deal.sql` car profile using the `deal_id` foreign key.
6. **Trust Tier Allocation**: Assigns a reliability "Trust Tier" based on whether a car actually sold or was declined by the seller (Tier 1: Accepted, Tier 2: Declined but competitive action, Tier 3: Declined with <=1 bid).
7. **Export**: Flushes the fully merged JavaScript Map into the static, minimified `tesla_data.json` payload.

## 2. Evaluation Algorithm (`src/utils/valuationAlgorithm.js`)

The actual valuation calculation executes within the serverless architecture via `api/valuate.js` when the frontend widget makes a POST request. It is a K-Nearest Neighbors (KNN) model configured specifically for Tesla depreciation dynamics.

### Phase A: Hard Filters (Cohort Filtering)
Before scoring any neighbor, the vast datastore is sliced down to only include perfectly matching "cohort" comparables. Candidates MUST identically match the user's input target on:
- Model (`Model 3` or `Model Y`)
- Variant (`Standard Range`, etc.)
- Highland Status (Pre-refresh vs Highland)
- Tax Type (`VAT` vs `Margin`)
- Condition: Must be completely accident-free.

### Phase B: Distance Penalty Scoring
Once a filtered cohort is established, the algorithmic model calculates how "far" each historically sold car is from the target car. A baseline score begins at 0. Distance penalties are incrementally added for every discrepancy. Lower scores are vastly superior.
- **Mileage**: Adds `0.0020` (M3) or `0.0025` (MY) penalty points per km difference.
- **Age**: Adds `12.6` (M3) or `17.1` (MY) penalty points per month of age difference.
- **Recency Decay**: Adds `0.49` points per day since the historic auction successfully ended (recent data has absolute priority over old data).
- **Hardware Penalties**: Specific lump penalties for differences in Tires (`15-32` pts), Heat Pump (`34` pts), and Autopilot capabilities (`44` pts).
- **Trust Tier Adjustments**: Penalized aggressively if a historic sale was outright declined and had weak bidding (up to `123` pts), actively de-risking the final estimate from untrustworthy sellers holding out for unrealistic sums.

### Phase C: Price Adjustment & Appraisal
1. **Selection**: The algorithm trims the ranked cohort down to the Top K (`K=3`) neighbors possessing the absolute lowest distance scores.
2. **Standardization**: Minor linear price adjustments are mathematically applied to the neighbors to simulate an identical match. For example, bumping a neighbor's price up or down by `€0.05/km` to bridge a 50,000km gap, or subtracting `€250` if the comparable uniquely boasts a trailer hitch.
3. **Inverse Distance Weighting (IDW)**: The 3 standardized prices are unified using an Inverse Distance Weighted average (power curve set to `2.8`). This ensures the visually closest matching neighbor pulls the lion's share of the final calculation weight. This weighted sum outputs the final "Estimated Value" presented natively inside the UI.

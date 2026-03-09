# Tesla Valuation Widget - Unified Context

## 1. Project Overview & Philosophy
A React-based web application tailored as an embeddable widget for Webflow. It provides transparent, real-time valuations for Tesla Model 3 and Model Y vehicles based on actual B2B auction data. The core philosophy is **"Trust through Transparency" (Glass Box)**: users can see exactly which past sales ("Neighbors") drove their estimated value, avoiding black-box ML models.

## 2. Technical Architecture & Deployment
- **Tech Stack**: React 19, Vite 7 (configured for single-file assets without hash strings), Pure CSS (no frameworks to avoid conflicts).
- **State Management**: standard React hooks (`useState`, `useEffect` for async API fetching).
- **Data Source**: To ensure high performance and minimal latency, the valuation algorithm no longer queries the S3 bucket or raw SQL dynamically on every request. Instead, an `etl.cjs` script runs locally to extract, filter (Tesla models only), and merge the `deal.sql` and `auction.sql` dumps into a highly-optimized, static `tesla_data.json` file (~2.5 MB).
  - **Updating the Dataset**: To pull new data from the database and rebuild the dataset, you need to download the latest `.sql` dumps from the S3 bucket to your `/tmp` directory and run the ETL script. Assuming your AWS CLI is authenticated, you can do this all in one command from the project root:
    ```bash
    aws s3 cp s3://db-dump-valuation/auction.sql /tmp/auction.sql && aws s3 cp s3://db-dump-valuation/deal.sql /tmp/deal.sql && npm run data:update
    ``` 
- **Backend Architecture**: A Vercel serverless function (`api/valuate.js`) loads `tesla_data.json` on the server edge. It receives the target car configuration via POST requests and runs the calculation algorithm on the server, ensuring a 0ms database lookup latency.
- **Webflow Integration Target**: The app mounts to a specific container (`#tesla-valuation-widget-container`) and acts as a single module injected into the Webflow site. Frontend and Serverless APIs are hosted together on Vercel.

## 3. UI/UX Specifications
Follows a compact, professional **Two-Panel Layout**:
- **Left Panel (Car Configurator)**: Sticky sidebar (380px wide). Includes all input fields: Model, Variant, Dates, Mileage, Highland presence, Tax Type, Condition (Accident-free), Autopilot level, Tires, Heat Pump, and Hitch. Changing these updates the valuation instantly.
- **Right Panel (Valuation & Comparables)**:
  - **Top**: Main valuation amount, confidence range (min-max), cohort metrics, and conditional warning banners (e.g., if target car is damaged).
  - **Bottom**: Grid showing "Comparable Cars" (Ranked #1, #2, etc.), showing actual price, adjusted price, matching score, the specific distance penalties, and price adjustments applied. Uses tiered colors (Green, Yellow, Red) for clarity.

## 4. Valuation Algorithm Specifications (`valuationAlgorithm.js`)

For an in-depth, low-level guide on how the S3 bucket SQL dumps are transformed via the ETL translation layer (`etl.cjs`) and the precise inner mechanics of the algorithm, please see [Data & Valuation Algorithm (data_and_algorithm.md)](./data_and_algorithm.md).

The calculation broadly relies on two distinct phases: **Hard Filtering** and **Weighted KNN Distance**.

### Phase A: Hard Filters (Cohort Selection)
A comparable auction MUST strictly match the target car on these dimensions:
1. **Model & Variant** (Variants use power-based kW clustering to avoid naming inconsistencies).
2. **Highland Generation** (Pre-Highland vs. Highland).
3. **Tax Type** (VAT/Company [Net basis] vs. Margin/Private [Gross basis]).
4. **Accident History**: We **only** learn from accident-free cars. If a user seeks a value for a damaged target vehicle, they receive a valuation based on undamaged comps, accompanied by a prominent markdown/warning.

### Phase B: Distance Score (KNN)
Calculates how far a historical sale is from the target. Lower score = better match.
- **Mileage Penalty**: Absolute difference weighted by ~0.0020 pts/km (M3) or ~0.0025 pts/km (MY).
- **Age Penalty**: ~12.6 pts/mo (M3) or ~17.1 pts/mo (MY).
- **Recency Decay**: 0.49 pts/day since the auction.
- **Hardware/Software Mismatches**: Heat Pump (34 pts), Autopilot (44 pts), Tire matching splits (15-32 pts).
- **Trust Tier Penalty**: 
  - *Tier 1 (Sold/Accepted)* = 0 penalty.
  - *Tier 2 (Declined, >3 Bids)* = 20 pts penalty.
  - *Tier 3 (Declined, ≤3 Bids)* = 123 pts penalty (prices seen as unreliable).

### Phase C: Price Adjustment & Appraisal
1. **Depreciation Adjustment**: Bring the comp's price closer to the target's hypothetical price. M3 adjusts by €0.05/km; MY by €0.08/km.
2. **Hitch Adjustment**: Adds/subtracts ~€250.
3. **Inverse Distance Weighting (IDW)**: Takes the K closest comparables and averages their adjusted prices heavily weighted toward the closest match (Power factor ~2.8).

## 5. Decision Log
- **Static Data JSON bundled in Serverless**: Chose to build an ETL parser to convert S3 PostgreSQL dumps into `tesla_data.json` rather than querying AWS S3 dynamically per request. This prevents cold start timeouts, high memory usage, and ensures very fast latency for the end user.
- **Number of Neighbors (K)**: The frontend implementation will display and average the top **3** neighbors for the final estimation and UI, resolving a previous discrepancy where the backend validation script tested up to 5.
- **Client-Side Thinning & Serverless Migration**: Shifted from a thick-client hybrid approach (which included dealer tools and loaded all data via `useMemo` in React) to a thin-client production approach. Admin tools and the massive `auctions.json` import were removed from the React bundle. State management was converted to `useEffect` to communicate exclusively with the `/api/valuate` serverless endpoint to maintain a lightweight bundle specifically tailored for the Webflow widget embed.

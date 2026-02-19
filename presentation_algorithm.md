# Tesla Valuation Algorithm: Presentation & Results

This document presents the performance of the valuation algorithm on the **20 most recent closed auctions** (Accepted or Declined). 

The goal is to demonstrate the system's accuracy and explain the underlying logic to ensure all assumptions align with business reality.

## 1. Valuation Results (Top 20 Recent Auctions)

**Methodology**:
*   **No Data Leakage**: For each car, we only use comparable sales that ended *before* this car's auction.
*   **Metric**: We compare our `Predicted Value` against the actual `Highest Bid`.
*   **Status**: Indicates if the seller accepted or declined that highest bid.

| Auction Date | Model | Variant | Status | Actual Highest Bid | Estimated Value | Diff |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-02-04 | Model 3 | Performance | Declined | €22,700 | **€25,461** | +12.2% |
| 2026-02-04 | Model 3 | Long Range | Declined | €22,300 | **€22,208** | -0.4% |
| 2026-02-04 | Model 3 | Long Range | Accepted | €16,700 | **€19,534** | +17.0% |
| 2026-02-03 | Model 3 | Standard | Declined | €11,800 | **€24,516** | +107.8% |
| 2026-02-03 | Model Y | Long Range | Declined | €22,600 | **€25,296** | +11.9% |
| 2026-02-02 | Model Y | Long Range | Accepted | €23,800 | **€25,067** | +5.3% |
| 2026-02-02 | Model Y | Standard | Declined | €26,800 | **€28,112** | +4.9% |
| 2026-02-02 | Model Y | Performance | Declined | €20,200 | **€22,125** | +9.5% |
| 2026-02-02 | Model Y | Long Range | Accepted | €34,200 | **€34,080** | -0.4% |
| 2026-02-02 | Model 3 | Standard | Accepted | €25,000 | **€25,027** | +0.1% |
| 2026-01-30 | Model Y | Standard | Declined | €34,500 | **€31,051** | -10.0% |
| 2026-01-30 | Model Y | Long Range | Accepted | €36,800 | **€36,230** | -1.6% |
| 2026-01-30 | Model 3 | Standard | Accepted | €19,200 | **€18,952** | -1.3% |
| 2026-01-29 | Model 3 | Standard | Declined | €18,800 | **€19,827** | +5.5% |
| 2026-01-29 | Model 3 | Performance | Accepted | €23,700 | **€25,190** | +6.3% |
| 2026-01-29 | Model 3 | Long Range | Declined | €19,300 | **€24,947** | +29.3% |
| 2026-01-29 | Model Y | Performance | Accepted | €35,200 | **€37,747** | +7.2% |
| 2026-01-29 | Model Y | Long Range | Declined | €35,200 | **€33,723** | -4.2% |
| 2026-01-29 | Model Y | Standard | Declined | €27,700 | **€29,208** | +5.5% |
| 2026-01-29 | Model Y | Standard | Accepted | €30,400 | **€30,539** | +0.5% |

**Summary Stats**:
*   **Median Error**: 5.46%
*   **Average Bias**: +10.25% (Algorithm tends to value cars slightly higher than the highest bid, especially on "Declined" cars where the bid might have been low).

---

## 2. Algorithm Logic & Assumptions

The algorithm is a "Glass Box" system designed to be fully transparent. It relies on finding the best real-world sales ("Neighbors") rather than using a black-box formula.

### A. The "Cohort" (Hard Filters)
Before valuing a car, we strictly filter the database to find a "Comparable Cohort". We **NEVER** cross these lines:
1.  **Model & Variant**: A Model 3 Long Range only compares to other Model 3 Long Ranges (defined by battery/power clusters, not just names).
2.  **Generation**: "Highland" Model 3s are a separate market. They do not mix with pre-Highland models.
3.  **Taxation**:
    *   **VAT/Company Cars** compare only with **VAT/Company Cars** (Net Price basis).
    *   **Private/Margin Cars** compare only with **Private/Margin Cars** (Gross Price basis).
4.  **Accident History**:
    *   The **Database of Comparables** contains **ONLY Accident-Free cars**. We do not learn prices from damaged vehicles.
    *   *Note: If a user values a damaged car, we value it as if it were clean and display a warning.*

### B. Finding the Best Match (Weighted KNN)
Within the Cohort, we calculate a "Distance Score" to find the **3 best matches**. The score is a penalty system where 0 is a perfect twin.

**Penalties (Distance Factors):**
1.  **Mileage**: Penalty for every km difference (~0.002 points/km).
2.  **Age**: Penalty for difference in age (~12-17 points/month). Matches compare "Age at Auction" vs "Age at Auction".
3.  **Recency**: Penalty for older auctions (~0.49 points/day). We prefer sales from last week over sales from last month.
4.  **Hardware/Software**:
    *   **Heat Pump**: Huge penalty if this key hardware is missing/different.
    *   **Autopilot**: Huge penalty for mismatch (FSD vs Standard).
    *   **Tires**: Penalty for 4-tires vs 8-tires.
5.  **Market Trust (The "Trust Tier")**:
    *   **Tier 1 (Gold)**: SOLD status. (Zero Penalty).
    *   **Tier 2 (Silver)**: Declined, but had >3 bids. (Small Penalty).
    *   **Tier 3 (Bronze)**: Declined with ≤3 bids. (Huge Penalty - these prices are likely unreliable/too low).

### C. Price Normalization
Once the top 3 neighbors are found, we don't just take their average price. We adjust their prices to make them a "Perfect Twin" of the target car:

1.  **Depreciation Adjustment**:
    *   If the neighbor has *more* miles, we *add* value to its price (~€0.05 - €0.08 per km).
    *   If the neighbor has *fewer* miles, we *subtract* value.
2.  **Equipment Adjustment**:
    *   Trailer Hitch: Add/Subtract ~€250.
3.  **Final Calculation**:
    *   We calculate the weighted average of these adjusted prices, giving much more weight to the closest match (Inverse Distance Weighting)

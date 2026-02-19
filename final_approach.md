# Final Tesla Valuation Algorithm Approach

## 0. Project Context & Philosophy
**Goal**: Build a "Glass Box" valuation engine for Tesla Model 3 & Model Y. Unlike black-box ML models, this system must explain *why* a car is valued at a specific price by showing real, comparable market sales.

**Core Philosophy**: "Trust through Transparency."
*   **Data-Driven**: We base valuations on actual B2B auction results, not listing prices.
*   **Explainable**: The user sees the exact "neighbor" cars used to calculate their value.
*   **Conservative**: We prioritize "Sold" auction results and strict condition matching (Accident-Free) to prevent over-promising.

**The Solution**: A hybrid approach combining **Hard Filtering** (Cohort Selection) with a **Weighted KNN** (Distance Algorithm) to handle the nuances of EV valuation (Battery degradation, Autopilot software, Hardware generations).

## 1. Data Source & Translation Layer
We will use a direct **Translation Layer** to map the raw `auctions_latest_export.csv` to our internal valuation schema. This ensures future-proofing by keeping the transformation logic transparent and isolated.

**Input**: `auctions_latest_export.csv`
**Output**: Internal Valuation Object

### Mappings & Logic:
| Internal Attribute | Source Column | Transformation Logic |
| :--- | :--- | :--- |
| **Model** | `model` | Exact string match ("Model 3", "Model Y"). |
| **Variant (Trim)** | `power_kw`, `battery_capacity_netto`, `variant` | **Power-based Clustering** (Robust to naming changes):<br>• **Model 3 SR**: 208-239 kW<br>• **Model 3 LR**: 324-366 kW<br>• **Model 3 Perf**: 377-460+ kW<br>• **Model Y SR**: 220-255 kW<br>• **Model Y LR**: 378 kW<br>• **Model Y Perf**: 390+ kW |
| **Highland** | `variant`, `first_registration`, `power_kw` | **TRUE** if:<br>1. `variant` contains "Highland"<br>2. OR (Model 3 AND Year >= 2024 AND kW in {235, 461})<br>Else **FALSE**. |
| **Seller/Tax Type** | `seller_type`, `taxation` | **Company/VAT**: `seller_type`="company" OR `taxation`="vat_deductible" (Use **Net** Price logic)<br>**Private/Margin**: `seller_type`="private" (Use **Gross** Price logic) |
| **Accident Free** | `accident_free_seller`, `accident_free_cardentity` | **TRUE** only if `accident_free_seller`="t" AND `accident_free_cardentity`="t". |
| **Tires** | `tyres` (JSON) | Parse JSON list:<br>• Count items (1 or 2 sets).<br>• If 2 sets: "8 Tires"<br>• If 1 set: Identify type ("Summer", "Winter", "All-Season") |
| **Trailer Hitch** | `trailer_hitch_seller` | Boolean check (csv column often empty, rely on seller declaration). |
| **Autopilot** | `tesla_autopilot` | Map values:<br>• "Full self driving" → **FSD**<br>• "Enhanced" → **EAP**<br>• "Standard"/NaN → **Standard** |
| **Heat Pump** | `heatpump` | Boolean (`t`=True, `f`=False). Critical hardware generation marker. |
| **Mileage** | `mileage` | Integer (km). |
| **Relative Age** | `first_registration`, `end_time` | Calculate months between `first_registration` and `end_time` (Auction Date). |
| **Price** | `highest_bid_amount` | Float. |
| **Status/Bids** | `status`, `number_of_bids` | Used for Trust Tier logic (Accepted vs Declined & Bid Count). |

---

## 2. Hard Filters (The "Cohort")
These criteria MUST match exactly for a car to be considered a comparable.

1.  **Model**: Exact Match (e.g., Model 3 vs Model 3).
2.  **Trim/Variant**: Exact Cluster Match (e.g., Long Range vs Long Range).
3.  **Highland Generation**: Strict separation. Highland only compares with Highland.
4.  **Taxation Type**: Strict separation.
    *   **Company/VAT** cars only compare with other **Company/VAT** cars (Net Price basis).
    *   **Private/Margin** cars only compare with other **Private/Margin** cars (Gross Price basis).
5.  **Accident Free (Data Integrity)**: **STRICT FILTER**.
    *   **Comparables (The Database)**: We **ONLY use Accident-Free cars** as comparables.
    *   *Reasoning*: Damage is too individual (scratch vs total loss). We cannot reliably learn price patterns from damaged cars.
    *   **Target Car (The User's Input)**:
        *   **If User's Car is Clean**: Value normally against Clean comparables.
        *   **If User's Car has Accident**: Value it against **Clean** comparables to establish a "undamaged market value", then display a prominent **WARNING**: *"Your car is valued as if condition were perfect. Actual value will be significantly lower depending on damage severity."*

---

## 3. The "Distance" Algorithm (KNN)
We calculate a "Distance Score" to find the K-nearest neighbors. Lower score = better match.

**Optimized Weights (Based on Auto-Learning v2 - Feb 2026):**

1.  **Mileage Difference**:
    *   **Distance Penalty**: Absolute difference weighted by ~0.0020 (M3) / 0.0025 (MY) points per km.
2.  **Relative Age Difference**:
    *   Compare `Target Car Age (Today)` vs `Comparable Car Age (At Auction Date)`.
    *   **Linear Penalty**: ~12.6 (M3) / ~17.1 (MY) points per month difference.
    *   **Quadratic Penalty**: Extra penalty for age gaps to handle non-linear depreciation.
3.  **Recency (Time Decay)**:
    *   Penalty for older auctions: ~0.49 points per day since the auction happened. (Market is moving fast).
4.  **Tire Mismatch** (Asymmetric):
    *   Target (8) vs Comp (4): **High Penalty** (32 pts).
    *   Target (4) vs Comp (8): **Medium Penalty** (22 pts).
    *   Type Mismatch: **Low Penalty** (15 pts).
5.  **Heat Pump Mismatch (Hardware Generation)**:
    *   **High Penalty** (34 pts): Key hardware difference.
6.  **Autopilot Mismatch (Software)**:
    *   **Mismatch Penalty**: **High Penalty** (~44 pts).
7.  **Bid Seriousness (Status & Bid Count)**:
    *   We introduce a **"Trust Tier"** penalty based on `status` and `number_of_bids`:
    *   **Tier 1 (Gold): Accepted**: No Penalty. (Proven market value).
    *   **Tier 2 (Silver): Declined + > 3 Bids**: **Low Penalty** (~20 pts).
    *   **Tier 3 (Bronze): Declined + ≤ 3 Bids**: **High Penalty** (~123 pts).

---

## 4. Appraisal & Price Normalization
Once neighbors are found, we adjust their prices to perfect the match:

1.  **Mileage Adjustment (Depreciation)**:
    *   Adjust comparable price based on km difference.
    *   **Rates**: Model 3 (~€0.05/km), Model Y (~€0.08/km).
2.  **Trailer Hitch Adjustment**:
    *   Add/Subtract fixed value (~€192-300) if hitch presence differs.
3.  **Weighted Averaging**:
    *   Use inverse distance weighting (Power ~2.8) so the single best matches dominate the final price calculation.
4.  **Confidence Range**:
    *   Calculate min/max of the top neighbors to show a realistic range.

---

## 5. Trust & Transparency Output
To build customer trust, the algorithm will output:
*   **"Why this price?"**: "We found 7 similar Model Y Long Ranges sold in the last 3 months."
*   **The "Perfect Twin"**: Highlight the #1 match.
*   **Impact Factors**: Show exactly how Mileage (+€200) and Age (-€500) adjusted the value.
*   **Condition Warning**: If applicable (Accident), clearly state the valuation is for a damage-free condition.

---

## 6. Implementation
The final, optimized implementation of this algorithm can be found in:
`validate_algo.py`

This script contains the fully functional logic with the v3 optimized parameters (Min 3 Bids, Max 5 Neighbors) and can be run directly to validate performance against the dataset.

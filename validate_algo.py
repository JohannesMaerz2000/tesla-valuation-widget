import pandas as pd
import numpy as np
from datetime import datetime

# Configuration
INPUT_FILE = 'tesla_final_clean.csv'
TOP_N = 20

# Weights & Parameters
WEIGHTS = {
    'M3_MILEAGE_PENALTY_PER_KM': 0.0020,
    'MY_MILEAGE_PENALTY_PER_KM': 0.0025,
    'M3_AGE_PENALTY_PER_MONTH': 12.6,
    'MY_AGE_PENALTY_PER_MONTH': 17.1,
    'RECENCY_PENALTY_PER_DAY': 0.49,
    'TIRE_MISMATCH_8_VS_4': 32,
    'TIRE_MISMATCH_4_VS_8': 22,
    'TIRE_TYPE_MISMATCH': 15,
    'HEAT_PUMP_MISMATCH': 34,
    'AUTOPILOT_MISMATCH': 44,
    'TRUST_TIER_2_PENALTY': 20,
    'TRUST_TIER_3_PENALTY': 123,
}

PRICE_ADJUSTMENTS = {
    'M3_MILEAGE_ADJ_PER_KM': 0.05,
    'MY_MILEAGE_ADJ_PER_KM': 0.08,
    'HITCH_ADJ': 250
}

IDW_POWER = 2.8
K_NEIGHBORS = 3

def load_data():
    df = pd.read_csv(INPUT_FILE)
    df['end_time'] = pd.to_datetime(df['end_time'])
    # Ensure final_price is numeric
    df['final_price'] = pd.to_numeric(df['final_price'], errors='coerce')
    # Use 30.44 days per month for accurate calculations if needed, but 'age_at_auction_months' is already there
    return df

def calculate_distance(target, candidate):
    score = 0
    
    # 1. Mileage Difference
    mileage_diff = abs(target['mileage'] - candidate['mileage'])
    if target['model'] == 'Model 3':
        score += mileage_diff * WEIGHTS['M3_MILEAGE_PENALTY_PER_KM']
    else:
        score += mileage_diff * WEIGHTS['MY_MILEAGE_PENALTY_PER_KM']
        
    # 2. Relative Age Difference
    # Compare Target Age (Today/Now) vs Candidate Age (At Auction)
    # BUT: In this simulation, "Today" is the target's auction date.
    # So we compare Target's Age at its auction vs Candidate's Age at its auction.
    # This aligns effectively with "comparing comparable cars".
    # Wait, strict reading: "Target Car Age (Today) vs Comparable Car Age (At Auction Date)"
    # If I am simulating a past prediction, "Today" is the Target's auction end time.
    age_diff = abs(target['age_at_auction_months'] - candidate['age_at_auction_months'])
    if target['model'] == 'Model 3':
        score += age_diff * WEIGHTS['M3_AGE_PENALTY_PER_MONTH']
    else:
        score += age_diff * WEIGHTS['MY_AGE_PENALTY_PER_MONTH']
        
    # 3. Recency (Time Decay)
    # Days between Target Auction and Candidate Auction
    days_diff = (target['end_time'] - candidate['end_time']).days
    # Ensure we don't have negative days (future queries) - handled by filtering, but good to be safe
    days_diff = max(0, days_diff) 
    score += days_diff * WEIGHTS['RECENCY_PENALTY_PER_DAY']
    
    # 4. Tire Mismatch
    t_tire = target['tire_strategy']
    c_tire = candidate['tire_strategy']
    
    if t_tire == '8_tires' and c_tire != '8_tires':
        score += WEIGHTS['TIRE_MISMATCH_8_VS_4']
    elif t_tire != '8_tires' and c_tire == '8_tires':
        score += WEIGHTS['TIRE_MISMATCH_4_VS_8']
    elif t_tire != c_tire:
        score += WEIGHTS['TIRE_TYPE_MISMATCH']
        
    # 5. Heat Pump Mismatch
    if target['has_heatpump'] != candidate['has_heatpump']:
        score += WEIGHTS['HEAT_PUMP_MISMATCH']
        
    # 6. Autopilot Mismatch
    if target['autopilot'] != candidate['autopilot']:
        score += WEIGHTS['AUTOPILOT_MISMATCH']
        
    # 7. Trust Tier
    tier = candidate['trust_tier']
    if tier == 'Tier 2':
        score += WEIGHTS['TRUST_TIER_2_PENALTY']
    elif tier == 'Tier 3':
        score += WEIGHTS['TRUST_TIER_3_PENALTY']
        
    return score

def adjust_price(target, candidate):
    price = candidate['final_price']
    
    # 1. Mileage Adjustment
    # Target Price = Candidate Price + (Candidate Miles - Target Miles) * Rate
    mileage_delta = candidate['mileage'] - target['mileage']
    rate = PRICE_ADJUSTMENTS['M3_MILEAGE_ADJ_PER_KM'] if target['model'] == 'Model 3' else PRICE_ADJUSTMENTS['MY_MILEAGE_ADJ_PER_KM']
    price += mileage_delta * rate
    
    # 2. Trailer Hitch Adjustment
    # If Target has hitch and Candidate doesn't: Add value to candidate base
    if target['has_hitch'] and not candidate['has_hitch']:
        price += PRICE_ADJUSTMENTS['HITCH_ADJ']
    # If Target doesn't have hitch and Candidate does: Subtract value from candidate base
    elif not target['has_hitch'] and candidate['has_hitch']:
        price -= PRICE_ADJUSTMENTS['HITCH_ADJ']
        
    return price

def predict_valuation(target, data):
    # HARD FILTERS (Cohort)
    cohort = data[
        (data['model'] == target['model']) &
        (data['variant_clean'] == target['variant_clean']) &
        (data['is_highland'] == target['is_highland']) &
        (data['tax_type'] == target['tax_type']) &
        (data['is_accident_free'] == True) & # Comparables must be accident free
        (data['final_price'].notna()) & # Must have a price
        (data['end_time'] < target['end_time']) # NO DATA LEAKAGE: Only past auctions
    ].copy()

    # Exclude the target itself (redundant with end_time < target_end_time check if timestamps exact, but safe)
    cohort = cohort[cohort['auction_id'] != target['auction_id']]
    
    if len(cohort) == 0:
        return None, 0, []

    # Calculate Distances
    cohort['distance'] = cohort.apply(lambda row: calculate_distance(target, row), axis=1)
    
    # Sort by Distance
    cohort = cohort.sort_values('distance')
    
    # Select Top K
    neighbors = cohort.head(K_NEIGHBORS)
    
    if len(neighbors) == 0:
        return None, 0, []

    # Calculate Weighted Average
    # IDW: weight = 1 / (distance^p + epsilon)
    # Using a small epsilon to avoid div by zero if distance is 0
    epsilon = 1e-6
    neighbors['weight'] = 1 / ((neighbors['distance'] + epsilon) ** IDW_POWER)
    
    # Adjust Prices
    neighbors['adjusted_price'] = neighbors.apply(lambda row: adjust_price(target, row), axis=1)
    
    # Weighted Sum
    total_weight = neighbors['weight'].sum()
    predicted_price = (neighbors['adjusted_price'] * neighbors['weight']).sum() / total_weight
    
    return predicted_price, len(neighbors), neighbors[['auction_id', 'distance', 'adjusted_price']].to_dict('records')

def main():
    df = load_data()
    
    # Filter for Target Cars: "most recent 20 auctions that have been either sold or declined"
    # Statuses: 'sold', 'closed_seller_accepted' -> Sold
    # 'closed_seller_declined' -> Declined
    # We want these statuses.
    valid_statuses = ['sold', 'closed_seller_accepted', 'closed_seller_declined']
    # Start by checking what statuses actually exist
    # (Doing this blind, but I recall previous output showing 'active', 'preparation'. I assume the above form keys)
    # Let's filter loosely first
    targets = df[
        df['status'].str.contains('sold|accepted|declined', case=False, na=False) &
        df['final_price'].notna() # Must have a highest bid to compare against
    ].copy()
    
    # Sort by End Time Descending
    targets = targets.sort_values('end_time', ascending=False).head(TOP_N)
    
    results = []
    
    print(f"Analyzing top {len(targets)} most recent closed auctions...")
    
    for _, target in targets.iterrows():
        # Perform Valuation
        pred_price, num_neighbors, _ = predict_valuation(target, df)
        
        actual_price = target['final_price']
        
        if pred_price is not None:
            error = pred_price - actual_price
            error_pct = (error / actual_price) * 100  # (Pred - Actual) / Actual ?? Usually |Pred-Actual|/Actual for Mean Absolute % Error
            # User asked for "avg and median error rate".
            # Usually error rate implies absolute error. But "average error" might mean bias.
            # I'll calculate Absolute Error % for the "Error Rate" metric.
            abs_error_pct = abs(error_pct)
            
            results.append({
                'auction_id': target['auction_id'],
                'model': target['model'],
                'variant': target['variant_clean'],
                'end_time': target['end_time'],
                'status': target['status'],
                'actual_bid': actual_price,
                'predicted_bid': pred_price,
                'error_eur': error,
                'error_pct': abs_error_pct, # Absolute % Error
                'raw_error_pct': error_pct, # Signed % Error (for bias)
                'neighbors': num_neighbors
            })
        else:
            print(f"Skipping {target['auction_id']}: No comparables found.")

    # Results Analysis
    res_df = pd.DataFrame(results)
    
    if len(res_df) > 0:
        avg_error = res_df['error_pct'].mean()
        median_error = res_df['error_pct'].median()
        avg_bias = res_df['raw_error_pct'].mean()
        
        print("\n=== VALUATION RESULTS ===")
        print(f"Total Analyzed: {len(res_df)}")
        print(f"Average Absolute Error: {avg_error:.2f}%")
        print(f"Median Absolute Error: {median_error:.2f}%")
        print(f"Average Bias (Pred vs Actual): {avg_bias:.2f}% (Positive means over-prediction)")
        
        print("\n--- Detailed List ---")
        # Format for display
        pd.set_option('display.max_columns', None)
        pd.set_option('display.width', 1000)
        
        display_cols = ['end_time', 'model', 'variant', 'status', 'actual_bid', 'predicted_bid', 'error_pct']
        # formatting
        res_display = res_df[display_cols].copy()
        res_display['end_time'] = res_display['end_time'].dt.strftime('%Y-%m-%d')
        res_display['actual_bid'] = res_display['actual_bid'].apply(lambda x: f"€{x:,.0f}")
        res_display['predicted_bid'] = res_display['predicted_bid'].apply(lambda x: f"€{x:,.0f}")
        res_display['error_pct'] = res_display['error_pct'].apply(lambda x: f"{x:.2f}%")
        
        print(res_display.to_string(index=False))
        
        # Also save to CSV
        res_display.to_csv('valuation_results_summary.csv', index=False)
    else:
        print("No evaluations could be performed.")

if __name__ == "__main__":
    main()

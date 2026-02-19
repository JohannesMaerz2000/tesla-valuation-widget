import pandas as pd
import numpy as np
import random
import copy
from datetime import datetime

# Configuration
INPUT_FILE = 'tesla_final_clean.csv'
VALIDATION_SIZE = 50  # Number of recent "Gold/Silver" cars to test against
ITERATIONS = 300       # Number of random weight combinations to try

# Base Weights (Starting Point)
BASE_WEIGHTS = {
    'M3_MILEAGE_PENALTY_PER_KM': 0.0016,
    'MY_MILEAGE_PENALTY_PER_KM': 0.0035,
    'M3_AGE_PENALTY_PER_MONTH': 7.1,
    'MY_AGE_PENALTY_PER_MONTH': 17.6,
    'RECENCY_PENALTY_PER_DAY': 0.16,
    'TIRE_MISMATCH_8_VS_4': 45.0,
    'TIRE_MISMATCH_4_VS_8': 19.0,
    'TIRE_TYPE_MISMATCH': 15.0,
    'HEAT_PUMP_MISMATCH': 50.0,
    'AUTOPILOT_MISMATCH': 40.0,
    'TRUST_TIER_2_PENALTY': 40.0,
    'TRUST_TIER_3_PENALTY': 150.0,
    'K_NEIGHBORS': 7,
    'IDW_POWER': 3.5
}

# Search Ranges (Min, Max)
PARAM_RANGES = {
    'M3_MILEAGE_PENALTY_PER_KM': (0.001, 0.003),
    'MY_MILEAGE_PENALTY_PER_KM': (0.002, 0.005),
    'M3_AGE_PENALTY_PER_MONTH': (5.0, 15.0),
    'MY_AGE_PENALTY_PER_MONTH': (10.0, 25.0),
    'RECENCY_PENALTY_PER_DAY': (0.05, 0.5),
    'TIRE_MISMATCH_8_VS_4': (30.0, 60.0),
    'TIRE_MISMATCH_4_VS_8': (10.0, 30.0),
    'HEAT_PUMP_MISMATCH': (30.0, 80.0),
    'AUTOPILOT_MISMATCH': (20.0, 60.0),
    'TRUST_TIER_2_PENALTY': (20.0, 60.0),
    'TRUST_TIER_3_PENALTY': (100.0, 300.0),
    'K_NEIGHBORS': (3, 5), # Discrete, User constraint: max 5
    'IDW_POWER': (2.0, 5.0)
}

# Price Adjustments (Fixed for now, or could optimize)
PRICE_ADJUSTMENTS = {
    'M3_MILEAGE_ADJ_PER_KM': 0.05,
    'MY_MILEAGE_ADJ_PER_KM': 0.08,
    'HITCH_ADJ': 250
}

def load_data():
    df = pd.read_csv(INPUT_FILE)
    df['end_time'] = pd.to_datetime(df['end_time'])
    df['final_price'] = pd.to_numeric(df['final_price'], errors='coerce')
    # Filter out bad data
    df = df[df['final_price'].notna()].copy()
    return df

def get_validation_set(df, n=50):
    # Definition of "High Confidence" for VALIDATION targets
    # 1. Sold/Accepted
    # 2. Declined with >= 3 bids (User adjusted)
    # 3. Must be accident free (logic: we don't want to optimize for damaged cars)
    
    # Identify Sold
    sold_mask = df['status'].str.contains('sold|accepted', case=False, na=False)
    
    # Identify High-Bid Declined
    declined_mask = df['status'].str.contains('declined', case=False, na=False)
    high_bid_mask = pd.to_numeric(df['number_of_bids'], errors='coerce') >= 3
    
    valid_targets = df[
        ((sold_mask) | (declined_mask & high_bid_mask)) &
        (df['is_accident_free'] == True)
    ].copy()
    
    # Sort by recent
    return valid_targets.sort_values('end_time', ascending=False).head(n)

def calculate_distance(target, candidate, weights):
    score = 0
    
    # Mileage
    mileage_diff = abs(target['mileage'] - candidate['mileage'])
    if target['model'] == 'Model 3':
        score += mileage_diff * weights['M3_MILEAGE_PENALTY_PER_KM']
    else:
        score += mileage_diff * weights['MY_MILEAGE_PENALTY_PER_KM']
        
    # Age
    age_diff = abs(target['age_at_auction_months'] - candidate['age_at_auction_months'])
    if target['model'] == 'Model 3':
        score += age_diff * weights['M3_AGE_PENALTY_PER_MONTH']
    else:
        score += age_diff * weights['MY_AGE_PENALTY_PER_MONTH']
        
    # Recency
    days_diff = max(0, (target['end_time'] - candidate['end_time']).days)
    score += days_diff * weights['RECENCY_PENALTY_PER_DAY']
    
    # Tire
    t = target['tire_strategy']
    c = candidate['tire_strategy']
    if t == '8_tires' and c != '8_tires': score += weights['TIRE_MISMATCH_8_VS_4']
    elif t != '8_tires' and c == '8_tires': score += weights['TIRE_MISMATCH_4_VS_8']
    elif t != c: score += weights['TIRE_TYPE_MISMATCH']
        
    # Features
    if target['has_heatpump'] != candidate['has_heatpump']: score += weights['HEAT_PUMP_MISMATCH']
    if target['autopilot'] != candidate['autopilot']: score += weights['AUTOPILOT_MISMATCH']
    
    # Trust Tier
    tier = candidate['trust_tier']
    if tier == 'Tier 2': score += weights['TRUST_TIER_2_PENALTY']
    elif tier == 'Tier 3': score += weights['TRUST_TIER_3_PENALTY']
    
    return score

def predict(target, data, weights):
    # Cohort Filter
    cohort = data[
        (data['model'] == target['model']) &
        (data['variant_clean'] == target['variant_clean']) &
        (data['is_highland'] == target['is_highland']) &
        (data['tax_type'] == target['tax_type']) &
        (data['is_accident_free'] == True) &
        (data['end_time'] < target['end_time']) &
        (data['auction_id'] != target['auction_id'])
    ].copy()
    
    if len(cohort) == 0: return None
    
    # Distance
    cohort['distance'] = cohort.apply(lambda row: calculate_distance(target, row, weights), axis=1)
    
    # Top K
    k = int(weights['K_NEIGHBORS'])
    neighbors = cohort.sort_values('distance').head(k)
    
    if len(neighbors) == 0: return None
    
    # Weighting
    epsilon = 1e-6
    neighbors['weight'] = 1 / ((neighbors['distance'] + epsilon) ** weights['IDW_POWER'])
    
    # Price adjust
    neighbors['adjusted_price'] = neighbors['final_price'] # Simple start
    # Apply mileage adj
    for idx, n_row in neighbors.iterrows():
        m_delta = n_row['mileage'] - target['mileage']
        rate = PRICE_ADJUSTMENTS['M3_MILEAGE_ADJ_PER_KM'] if target['model'] == 'Model 3' else PRICE_ADJUSTMENTS['MY_MILEAGE_ADJ_PER_KM']
        neighbors.at[idx, 'adjusted_price'] += (m_delta * rate)
        
        # Hitch adj
        if target['has_hitch'] and not n_row['has_hitch']: neighbors.at[idx, 'adjusted_price'] += PRICE_ADJUSTMENTS['HITCH_ADJ']
        elif not target['has_hitch'] and n_row['has_hitch']: neighbors.at[idx, 'adjusted_price'] -= PRICE_ADJUSTMENTS['HITCH_ADJ']

    # Final
    total_w = neighbors['weight'].sum()
    pred = (neighbors['adjusted_price'] * neighbors['weight']).sum() / total_w
    
    return pred

def evaluate_weights(weights, validation_set, full_data):
    errors = []
    
    for _, target in validation_set.iterrows():
        pred = predict(target, full_data, weights)
        if pred:
            actual = target['final_price']
            error_pct = abs(pred - actual) / actual
            errors.append(error_pct)
            
    if not errors: return 1.0 # 100% error default
    return np.mean(errors)

def generate_random_weights():
    w = BASE_WEIGHTS.copy()
    for k, v in PARAM_RANGES.items():
        if isinstance(v[0], int):
            w[k] = random.randint(v[0], v[1])
        else:
            w[k] = random.uniform(v[0], v[1])
    return w

def main():
    print(f"Loading Data...")
    df = load_data()
    
    print(f"Selecting Validation Set (Sold + High-Bid Declined)...")
    val_set = get_validation_set(df, n=VALIDATION_SIZE)
    print(f"Validation Set Size: {len(val_set)}")
    
    print(f"Running Baseline...")
    base_error = evaluate_weights(BASE_WEIGHTS, val_set, df)
    print(f"Baseline Mean Absolute Error: {base_error*100:.2f}%")
    
    best_weights = BASE_WEIGHTS.copy()
    best_error = base_error
    
    print(f"Starting optimization ({ITERATIONS} iterations)...")
    for i in range(ITERATIONS):
        candidate_weights = generate_random_weights()
        error = evaluate_weights(candidate_weights, val_set, df)
        
        if error < best_error:
            best_error = error
            best_weights = candidate_weights
            print(f"New Best! Iter {i}: {best_error*100:.2f}%")
            
    print("\n=== OPTIMIZATION COMPLETE ===")
    print(f"Best Error: {best_error*100:.2f}%")
    print("Best Weights:")
    for k, v in best_weights.items():
        print(f"  {k}: {v}")

    # Save to file
    with open('optimized_params.txt', 'w') as f:
        f.write(str(best_weights))

if __name__ == "__main__":
    main()

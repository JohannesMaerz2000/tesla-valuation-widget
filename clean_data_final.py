import pandas as pd
import json
import numpy as np
from datetime import datetime

# Load Data
input_file = 'auctions_latest_export.csv'
output_file = 'tesla_final_clean.csv'

df = pd.read_csv(input_file)

# Filter for Tesla Model 3 and Model Y
df = df[df['model'].isin(['Model 3', 'Model Y'])].copy()

# Helper Functions
def determine_variant(row):
    model = row['model']
    kw = pd.to_numeric(row['power_kw'], errors='coerce')
    variant_str = str(row['variant'])
    
    if model == 'Model 3':
        if 208 <= kw <= 239:
            return 'm3_sr'
        elif 324 <= kw <= 366:
            return 'm3_lr'
        elif 377 <= kw or kw >= 460:
            return 'm3_p'
    elif model == 'Model Y':
        if 220 <= kw <= 255:
            return 'my_sr'
        elif kw == 378: # Strict check per doc, but maybe range?
            return 'my_lr'
        elif 370 <= kw <= 385: # Slightly wider range for MY LR just in case
             return 'my_lr'
        elif kw >= 390:
            return 'my_p'
            
    # Fallback to string matching if kw fails or as valid check? 
    # Doc says "Power-based Clustering (Robust to naming changes)" so priority is KW.
    return 'unknown'

def is_highland(row):
    # 1. variant contains "Highland"
    if 'Highland' in str(row['variant']):
        return True
    
    # 2. Model 3 AND Year >= 2024 AND kW in {235, 461}
    try:
        reg_year = pd.to_datetime(row['first_registration']).year
        kw = pd.to_numeric(row['power_kw'], errors='coerce')
        if row['model'] == 'Model 3' and reg_year >= 2024 and kw in [235, 461]:
            return True
    except:
        pass
    
    return False

def determine_tax_type(row):
    if row['seller_type'] == 'company' or row['taxation'] == 'vat_deductible':
        return 'vat' # Net Price Logic
    return 'margin' # Gross Price Logic

def parse_tires(json_str):
    try:
        tires = json.loads(json_str)
        if len(tires) == 2:
            return '8_tires'
        elif len(tires) == 1:
            # Assuming format [{'type': ...}]
            t_type = tires[0].get('type', 'unknown').lower()
            if 'summer' in t_type: return '4_summer'
            if 'winter' in t_type: return '4_winter'
            if 'season' in t_type: return '4_all_season'
    except:
        pass
    return 'unknown'

def determine_trust_tier(row):
    status = str(row['status'])
    bids = pd.to_numeric(row['number_of_bids'], errors='coerce')
    if pd.isna(bids): bids = 0
    
    if status in ['sold', 'closed_seller_accepted']: # Assuming these map to Accepted
        return 'Tier 1'
    elif 'declined' in status and bids > 1:
        return 'Tier 2'
    elif 'declined' in status and bids <= 1:
        return 'Tier 3'
    
    # Default for active/pending
    return 'Tier 3' 

# Apply Transformations
df['variant_clean'] = df.apply(determine_variant, axis=1)
df['is_highland'] = df.apply(is_highland, axis=1)
df['tax_type'] = df.apply(determine_tax_type, axis=1)
df['is_accident_free'] = (df['accident_free_seller'] == 't') & (df['accident_free_cardentity'] == 't')
df['tire_strategy'] = df['tyres'].apply(parse_tires)
df['has_hitch'] = df['trailer_hitch_seller'] == 't'
df['autopilot'] = df['tesla_autopilot'].replace({
    'Full self driving': 'FSD',
    'Enhanced': 'EAP', 
    'Standard': 'Standard'
}).fillna('Standard')
df['has_heatpump'] = df['heatpump'] == 't'

# Dates & Age
df['first_registration'] = pd.to_datetime(df['first_registration'])
df['end_time'] = pd.to_datetime(df['end_time'], utc=True).dt.tz_localize(None)
df['age_at_auction_months'] = ((df['end_time'] - df['first_registration']) / pd.Timedelta(days=30.44)).astype(int)

# Trust Tier
df['trust_tier'] = df.apply(determine_trust_tier, axis=1)

# Select & Rename Columns
final_cols = {
    'auction_id': 'auction_id',
    'model': 'model',
    'variant_clean': 'variant_clean',
    'is_highland': 'is_highland',
    'tax_type': 'tax_type',
    'is_accident_free': 'is_accident_free',
    'tire_strategy': 'tire_strategy',
    'has_hitch': 'has_hitch',
    'autopilot': 'autopilot',
    'has_heatpump': 'has_heatpump',
    'mileage': 'mileage',
    'age_at_auction_months': 'age_at_auction_months',
    'first_registration': 'first_registration',
    'end_time': 'end_time',
    'highest_bid_amount': 'final_price',
    'status': 'status',
    'number_of_bids': 'number_of_bids',
    'trust_tier': 'trust_tier'
}

df_final = df[list(final_cols.keys())].rename(columns=final_cols)

# Save
df_final.to_csv(output_file, index=False)
print(f"Successfully cleaned data. Saved {len(df_final)} rows to {output_file}")

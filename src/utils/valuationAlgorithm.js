// Tesla Valuation Algorithm - JavaScript Implementation
// Based on validate_algo.py with optimized parameters

// Weights & Parameters (from v2 optimization)
export const WEIGHTS = {
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
};

export const PRICE_ADJUSTMENTS = {
  M3_MILEAGE_ADJ_PER_KM: 0.05,
  MY_MILEAGE_ADJ_PER_KM: 0.08,
  HITCH_ADJ: 250
};

export const IDW_POWER = 2.8;
export const K_NEIGHBORS = 3;

// Variant display names
export const VARIANT_NAMES = {
  m3_sr: 'Model 3 Standard Range',
  m3_lr: 'Model 3 Long Range',
  m3_p: 'Model 3 Performance',
  my_sr: 'Model Y Standard Range',
  my_lr: 'Model Y Long Range',
  my_p: 'Model Y Performance'
};

export const VARIANT_SHORT_NAMES = {
  m3_sr: 'Standard Range',
  m3_lr: 'Long Range',
  m3_p: 'Performance',
  my_sr: 'Standard Range',
  my_lr: 'Long Range',
  my_p: 'Performance'
};

// Calculate months between two dates
function monthsBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  return Math.abs(months);
}

// Calculate days between two dates
function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Calculate distance score between target and candidate
export function calculateDistance(target, candidate, referenceDate = null) {
  const penalties = [];
  let score = 0;

  // 1. Mileage Difference
  const mileageDiff = Math.abs(target.mileage - candidate.mileage);
  const mileageRate = target.model === 'Model 3'
    ? WEIGHTS.M3_MILEAGE_PENALTY_PER_KM
    : WEIGHTS.MY_MILEAGE_PENALTY_PER_KM;
  const mileagePenalty = mileageDiff * mileageRate;
  score += mileagePenalty;
  penalties.push({
    factor: 'Mileage',
    diff: `${(mileageDiff / 1000).toFixed(0)}k km`,
    penalty: mileagePenalty.toFixed(1)
  });

  // 2. Age Difference
  const ageDiff = Math.abs(target.age_months - candidate.age_at_auction_months);
  const ageRate = target.model === 'Model 3'
    ? WEIGHTS.M3_AGE_PENALTY_PER_MONTH
    : WEIGHTS.MY_AGE_PENALTY_PER_MONTH;
  const agePenalty = ageDiff * ageRate;
  score += agePenalty;
  penalties.push({
    factor: 'Age',
    diff: `${ageDiff} months`,
    penalty: agePenalty.toFixed(1)
  });

  // 3. Recency (Time Decay) - use reference date if provided for historical valuations
  const today = referenceDate ? new Date(referenceDate) : new Date();
  const auctionDate = new Date(candidate.end_time);
  const daysSinceAuction = daysBetween(auctionDate, today);
  const recencyPenalty = daysSinceAuction * WEIGHTS.RECENCY_PENALTY_PER_DAY;
  score += recencyPenalty;
  penalties.push({
    factor: 'Recency',
    diff: `${daysSinceAuction} days ago`,
    penalty: recencyPenalty.toFixed(1)
  });

  // 4. Tire Mismatch
  let tirePenalty = 0;
  let tireDiff = 'Match';
  if (target.tire_strategy === '8_tires' && candidate.tire_strategy !== '8_tires') {
    tirePenalty = WEIGHTS.TIRE_MISMATCH_8_VS_4;
    tireDiff = '8 vs 4 tires';
  } else if (target.tire_strategy !== '8_tires' && candidate.tire_strategy === '8_tires') {
    tirePenalty = WEIGHTS.TIRE_MISMATCH_4_VS_8;
    tireDiff = '4 vs 8 tires';
  } else if (target.tire_strategy !== candidate.tire_strategy) {
    tirePenalty = WEIGHTS.TIRE_TYPE_MISMATCH;
    tireDiff = 'Type mismatch';
  }
  score += tirePenalty;
  penalties.push({
    factor: 'Tires',
    diff: tireDiff,
    penalty: tirePenalty.toFixed(1)
  });

  // 5. Heat Pump Mismatch
  let heatPumpPenalty = 0;
  let heatPumpDiff = 'Match';
  if (target.has_heatpump !== candidate.has_heatpump) {
    heatPumpPenalty = WEIGHTS.HEAT_PUMP_MISMATCH;
    heatPumpDiff = 'Mismatch';
  }
  score += heatPumpPenalty;
  penalties.push({
    factor: 'Heat Pump',
    diff: heatPumpDiff,
    penalty: heatPumpPenalty.toFixed(1)
  });

  // 6. Autopilot Mismatch
  let autoPenalty = 0;
  let autoDiff = 'Match';
  if (target.autopilot !== candidate.autopilot) {
    autoPenalty = WEIGHTS.AUTOPILOT_MISMATCH;
    autoDiff = `${target.autopilot} vs ${candidate.autopilot}`;
  }
  score += autoPenalty;
  penalties.push({
    factor: 'Autopilot',
    diff: autoDiff,
    penalty: autoPenalty.toFixed(1)
  });

  // 7. Trust Tier
  let trustPenalty = 0;
  const tier = candidate.trust_tier;
  if (tier === 'Tier 2') {
    trustPenalty = WEIGHTS.TRUST_TIER_2_PENALTY;
  } else if (tier === 'Tier 3') {
    trustPenalty = WEIGHTS.TRUST_TIER_3_PENALTY;
  }
  score += trustPenalty;
  penalties.push({
    factor: 'Trust Tier',
    diff: tier,
    penalty: trustPenalty.toFixed(1)
  });

  return { score, penalties };
}

// Adjust price from comparable to target
export function adjustPrice(target, candidate) {
  let price = candidate.final_price;
  const adjustments = [];

  // 1. Mileage Adjustment
  const mileageDelta = candidate.mileage - target.mileage;
  const rate = target.model === 'Model 3'
    ? PRICE_ADJUSTMENTS.M3_MILEAGE_ADJ_PER_KM
    : PRICE_ADJUSTMENTS.MY_MILEAGE_ADJ_PER_KM;
  const mileageAdj = mileageDelta * rate;
  price += mileageAdj;
  adjustments.push({
    factor: 'Mileage',
    diff: `${(mileageDelta / 1000).toFixed(0)}k km`,
    adjustment: mileageAdj.toFixed(0),
    description: mileageDelta > 0
      ? `Comparable has ${Math.abs(mileageDelta / 1000).toFixed(0)}k more km`
      : `Comparable has ${Math.abs(mileageDelta / 1000).toFixed(0)}k fewer km`
  });

  // 2. Trailer Hitch Adjustment
  let hitchAdj = 0;
  if (target.has_hitch && !candidate.has_hitch) {
    hitchAdj = PRICE_ADJUSTMENTS.HITCH_ADJ;
  } else if (!target.has_hitch && candidate.has_hitch) {
    hitchAdj = -PRICE_ADJUSTMENTS.HITCH_ADJ;
  }
  if (hitchAdj !== 0) {
    price += hitchAdj;
    adjustments.push({
      factor: 'Trailer Hitch',
      diff: hitchAdj > 0 ? 'Adding hitch value' : 'Subtracting hitch value',
      adjustment: hitchAdj.toFixed(0),
      description: hitchAdj > 0 ? 'Your car has hitch, comparable does not' : 'Comparable has hitch, your car does not'
    });
  }

  return { adjustedPrice: price, adjustments, originalPrice: candidate.final_price };
}

// Main valuation function
export function calculateValuation(targetCar, auctionData, referenceDate = null) {
  // Calculate target car age in months (use reference date if provided for historical valuations)
  const today = referenceDate ? new Date(referenceDate) : new Date();
  const firstReg = new Date(targetCar.first_registration);
  const target = {
    ...targetCar,
    age_months: monthsBetween(firstReg, today)
  };

  // HARD FILTERS (Cohort)
  const cohort = auctionData.filter(car => {
    return (
      car.model === target.model &&
      car.variant_clean === target.variant_clean &&
      car.is_highland === target.is_highland &&
      car.tax_type === target.tax_type &&
      car.is_accident_free === true && // Comparables must be accident free
      car.final_price && car.final_price > 0 // Must have a price
    );
  });

  if (cohort.length === 0) {
    return {
      estimated_value: null,
      confidence_range: null,
      neighbors: [],
      cohort_size: 0,
      error: 'No comparable vehicles found for this configuration'
    };
  }

  // Calculate distances for all in cohort
  const withDistances = cohort.map(car => {
    const { score, penalties } = calculateDistance(target, car, referenceDate);
    return { ...car, distance: score, penalties };
  });

  // Sort by distance
  withDistances.sort((a, b) => a.distance - b.distance);

  // Select top K neighbors
  const neighbors = withDistances.slice(0, K_NEIGHBORS);

  if (neighbors.length === 0) {
    return {
      estimated_value: null,
      confidence_range: null,
      neighbors: [],
      cohort_size: cohort.length,
      error: 'No valid neighbors found'
    };
  }

  // Calculate weighted average using IDW
  const epsilon = 1e-6;
  let totalWeight = 0;
  let weightedSum = 0;

  const processedNeighbors = neighbors.map(neighbor => {
    const { adjustedPrice, adjustments, originalPrice } = adjustPrice(target, neighbor);
    const weight = 1 / Math.pow(neighbor.distance + epsilon, IDW_POWER);
    totalWeight += weight;
    weightedSum += adjustedPrice * weight;

    return {
      ...neighbor,
      adjusted_price: adjustedPrice,
      original_price: originalPrice,
      price_adjustments: adjustments,
      weight: weight,
      weight_percentage: 0 // Will be calculated after
    };
  });

  // Calculate weight percentages
  processedNeighbors.forEach(n => {
    n.weight_percentage = ((n.weight / totalWeight) * 100).toFixed(1);
  });

  const estimatedValue = weightedSum / totalWeight;

  // Calculate confidence range
  const adjustedPrices = processedNeighbors.map(n => n.adjusted_price);
  const minPrice = Math.min(...adjustedPrices);
  const maxPrice = Math.max(...adjustedPrices);

  return {
    estimated_value: Math.round(estimatedValue),
    confidence_range: {
      min: Math.round(minPrice),
      max: Math.round(maxPrice)
    },
    neighbors: processedNeighbors,
    cohort_stats: {
      size: cohort.length,
      // We capture basic stats about the whole cohort for broader market context
      avg_price: Math.round(cohort.reduce((s, c) => s + c.final_price, 0) / cohort.length)
    },
    target_age_months: target.age_months
  };
}

// Valuation function for explore page - only uses auctions that ended BEFORE the target auction
// This prevents data leakage when back-testing the algorithm
export function calculateValuationForExplore(targetAuction, allAuctionData) {
  const targetEndTime = new Date(targetAuction.end_time);

  // Filter to only auctions that ended BEFORE this one (no data leakage)
  const historicalData = allAuctionData.filter(car => {
    const carEndTime = new Date(car.end_time);
    return carEndTime < targetEndTime && car.auction_id !== targetAuction.auction_id;
  });

  // Build target car config from the auction record
  const targetCar = {
    model: targetAuction.model,
    variant_clean: targetAuction.variant_clean,
    is_highland: targetAuction.is_highland,
    tax_type: targetAuction.tax_type,
    is_accident_free: targetAuction.is_accident_free,
    autopilot: targetAuction.autopilot,
    tire_strategy: targetAuction.tire_strategy,
    has_heatpump: targetAuction.has_heatpump,
    has_hitch: targetAuction.has_hitch,
    mileage: targetAuction.mileage,
    first_registration: targetAuction.first_registration
  };

  // Calculate valuation using historical data only, at the time of the auction
  const valuation = calculateValuation(targetCar, historicalData, targetAuction.end_time);

  // Calculate broader market context from the same historical data (but maybe less strict filters if needed)
  // For now, we use the same strict cohort but we will analyze it deeper in calculateDealerInsights
  const cohort = historicalData.filter(car => {
    return (
      car.model === targetCar.model &&
      car.variant_clean === targetCar.variant_clean &&
      car.is_highland === targetCar.is_highland &&
      car.tax_type === targetCar.tax_type &&
      car.is_accident_free === true
    );
  });

  return {
    ...valuation,
    full_cohort: cohort, // Pass full cohort for advanced analysis
    auction: targetAuction
  };
}

export function calculateDealerInsights(valuation) {
  if (!valuation || !valuation.full_cohort || valuation.full_cohort.length === 0) {
    return null;
  }

  const cohort = valuation.full_cohort;
  const total = cohort.length;

  // 1. Seller Acceptance Rate
  // status contains 'closed_seller_accepted' or 'closed_seller_declined'
  const accepted = cohort.filter(c => c.status && c.status.includes('accepted')).length;
  const acceptanceRate = (accepted / total) * 100;

  // 2. Average Highest Bid on REJECTED auctions
  // This tells us the "ceiling" of what sellers turn down
  const declinedAuctions = cohort.filter(c => c.status && c.status.includes('declined'));
  const declinedAvgBid = declinedAuctions.length > 0
    ? Math.round(declinedAuctions.reduce((sum, c) => sum + c.final_price, 0) / declinedAuctions.length)
    : null;

  // 3. Average Winning Price on ACCEPTED auctions
  const acceptedAuctions = cohort.filter(c => c.status && c.status.includes('accepted'));
  const acceptedAvgPrice = acceptedAuctions.length > 0
    ? Math.round(acceptedAuctions.reduce((sum, c) => sum + c.final_price, 0) / acceptedAuctions.length)
    : null;

  // 4. Competition (Bid Density)
  const avgBids = Math.round(cohort.reduce((sum, c) => sum + (c.number_of_bids || 0), 0) / total);

  // 5. Calculate "Win Chance" based on these market dynamics, not just 3 neighbors
  // We check where the Estimated Value sits relative to the "Declined Ceiling" and "Accepted Average"
  let winProbability = 50; // default
  let winLabel = "Medium";
  let winColor = "var(--warning-yellow)";

  const estimate = valuation.estimated_value || 0;

  // Refined probability logic using the broader cohort stats
  if (declinedAvgBid && estimate < declinedAvgBid) {
    // We are bidding LESS than what sellers typically reject
    winProbability = 15;
    winLabel = "Very Low (Below Rejection Avg)";
    winColor = "var(--error-red)";
  } else if (acceptedAvgPrice && estimate >= acceptedAvgPrice) {
    // We are bidding ABOVE the average sold price
    winProbability = 90;
    winLabel = "Very High (Above Market Avg)";
    winColor = "var(--success-green)";
  } else if (declinedAvgBid && estimate > declinedAvgBid) {
    // We are in the "Zone of Possible Agreement" (ZOPA)
    // Interpolate between Declined Avg and Accepted Avg
    if (acceptedAvgPrice) {
      const range = acceptedAvgPrice - declinedAvgBid;
      const position = estimate - declinedAvgBid;
      const relativePos = Math.min(Math.max(position / range, 0), 1); // 0 to 1
      winProbability = 30 + (relativePos * 50); // Map to 30% - 80%

      if (winProbability > 60) {
        winLabel = "High";
        winColor = "var(--success-green)";
      } else {
        winLabel = "Medium";
        winColor = "var(--warning-yellow)";
      }
    } else {
      winProbability = 60;
      winLabel = "Good (Above Rejection Avg)";
      winColor = "var(--tier-2)";
    }
  }

  return {
    cohortSize: total,
    acceptanceRate: Math.round(acceptanceRate),
    declinedAvgBid,
    acceptedAvgPrice,
    avgBids,
    winProbability: Math.round(winProbability),
    winLabel,
    winColor
  };
}


export function calculateNeighborAverages(valuation) {
  if (!valuation || !valuation.neighbors || valuation.neighbors.length === 0) return null;

  const count = valuation.neighbors.length;
  const sumMileage = valuation.neighbors.reduce((acc, n) => acc + n.mileage, 0);
  const sumAge = valuation.neighbors.reduce((acc, n) => acc + n.age_at_auction_months, 0);

  return {
    avgMileage: Math.round(sumMileage / count),
    avgAgeMonths: Math.round(sumAge / count),
    count: count
  };
}


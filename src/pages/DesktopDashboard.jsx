import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import auctionData from '../data/auctions.json'
import { calculateValuation, calculateValuationForExplore, calculateDealerInsights, calculateNeighborAverages, VARIANT_SHORT_NAMES, VARIANT_NAMES } from '../utils/valuationAlgorithm'
import '../App.css'

// Car Configuration Component
function CarConfigurator({ config, setConfig }) {
  // Combined model+highland selection value
  const modelSelection = config.model === 'Model Y'
    ? 'model_y'
    : config.is_highland
      ? 'model_3_highland'
      : 'model_3';

  const handleChange = (field, value) => {
    setConfig(prev => {
      const newConfig = { ...prev, [field]: value };

      // Handle combined model selection
      if (field === 'model_selection') {
        if (value === 'model_3') {
          newConfig.model = 'Model 3';
          newConfig.variant_clean = 'm3_lr';
          newConfig.is_highland = false;
        } else if (value === 'model_3_highland') {
          newConfig.model = 'Model 3';
          newConfig.variant_clean = 'm3_lr';
          newConfig.is_highland = true;
          // Ensure year is 2023+ for Highland
          if (parseInt(prev.first_registration_year) < 2023) {
            newConfig.first_registration_year = '2024';
          }
        } else if (value === 'model_y') {
          newConfig.model = 'Model Y';
          newConfig.variant_clean = 'my_lr';
          newConfig.is_highland = false;
        }
        return newConfig;
      }

      return newConfig;
    });
  };

  const model3Variants = [
    { value: 'm3_sr', label: 'Standard Range', kw: '208-239 kW' },
    { value: 'm3_lr', label: 'Long Range', kw: '324-366 kW' },
    { value: 'm3_p', label: 'Performance', kw: '377-460 kW' }
  ];

  const modelYVariants = [
    { value: 'my_sr', label: 'Standard Range', kw: '220-255 kW' },
    { value: 'my_lr', label: 'Long Range', kw: '378 kW' },
    { value: 'my_p', label: 'Performance', kw: '390+ kW' }
  ];

  const variants = config.model === 'Model 3' ? model3Variants : modelYVariants;

  // Generate year options (2019-2025, or 2023+ for Highland)
  const minYear = config.is_highland ? 2023 : 2019;
  const years = [];
  for (let y = 2025; y >= minYear; y--) {
    years.push(y);
  }

  // Generate month options
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  return (
    <div className="configurator">
      <h2>Configure Your Tesla</h2>

      <div className="config-section">
        <h3>Basic Information</h3>

        <div className="config-group">
          <label>Model</label>
          <select
            className="model-select"
            value={modelSelection}
            onChange={(e) => handleChange('model_selection', e.target.value)}
          >
            <option value="model_3">Model 3</option>
            <option value="model_3_highland">Model 3 Highland</option>
            <option value="model_y">Model Y</option>
          </select>
        </div>

        <div className="config-group">
          <label>Variant</label>
          <div className="button-group variant-group">
            {variants.map(v => (
              <button
                key={v.value}
                className={config.variant_clean === v.value ? 'active' : ''}
                onClick={() => handleChange('variant_clean', v.value)}
              >
                <span className="variant-label">{v.label}</span>
                <span className="variant-kw">{v.kw}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="config-group">
          <label>First Registration</label>
          <div className="date-inputs">
            <select
              value={config.first_registration_month}
              onChange={(e) => handleChange('first_registration_month', e.target.value)}
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={config.first_registration_year}
              onChange={(e) => handleChange('first_registration_year', e.target.value)}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="config-group">
          <label>Mileage (km)</label>
          <input
            type="number"
            value={config.mileage}
            onChange={(e) => handleChange('mileage', parseInt(e.target.value) || 0)}
            min="0"
            max="500000"
            step="1000"
          />
          <span className="mileage-display">{(config.mileage / 1000).toFixed(0)}k km</span>
        </div>
      </div>

      <div className="config-section">
        <h3>Generation & Tax</h3>

        <div className="config-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={!config.is_accident_free}
              onChange={(e) => handleChange('is_accident_free', !e.target.checked)}
            />
            <span className={`checkbox-text ${!config.is_accident_free ? 'warning-text' : ''}`}>Has Accident</span>
          </label>
        </div>

        <div className="config-group">
          <label>Tax Type</label>
          <div className="button-group">
            <button
              className={config.tax_type === 'margin' ? 'active' : ''}
              onClick={() => handleChange('tax_type', 'margin')}
            >
              Private / Margin
            </button>
            <button
              className={config.tax_type === 'vat' ? 'active' : ''}
              onClick={() => handleChange('tax_type', 'vat')}
            >
              Company / VAT
            </button>
          </div>
        </div>
      </div>

      <div className="config-section">
        <h3>Equipment</h3>

        <div className="config-group">
          <label>Autopilot Package</label>
          <div className="button-group autopilot-group">
            <button
              className={config.autopilot === 'Standard' ? 'active' : ''}
              onClick={() => handleChange('autopilot', 'Standard')}
            >
              Standard
            </button>
            <button
              className={config.autopilot === 'EAP' ? 'active' : ''}
              onClick={() => handleChange('autopilot', 'EAP')}
            >
              EAP
            </button>
            <button
              className={config.autopilot === 'FSD' ? 'active' : ''}
              onClick={() => handleChange('autopilot', 'FSD')}
            >
              FSD
            </button>
          </div>
        </div>

        <div className="config-group">
          <label>Tires Included</label>
          <div className="button-group tire-group">
            <button
              className={config.tire_strategy === '4_summer' ? 'active' : ''}
              onClick={() => handleChange('tire_strategy', '4_summer')}
            >
              Summer
            </button>
            <button
              className={config.tire_strategy === '4_winter' ? 'active' : ''}
              onClick={() => handleChange('tire_strategy', '4_winter')}
            >
              Winter
            </button>
            <button
              className={config.tire_strategy === '4_all_season' ? 'active' : ''}
              onClick={() => handleChange('tire_strategy', '4_all_season')}
            >
              All-Season
            </button>
            <button
              className={config.tire_strategy === '8_tires' ? 'active' : ''}
              onClick={() => handleChange('tire_strategy', '8_tires')}
            >
              8 Tires
            </button>
          </div>
        </div>

        <div className="config-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.has_heatpump}
              onChange={(e) => handleChange('has_heatpump', e.target.checked)}
            />
            <span className="checkbox-text">Heat Pump</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.has_hitch}
              onChange={(e) => handleChange('has_hitch', e.target.checked)}
            />
            <span className="checkbox-text">Trailer Hitch</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// Valuation Display Component
function ValuationDisplay({ valuation, config }) {
  if (!valuation) {
    return (
      <div className="valuation-card loading">
        <h2>Estimated Value</h2>
        <p>Configuring...</p>
      </div>
    );
  }

  if (valuation.error) {
    return (
      <div className="valuation-card error">
        <h2>Estimated Value</h2>
        <p className="error-message">{valuation.error}</p>
        <p className="hint">Try adjusting your configuration to find more comparables.</p>
      </div>
    );
  }

  return (
    <div className="valuation-card">
      <h2>Estimated Value</h2>

      <div className={`accident-warning ${config.is_accident_free ? 'hidden' : ''}`}>
        <strong>Warning:</strong> Your car has an accident history. This valuation assumes a damage-free condition. Actual value will be significantly lower depending on damage severity.
      </div>

      <div className="price-display">
        <span className="currency">€</span>
        <span className="price">{valuation.estimated_value.toLocaleString('de-DE')}</span>
      </div>

      <div className="price-range">
        <span>Range: </span>
        <span className="range-values">
          €{valuation.confidence_range.min.toLocaleString('de-DE')} - €{valuation.confidence_range.max.toLocaleString('de-DE')}
        </span>
      </div>

      <div className="valuation-meta">
        <div className="meta-item">
          <span className="meta-label">Your Car Age</span>
          <span className="meta-value">{valuation.target_age_months} months</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Comparables Found</span>
          <span className="meta-value">{valuation.cohort_size}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Best Matches Used</span>
          <span className="meta-value">{valuation.neighbors.length}</span>
        </div>
      </div>

      <div className="why-this-price">
        <h4>Why this price?</h4>
        <p>
          We found <strong>{valuation.cohort_size}</strong> comparable {config.model} {VARIANT_SHORT_NAMES[config.variant_clean]}s
          in our database. We selected the <strong>{valuation.neighbors.length} best matches</strong> based on mileage,
          age, equipment, and auction recency.
        </p>
      </div>
    </div>
  );
}

// Explore Table Component - shows 20 most recent auctions with valuations
function ExploreTable({ auctionData, onSelectAuction }) {
  // Get 20 most recent closed auctions (accepted or declined)
  const recentAuctions = useMemo(() => {
    const closed = auctionData.filter(a =>
      a.status === 'closed_seller_accepted' || a.status === 'closed_seller_declined'
    );
    // Sort by end_time descending
    closed.sort((a, b) => new Date(b.end_time) - new Date(a.end_time));
    return closed.slice(0, 20);
  }, [auctionData]);

  // Calculate valuations for each auction (using only prior data)
  const auctionsWithValuations = useMemo(() => {
    return recentAuctions.map(auction => {
      const result = calculateValuationForExplore(auction, auctionData);
      const diff = result.estimated_value && auction.final_price
        ? ((result.estimated_value - auction.final_price) / auction.final_price * 100)
        : null;
      return {
        ...auction,
        valuation: result,
        difference: diff
      };
    });
  }, [recentAuctions, auctionData]);

  return (
    <div className="explore-section">
      <div className="explore-header">
        <h2>Algorithm Performance - Recent Auctions</h2>
        <p className="explore-intro">
          Showing the 20 most recent closed auctions. Each valuation uses only auction data from BEFORE that auction ended (no data leakage).
          Click on any row to see the full calculation breakdown.
        </p>
      </div>

      <div className="explore-table-container">
        <table className="explore-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Model</th>
              <th>Variant</th>
              <th>Status</th>
              <th>Actual Bid</th>
              <th>Estimated</th>
              <th>Diff</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {auctionsWithValuations.map(auction => (
              <tr
                key={auction.auction_id}
                className={`explore-row ${auction.status.includes('accepted') ? 'status-accepted' : 'status-declined'}`}
                onClick={() => onSelectAuction(auction)}
              >
                <td className="date-cell">
                  {new Date(auction.end_time).toLocaleDateString('de-DE')}
                </td>
                <td>{auction.model}</td>
                <td>{VARIANT_SHORT_NAMES[auction.variant_clean]}</td>
                <td>
                  <span className={`status-badge ${auction.status.includes('accepted') ? 'accepted' : 'declined'}`}>
                    {auction.status.includes('accepted') ? 'Accepted' : 'Declined'}
                  </span>
                </td>
                <td className="price-cell">
                  {auction.final_price ? `€${auction.final_price.toLocaleString('de-DE')}` : '-'}
                </td>
                <td className="price-cell estimated">
                  {auction.valuation.estimated_value
                    ? `€${auction.valuation.estimated_value.toLocaleString('de-DE')}`
                    : <span className="no-data">No comparables</span>}
                </td>
                <td className={`diff-cell ${auction.difference !== null ? (auction.difference >= 0 ? 'positive' : 'negative') : ''}`}>
                  {auction.difference !== null
                    ? `${auction.difference >= 0 ? '+' : ''}${auction.difference.toFixed(1)}%`
                    : '-'}
                </td>
                <td className="action-cell">
                  <button className="view-details-btn">View Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="explore-stats">
        <h3>Summary Statistics</h3>
        <div className="stats-grid">
          {(() => {
            const validDiffs = auctionsWithValuations
              .filter(a => a.difference !== null)
              .map(a => a.difference);
            if (validDiffs.length === 0) return <p>No valid comparisons</p>;

            const sorted = [...validDiffs].sort((a, b) => a - b);
            const median = sorted.length % 2 === 0
              ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
              : sorted[Math.floor(sorted.length / 2)];
            const avg = validDiffs.reduce((sum, d) => sum + d, 0) / validDiffs.length;

            return (
              <>
                <div className="stat-item">
                  <span className="stat-label">Median Error</span>
                  <span className="stat-value">{Math.abs(median).toFixed(2)}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Average Bias</span>
                  <span className={`stat-value ${avg >= 0 ? 'positive' : 'negative'}`}>
                    {avg >= 0 ? '+' : ''}{avg.toFixed(2)}%
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Valid Comparisons</span>
                  <span className="stat-value">{validDiffs.length} / 20</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// Auction Detail Modal - shows full calculation breakdown
function AuctionDetailModal({ auction, onClose }) {
  if (!auction) return null;

  const { valuation } = auction;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Valuation Details</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {/* Auction Info */}
          <div className="detail-section auction-info">
            <h3>Auction Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Model</span>
                <span className="info-value">{auction.model} {VARIANT_SHORT_NAMES[auction.variant_clean]}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Auction Date</span>
                <span className="info-value">{new Date(auction.end_time).toLocaleDateString('de-DE')}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Mileage</span>
                <span className="info-value">{(auction.mileage / 1000).toFixed(0)}k km</span>
              </div>
              <div className="info-item">
                <span className="info-label">Age at Auction</span>
                <span className="info-value">{auction.age_at_auction_months} months</span>
              </div>
              <div className="info-item">
                <span className="info-label">Tax Type</span>
                <span className="info-value">{auction.tax_type === 'vat' ? 'Company/VAT' : 'Private/Margin'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Highland</span>
                <span className="info-value">{auction.is_highland ? 'Yes' : 'No'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Autopilot</span>
                <span className="info-value">{auction.autopilot}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Tires</span>
                <span className="info-value">{auction.tire_strategy.replace('_', ' ')}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Heat Pump</span>
                <span className="info-value">{auction.has_heatpump ? 'Yes' : 'No'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Trailer Hitch</span>
                <span className="info-value">{auction.has_hitch ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Valuation Result */}
          <div className="detail-section valuation-result">
            <h3>Valuation Result</h3>
            <div className="result-comparison">
              <div className="result-item">
                <span className="result-label">Actual Highest Bid</span>
                <span className="result-value actual">€{auction.final_price?.toLocaleString('de-DE') || '-'}</span>
                <span className={`result-status ${auction.status.includes('accepted') ? 'accepted' : 'declined'}`}>
                  {auction.status.includes('accepted') ? 'Accepted' : 'Declined'}
                </span>
              </div>
              <div className="result-item">
                <span className="result-label">Algorithm Estimate</span>
                <span className="result-value estimated">
                  {valuation.estimated_value ? `€${valuation.estimated_value.toLocaleString('de-DE')}` : 'No comparables'}
                </span>
                {valuation.confidence_range && (
                  <span className="result-range">
                    Range: €{valuation.confidence_range.min.toLocaleString('de-DE')} - €{valuation.confidence_range.max.toLocaleString('de-DE')}
                  </span>
                )}
              </div>
              {auction.difference !== null && (
                <div className="result-item diff">
                  <span className="result-label">Difference</span>
                  <span className={`result-value ${auction.difference >= 0 ? 'positive' : 'negative'}`}>
                    {auction.difference >= 0 ? '+' : ''}{auction.difference.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            {valuation.cohort_size !== undefined && (
              <p className="cohort-info">
                Found <strong>{valuation.cohort_size}</strong> comparables in the database.
                Used <strong>{valuation.neighbors?.length || 0}</strong> best matches.
              </p>
            )}
          </div>

          {/* Comparable Cars Used */}
          {valuation.neighbors && valuation.neighbors.length > 0 && (
            <div className="detail-section neighbors-section">
              <h3>Comparable Sales Used</h3>
              <div className="neighbors-grid">
                {valuation.neighbors.map((neighbor, index) => (
                  <div key={neighbor.auction_id} className={`neighbor-card rank-${index + 1}`}>
                    <div className="neighbor-header">
                      <span className="rank">#{index + 1} Match</span>
                      <span className="weight">Weight: {neighbor.weight_percentage}%</span>
                    </div>

                    <div className="neighbor-price">
                      <div className="price-row">
                        <span className="label">Highest Bid:</span>
                        <span className="value">€{neighbor.original_price.toLocaleString('de-DE')}</span>
                      </div>
                      <div className="price-row adjusted">
                        <span className="label">Adjusted:</span>
                        <span className="value">€{Math.round(neighbor.adjusted_price).toLocaleString('de-DE')}</span>
                      </div>
                    </div>

                    <div className="neighbor-details">
                      <div className="detail-row">
                        <span className="label">Mileage:</span>
                        <span className="value">{neighbor.mileage.toLocaleString('de-DE')} km</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Age at Auction:</span>
                        <span className="value">{neighbor.age_at_auction_months} months</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Auction Date:</span>
                        <span className="value">{new Date(neighbor.end_time).toLocaleDateString('de-DE')}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Trust Tier:</span>
                        <span className={`value tier tier-${neighbor.trust_tier.split(' ')[1]}`}>
                          {neighbor.trust_tier}
                        </span>
                      </div>
                    </div>

                    <div className="penalties-section">
                      <h4>Distance Penalties</h4>
                      <table className="penalties-table">
                        <thead>
                          <tr>
                            <th>Factor</th>
                            <th>Diff</th>
                            <th>Penalty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {neighbor.penalties.map((p, i) => (
                            <tr key={i} className={parseFloat(p.penalty) > 0 ? 'has-penalty' : ''}>
                              <td>{p.factor}</td>
                              <td>{p.diff}</td>
                              <td className="penalty-value">{p.penalty}</td>
                            </tr>
                          ))}
                          <tr className="total-row">
                            <td colSpan="2"><strong>Total</strong></td>
                            <td className="penalty-value"><strong>{neighbor.distance.toFixed(1)}</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {neighbor.price_adjustments.length > 0 && (
                      <div className="adjustments-section">
                        <h4>Price Adjustments</h4>
                        <table className="adjustments-table">
                          <thead>
                            <tr>
                              <th>Factor</th>
                              <th>Reason</th>
                              <th>Adj</th>
                            </tr>
                          </thead>
                          <tbody>
                            {neighbor.price_adjustments.map((a, i) => (
                              <tr key={i}>
                                <td>{a.factor}</td>
                                <td className="adjustment-reason">{a.description}</td>
                                <td className={`adjustment-value ${parseFloat(a.adjustment) >= 0 ? 'positive' : 'negative'}`}>
                                  {parseFloat(a.adjustment) >= 0 ? '+' : ''}€{parseInt(a.adjustment).toLocaleString('de-DE')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {valuation.error && (
            <div className="detail-section error-section">
              <h3>Valuation Error</h3>
              <p className="error-message">{valuation.error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Comparable Cars Component
function ComparableCars({ valuation }) {
  const hasNeighbors = valuation && valuation.neighbors && valuation.neighbors.length > 0;

  return (
    <div className="comparables-section">
      <h2>Comparable Sales (Best Matches)</h2>
      <p className="comparables-intro">
        {hasNeighbors
          ? 'These are the actual auction results used to calculate your valuation, ordered by match quality.'
          : 'No comparable vehicles found. Try adjusting your configuration.'}
      </p>

      {hasNeighbors && (
        <div className="comparables-grid">
          {valuation.neighbors.map((neighbor, index) => (
            <div key={neighbor.auction_id} className={`comparable-card rank-${index + 1}`}>
              <div className="comparable-header">
                <span className="rank">#{index + 1} Match</span>
                <span className="weight">Weight: {neighbor.weight_percentage}%</span>
              </div>

              <div className="comparable-price">
                <div className="price-row">
                  <span className="label">Highest Bid:</span>
                  <span className="value">€{neighbor.original_price.toLocaleString('de-DE')}</span>
                </div>
                <div className="price-row adjusted">
                  <span className="label">Adjusted Price:</span>
                  <span className="value">€{Math.round(neighbor.adjusted_price).toLocaleString('de-DE')}</span>
                </div>
              </div>

              <div className="comparable-details">
                <div className="detail-row">
                  <span className="label">Mileage:</span>
                  <span className="value">{neighbor.mileage.toLocaleString('de-DE')} km</span>
                </div>
                <div className="detail-row">
                  <span className="label">Age at Auction:</span>
                  <span className="value">{neighbor.age_at_auction_months} months</span>
                </div>
                <div className="detail-row">
                  <span className="label">Auction Date:</span>
                  <span className="value">{new Date(neighbor.end_time).toLocaleDateString('de-DE')}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Status:</span>
                  <span className={`value status-${neighbor.status.includes('accepted') ? 'sold' : 'declined'}`}>
                    {neighbor.status.includes('accepted') ? 'Sold' : 'Declined'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Trust Tier:</span>
                  <span className={`value tier tier-${neighbor.trust_tier.split(' ')[1]}`}>
                    {neighbor.trust_tier}
                  </span>
                </div>
              </div>

              <div className="penalties-section">
                <h4>Distance Penalties</h4>
                <table className="penalties-table">
                  <thead>
                    <tr>
                      <th>Factor</th>
                      <th>Difference</th>
                      <th>Penalty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {neighbor.penalties.map((p, i) => (
                      <tr key={i} className={parseFloat(p.penalty) > 0 ? 'has-penalty' : ''}>
                        <td>{p.factor}</td>
                        <td>{p.diff}</td>
                        <td className="penalty-value">{p.penalty}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan="2"><strong>Total Distance Score</strong></td>
                      <td className="penalty-value"><strong>{neighbor.distance.toFixed(1)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="adjustments-section">
                <h4>Price Adjustments</h4>
                {neighbor.price_adjustments.length > 0 ? (
                  <table className="adjustments-table">
                    <thead>
                      <tr>
                        <th>Factor</th>
                        <th>Reason</th>
                        <th>Adjustment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {neighbor.price_adjustments.map((a, i) => (
                        <tr key={i}>
                          <td>{a.factor}</td>
                          <td className="adjustment-reason">{a.description}</td>
                          <td className={`adjustment-value ${parseFloat(a.adjustment) >= 0 ? 'positive' : 'negative'}`}>
                            {parseFloat(a.adjustment) >= 0 ? '+' : ''}€{parseInt(a.adjustment).toLocaleString('de-DE')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="no-adjustments">No adjustments needed</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Customer-facing Results Component
function CustomerResults({ valuation, config }) {
  if (!valuation || valuation.error) {
    return (
      <div className="customer-results">
        <div className="customer-empty">
          <div className="customer-empty-icon">?</div>
          <h3>{valuation?.error || 'Configure your Tesla to get started'}</h3>
          <p>Select your model, variant, and specifications on the left to receive an instant market valuation.</p>
        </div>
      </div>
    );
  }

  const neighbors = valuation.neighbors || [];
  const avgOriginalPrice = neighbors.length > 0
    ? Math.round(neighbors.reduce((s, n) => s + n.original_price, 0) / neighbors.length) : 0;
  const avgMileage = neighbors.length > 0
    ? Math.round(neighbors.reduce((s, n) => s + n.mileage, 0) / neighbors.length) : 0;
  const avgAge = neighbors.length > 0
    ? Math.round(neighbors.reduce((s, n) => s + n.age_at_auction_months, 0) / neighbors.length) : 0;
  const dataPoints = valuation.cohort_stats?.size || neighbors.length;

  return (
    <div className="customer-results">
      {!config.is_accident_free && (
        <div className="customer-warning">
          <strong>Note:</strong> This valuation assumes accident-free condition. If your car has damage history, the actual value may be lower depending on severity.
        </div>
      )}

      <div className="customer-value-card">
        <span className="customer-value-label">Estimated Market Value</span>
        <div className="customer-value-price">
          <span className="customer-value-currency">&euro;</span>
          <span className="customer-value-amount">{valuation.estimated_value.toLocaleString('de-DE')}</span>
        </div>
        <div className="customer-value-range">
          Market range: &euro;{valuation.confidence_range.min.toLocaleString('de-DE')} &mdash; &euro;{valuation.confidence_range.max.toLocaleString('de-DE')}
        </div>
      </div>

      <div className="customer-market">
        <h4>Market Snapshot</h4>
        <p className="customer-market-subtitle">
          Based on <strong>{dataPoints}</strong> similar {config.model} {VARIANT_SHORT_NAMES[config.variant_clean]}s recently sold
        </p>
        <div className="customer-market-grid">
          <div className="customer-market-item">
            <span className="customer-market-value">&euro;{avgOriginalPrice.toLocaleString('de-DE')}</span>
            <span className="customer-market-label">Avg. Sale Price</span>
          </div>
          <div className="customer-market-item">
            <span className="customer-market-value">{(avgMileage / 1000).toFixed(0)}k km</span>
            <span className="customer-market-label">Avg. Mileage</span>
          </div>
          <div className="customer-market-item">
            <span className="customer-market-value">{avgAge} months</span>
            <span className="customer-market-label">Avg. Vehicle Age</span>
          </div>
          <div className="customer-market-item">
            <span className="customer-market-value">{dataPoints}</span>
            <span className="customer-market-label">Cars Analyzed</span>
          </div>
        </div>
      </div>

      <div className="customer-methodology">
        <h4>How We Calculate Your Value</h4>
        <div className="customer-steps">
          <div className="customer-step">
            <div className="customer-step-num">1</div>
            <div>
              <strong>Find comparable sales</strong>
              <p>We search verified B2B auction results for Teslas matching your exact model, variant, and generation.</p>
            </div>
          </div>
          <div className="customer-step">
            <div className="customer-step-num">2</div>
            <div>
              <strong>Match key factors</strong>
              <p>We rank matches by similarity — considering mileage, age, equipment (autopilot, tires, heat pump), and how recent the sale was.</p>
            </div>
          </div>
          <div className="customer-step">
            <div className="customer-step-num">3</div>
            <div>
              <strong>Calculate your value</strong>
              <p>We adjust comparable prices for exact differences and compute a weighted average — the closest matches carry the most weight.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="customer-trust-badge">
        All valuations are based on real, verified B2B auction data. We never use listing prices or estimates — only actual sale results.
      </div>
    </div>
  );
}

// Dealer View Modal - Simulated view for dealers
function DealerViewModal({ auction, onClose }) {
  if (!auction) return null;
  const { valuation } = auction;
  const metrics = calculateDealerInsights(valuation);
  const averages = calculateNeighborAverages(valuation);

  if (!metrics) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content dealer-modal" onClick={e => e.stopPropagation()}>
          <p>Not enough market data for this vehicle.</p>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content dealer-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Dealer Market Intelligence</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="dealer-summary">
            <div className="dealer-summary-row">
              <div>
                <h3 className="dealer-car-name">{auction.model} {VARIANT_SHORT_NAMES[auction.variant_clean]}</h3>
                <p className="dealer-auction-date">Auction Date: {new Date(auction.end_time).toLocaleDateString('de-DE')}</p>
              </div>
              <div>
                <span className="dealer-cohort-badge">
                  Analyzed {metrics.cohortSize} Similar Cars
                </span>
              </div>
            </div>
          </div>

          <div className="dealer-grid">

            {/* Left Panel: Valuation Strategy */}
            <div className="strategy-panel">
              <h4 className="dealer-section-title">Recommended Bid Strategy</h4>
              <div className="dealer-big-number">
                €{valuation.estimated_value?.toLocaleString('de-DE')}
              </div>
              <div className="dealer-big-number-sub">
                Avg. winning bid of similar cars
              </div>

              <div className="win-probability-card" style={{
                background: metrics.winColor + '12',
                borderColor: metrics.winColor
              }}>
                <div className="win-prob-header">
                  <span className="win-prob-label">Deal Success Probability</span>
                  <span className="win-prob-value" style={{ color: metrics.winColor }}>{metrics.winProbability}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${metrics.winProbability}%`, background: metrics.winColor }}></div>
                </div>
                <p className="win-prob-desc">
                  Chance that seller <strong>accepts</strong> this bid (based on recent rejection rates).
                </p>
              </div>

              <div className="market-context-box">
                <div className="market-context-title">MARKET CEILINGS & FLOORS</div>

                {metrics.declinedAvgBid && (
                  <div className="context-row">
                    <div className="context-info">
                      <span className="context-label context-label--rejected">Avg Rejected Bid</span>
                      <span className="context-hint">Don't bid below this</span>
                    </div>
                    <span className="context-value">€{metrics.declinedAvgBid.toLocaleString('de-DE')}</span>
                  </div>
                )}

                {metrics.acceptedAvgPrice && (
                  <div className="context-row">
                    <div className="context-info">
                      <span className="context-label context-label--accepted">Avg Accepted Price</span>
                      <span className="context-hint">High success rate</span>
                    </div>
                    <span className="context-value">€{metrics.acceptedAvgPrice.toLocaleString('de-DE')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Market Depth */}
            <div className="market-depth-panel">
              <h4 className="dealer-section-title">Market Depth</h4>

              <div className="kpi-grid">
                <div className="kpi-box">
                  <div className="kpi-label">Seller Acceptance</div>
                  <div className={`kpi-value ${metrics.acceptanceRate > 50 ? 'kpi-value--success' : 'kpi-value--warning'}`}>
                    {metrics.acceptanceRate}%
                  </div>
                </div>
                <div className="kpi-box">
                  <div className="kpi-label">Competition</div>
                  <div className="kpi-value">
                    {metrics.avgBids} <span className="kpi-unit">bids/car</span>
                  </div>
                </div>
              </div>

              <div className="averages-section">
                <h5 className="averages-title">Typical Vehicle Profile</h5>
                <div className="averages-row averages-row--border">
                  <span className="averages-label">Avg Mileage</span>
                  <span className="averages-value">{averages?.avgMileage?.toLocaleString('de-DE')} km</span>
                </div>
                <div className="averages-row">
                  <span className="averages-label">Avg Age</span>
                  <span className="averages-value">{averages?.avgAgeMonths} months</span>
                </div>
              </div>

              <div className="glass-box-teaser">
                Based on {metrics.cohortSize} similar vehicles (Same Model, Trim, Generation) sold in the last 90 days.
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// Dealer Auctions List
function DealerAuctions({ auctionData, onSelectAuction }) {
  // Get 10 most recent closed auctions
  const recentAuctions = useMemo(() => {
    const closed = auctionData.filter(a =>
      a.status === 'closed_seller_accepted' || a.status === 'closed_seller_declined'
    );
    // Sort by end_time descending
    closed.sort((a, b) => new Date(b.end_time) - new Date(a.end_time));
    return closed.slice(0, 10);
  }, [auctionData]);

  // Calculate valuations for each auction (using only prior data)
  const auctionsWithValuations = useMemo(() => {
    return recentAuctions.map(auction => {
      const result = calculateValuationForExplore(auction, auctionData);
      return {
        ...auction,
        valuation: result
      };
    });
  }, [recentAuctions, auctionData]);

  return (
    <div className="explore-section">
      <div className="explore-header">
        <h2>Recent Auctions (Dealer View)</h2>
        <p className="explore-intro">Select an auction to see the specialized Dealer Valuation view (Win Chance & Market Context).</p>
      </div>

      <div className="explore-table-container">
        <table className="explore-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Model</th>
              <th>Variant</th>
              <th>Mileage</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {auctionsWithValuations.map(auction => (
              <tr key={auction.auction_id} onClick={() => onSelectAuction(auction)} className="explore-row">
                <td className="date-cell">{new Date(auction.end_time).toLocaleDateString('de-DE')}</td>
                <td>{auction.model}</td>
                <td>{VARIANT_SHORT_NAMES[auction.variant_clean]}</td>
                <td>{(auction.mileage / 1000).toFixed(0)}k km</td>
                <td>
                  <span className={`status-badge ${auction.status.includes('accepted') ? 'accepted' : 'declined'}`}>
                    {auction.status.includes('accepted') ? 'Sold' : 'Closed'}
                  </span>
                </td>
                <td className="action-cell">
                  <button className="view-details-btn">Dealer View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState('valuation'); // 'valuation' or 'explore'
  const [selectedAuction, setSelectedAuction] = useState(null);

  const [config, setConfig] = useState({
    model: 'Model 3',
    variant_clean: 'm3_lr',
    is_highland: false,
    tax_type: 'margin',
    is_accident_free: true,
    autopilot: 'Standard',
    tire_strategy: '4_summer',
    has_heatpump: true,
    has_hitch: false,
    mileage: 50000,
    first_registration_year: '2022',
    first_registration_month: '06'
  });

  const valuation = useMemo(() => {
    const targetCar = {
      ...config,
      first_registration: `${config.first_registration_year}-${config.first_registration_month}-01`
    };
    return calculateValuation(targetCar, auctionData);
  }, [config]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Tesla Quick Valuation</h1>
        <p className="tagline">Transparent, data-driven valuations based on real B2B auction results</p>

        <nav className="tab-nav">
          <button
            className={`tab-btn ${activeTab === 'valuation' ? 'active' : ''}`}
            onClick={() => setActiveTab('valuation')}
          >
            Quick Valuation
          </button>
          <button
            className={`tab-btn ${activeTab === 'explore' ? 'active' : ''}`}
            onClick={() => setActiveTab('explore')}
          >
            Explore Results
          </button>
          <button
            className={`tab-btn ${activeTab === 'dealer' ? 'active' : ''}`}
            onClick={() => setActiveTab('dealer')}
          >
            Dealer View
          </button>
          <button
            className={`tab-btn ${activeTab === 'customer' ? 'active' : ''}`}
            onClick={() => setActiveTab('customer')}
          >
            Customer View
          </button>
          <Link to="/mobile" className="tab-btn mobile-link">
            Mobile App
          </Link>
        </nav>
      </header>

      {activeTab === 'customer' ? (
        <div className="customer-tab">
          <div className="customer-hero">
            <h2>What's Your Tesla Worth?</h2>
            <p>Get an instant, data-driven valuation based on real market sales</p>
          </div>
          <main className="app-main">
            <div className="left-panel">
              <CarConfigurator config={config} setConfig={setConfig} />
            </div>
            <div className="right-panel">
              <CustomerResults valuation={valuation} config={config} />
            </div>
          </main>
        </div>
      ) : activeTab === 'valuation' ? (
        <main className="app-main">
          <div className="left-panel">
            <CarConfigurator config={config} setConfig={setConfig} />
          </div>

          <div className="right-panel">
            <ValuationDisplay valuation={valuation} config={config} />
            <ComparableCars valuation={valuation} />
          </div>
        </main>
      ) : activeTab === 'dealer' ? (
        <main className="app-main explore-main">
          <DealerAuctions
            auctionData={auctionData}
            onSelectAuction={setSelectedAuction}
          />
        </main>
      ) : (
        <main className="app-main explore-main">
          <ExploreTable
            auctionData={auctionData}
            onSelectAuction={setSelectedAuction}
          />
        </main>
      )}

      {selectedAuction && (
        activeTab === 'dealer' ? (
          <DealerViewModal
            auction={selectedAuction}
            onClose={() => setSelectedAuction(null)}
          />
        ) : (
          <AuctionDetailModal
            auction={selectedAuction}
            onClose={() => setSelectedAuction(null)}
          />
        )
      )}

      <footer className="app-footer">
        <p>
          <strong>Glass Box Valuation</strong> - All valuations are calculated using a weighted K-nearest-neighbors
          algorithm based on actual B2B auction results. No black boxes, full transparency.
        </p>
      </footer>
    </div>
  );
}

export default App

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import auctionData from '../data/auctions.json'
import { calculateValuation, VARIANT_SHORT_NAMES } from '../utils/valuationAlgorithm'
import { supabase } from '../supabaseClient'
import './MobileValuation.css'

const EXCHANGE_RATE_SEK = 10.65
const MARGIN_EUR = 1500

// Compact Car Selector Component
function CarSelector({ config, setConfig }) {
  const handleChange = (field, value) => {
    setConfig(prev => {
      const newConfig = { ...prev, [field]: value }

      // Handle model changes - update variant accordingly
      if (field === 'model') {
        if (value === 'Model 3') {
          newConfig.variant_clean = 'm3_lr'
          newConfig.is_highland = false
        } else {
          newConfig.variant_clean = 'my_lr'
          newConfig.is_highland = false
        }
      }

      return newConfig
    })
  }

  const model3Variants = [
    { value: 'm3_sr', label: 'SR', full: 'Standard Range' },
    { value: 'm3_lr', label: 'LR', full: 'Long Range' },
    { value: 'm3_p', label: 'P', full: 'Performance' }
  ]

  const modelYVariants = [
    { value: 'my_sr', label: 'SR', full: 'Standard Range' },
    { value: 'my_lr', label: 'LR', full: 'Long Range' },
    { value: 'my_p', label: 'P', full: 'Performance' }
  ]

  const variants = config.model === 'Model 3' ? model3Variants : modelYVariants

  const years = []
  const minYear = config.is_highland ? 2023 : 2019
  for (let y = 2025; y >= minYear; y--) {
    years.push(y)
  }

  return (
    <div className="mobile-selector">
      {/* Model Selection */}
      <div className="selector-row">
        <div className="selector-group model-group">
          <button
            className={config.model === 'Model 3' && !config.is_highland ? 'active' : ''}
            onClick={() => {
              handleChange('model', 'Model 3')
              setConfig(prev => ({ ...prev, is_highland: false }))
            }}
          >
            Model 3
          </button>
          <button
            className={config.model === 'Model 3' && config.is_highland ? 'active highland' : ''}
            onClick={() => {
              handleChange('model', 'Model 3')
              setConfig(prev => ({
                ...prev,
                is_highland: true,
                first_registration_year: parseInt(prev.first_registration_year) < 2023 ? '2024' : prev.first_registration_year
              }))
            }}
          >
            M3 Highland
          </button>
          <button
            className={config.model === 'Model Y' ? 'active' : ''}
            onClick={() => handleChange('model', 'Model Y')}
          >
            Model Y
          </button>
        </div>
      </div>

      {/* Variant Selection */}
      <div className="selector-row">
        <div className="selector-group variant-group">
          {variants.map(v => (
            <button
              key={v.value}
              className={config.variant_clean === v.value ? 'active' : ''}
              onClick={() => handleChange('variant_clean', v.value)}
              title={v.full}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Year & Mileage */}
      <div className="selector-row inputs-row">
        <div className="input-group">
          <label>Year</label>
          <select
            value={config.first_registration_year}
            onChange={(e) => handleChange('first_registration_year', e.target.value)}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label>Mileage</label>
          <div className="mileage-input-wrapper">
            <input
              type="number"
              value={config.mileage}
              onChange={(e) => handleChange('mileage', parseInt(e.target.value) || 0)}
              min="0"
              max="500000"
              step="5000"
            />
            <span className="mileage-unit">km</span>
          </div>
        </div>
      </div>

      {/* Equipment Toggles */}
      <div className="equipment-section">
        <h4>Equipment</h4>
        <div className="toggle-grid">
          <label className={`toggle-item ${config.autopilot === 'FSD' ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={config.autopilot === 'FSD'}
              onChange={(e) => handleChange('autopilot', e.target.checked ? 'FSD' : 'Standard')}
            />
            <span className="toggle-label">FSD</span>
          </label>
          <label className={`toggle-item ${config.has_heatpump ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={config.has_heatpump}
              onChange={(e) => handleChange('has_heatpump', e.target.checked)}
            />
            <span className="toggle-label">Heat Pump</span>
          </label>
          <label className={`toggle-item ${config.tire_strategy === '8_tires' ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={config.tire_strategy === '8_tires'}
              onChange={(e) => handleChange('tire_strategy', e.target.checked ? '8_tires' : '4_summer')}
            />
            <span className="toggle-label">8 Tires</span>
          </label>
          <label className={`toggle-item ${config.has_hitch ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={config.has_hitch}
              onChange={(e) => handleChange('has_hitch', e.target.checked)}
            />
            <span className="toggle-label">Hitch</span>
          </label>
        </div>
      </div>

      {/* Tax Type */}
      <div className="tax-toggle">
        <button
          className={config.tax_type === 'margin' ? 'active' : ''}
          onClick={() => handleChange('tax_type', 'margin')}
        >
          Private
        </button>
        <button
          className={config.tax_type === 'vat' ? 'active' : ''}
          onClick={() => handleChange('tax_type', 'vat')}
        >
          Company
        </button>
      </div>

    </div>
  )
}

// Price Display Component
function PriceDisplay({ valuation, carSummary, carSpecs, currency }) {
  if (!valuation) {
    return (
      <div className="mobile-price-card loading">
        <div className="car-title">{carSummary}</div>
        <div className="price-skeleton"></div>
      </div>
    )
  }

  if (valuation.error) {
    return (
      <div className="mobile-price-card error">
        <div className="car-title">{carSummary}</div>
        <p className="error-text">{valuation.error}</p>
      </div>
    )
  }

  // Calculate Payout (Market Value - Margin)
  const estimatedValueEUR = valuation.estimated_value - MARGIN_EUR
  const minRangeEUR = valuation.confidence_range.min - MARGIN_EUR
  const maxRangeEUR = valuation.confidence_range.max - MARGIN_EUR

  const isSEK = currency === 'SEK'
  const exchangeRate = isSEK ? EXCHANGE_RATE_SEK : 1

  const displayValue = estimatedValueEUR * exchangeRate
  const displayMin = minRangeEUR * exchangeRate
  const displayMax = maxRangeEUR * exchangeRate

  const currencySymbol = isSEK ? 'kr' : '€'
  const locale = isSEK ? 'sv-SE' : 'de-DE'

  return (
    <div className="mobile-price-card">
      <div className="price-header">
        <span className="car-title">{carSummary}</span>
        <span className="car-specs">{carSpecs}</span>
      </div>
      <div className="price-main">
        <span className="price-label">Estimated Payout</span>
        <span className="price-value">
          {displayValue.toLocaleString(locale, { maximumFractionDigits: 0 })} {currencySymbol}
        </span>
      </div>
      <div className="price-range">
        {displayMin.toLocaleString(locale, { maximumFractionDigits: 0 })} {currencySymbol} – {displayMax.toLocaleString(locale, { maximumFractionDigits: 0 })} {currencySymbol}
      </div>
      <div className="price-meta">
        <div className="meta-chip">
          <span className="meta-number">{valuation.cohort_size}</span>
          <span className="meta-label">Comparables</span>
        </div>
        <div className="meta-chip">
          <span className="meta-number">{valuation.neighbors.length}</span>
          <span className="meta-label">Matches</span>
        </div>
        <div className="meta-chip">
          <span className="meta-number">{valuation.target_age_months}mo</span>
          <span className="meta-label">Age</span>
        </div>
      </div>
    </div>
  )
}

// Simplified Comparables Summary
function ComparablesSummary({ valuation, currency }) {
  if (!valuation || !valuation.neighbors || valuation.neighbors.length === 0) {
    return null
  }

  const isSEK = currency === 'SEK'
  const exchangeRate = isSEK ? EXCHANGE_RATE_SEK : 1
  const currencySymbol = isSEK ? 'kr' : 'EUR'
  const locale = isSEK ? 'sv-SE' : 'de-DE'

  // Margin is NOT applied to historical data, only to the estimation.
  // We just convert the currency.

  const topMatch = valuation.neighbors[0]
  const avgPriceEUR = valuation.neighbors.reduce((sum, n) => sum + n.original_price, 0) / valuation.neighbors.length

  const topMatchPrice = topMatch.original_price * exchangeRate
  const avgPrice = avgPriceEUR * exchangeRate

  return (
    <div className="comparables-summary">
      <h3>Market Insights</h3>

      <div className="insight-card top-match">
        <div className="insight-header">
          <span className="insight-badge">#1 Match</span>
          <span className="insight-weight">{topMatch.weight_percentage}% weight</span>
        </div>
        <div className="insight-body">
          <div className="insight-row">
            <span>Sold for</span>
            <strong>{topMatchPrice.toLocaleString(locale, { maximumFractionDigits: 0 })} {currencySymbol}</strong>
          </div>
          <div className="insight-row">
            <span>Mileage</span>
            <span>{(topMatch.mileage / 1000).toFixed(0)}k km</span>
          </div>
          <div className="insight-row">
            <span>Age at sale</span>
            <span>{topMatch.age_at_auction_months} months</span>
          </div>
          <div className="insight-row">
            <span>Sold</span>
            <span>{new Date(topMatch.end_time).toLocaleDateString('de-DE')}</span>
          </div>
        </div>
      </div>

      <div className="insight-stats">
        <div className="stat-box">
          <span className="stat-value">{avgPrice.toLocaleString(locale, { maximumFractionDigits: 0 })} {currencySymbol}</span>
          <span className="stat-label">Avg. Sale Price</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">{valuation.neighbors.filter(n => n.status.includes('accepted')).length}/{valuation.neighbors.length}</span>
          <span className="stat-label">Sold vs Declined</span>
        </div>
      </div>
    </div>
  )
}

function FeedbackSection({ valuation, config, currency, onReset }) {
  const [status, setStatus] = useState('idle') // idle, saving, success, error

  // Reset status when valuation changes (new car config)
  useMemo(() => {
    setStatus('idle')
  }, [valuation])

  const handleFeedback = async (accepted) => {
    if (!supabase) {
      console.warn('Supabase not configured')
      setStatus('error')
      return;
    }

    setStatus('saving')
    try {
      const payoutVal = valuation.estimated_value - MARGIN_EUR

      const { error } = await supabase
        .from('sweden_research')
        .insert({
          car_config: config,
          market_value_eur: valuation.estimated_value,
          margin_eur: MARGIN_EUR,
          payout_eur: payoutVal,
          payout_sek: payoutVal * EXCHANGE_RATE_SEK,
          currency_viewed: currency,
          is_accepted: accepted
        })

      if (error) throw error
      setStatus('success')
    } catch (e) {
      console.error(e)
      setStatus('error')
    }
  }

  if (!valuation || !valuation.estimated_value) return null

  if (status === 'success') {
    return (
      <div className="feedback-card success">
        <p>Thank you! Feedback saved.</p>
        <button className="btn-new-valuation" onClick={onReset}>
          New Valuation
        </button>
      </div>
    )
  }

  return (
    <div className="feedback-card">
      <h3>Would you sell at this price?</h3>
      <div className="feedback-buttons">
        <button className="btn-yes" onClick={() => handleFeedback(true)} disabled={status === 'saving'}>
          Yes
        </button>
        <button className="btn-no" onClick={() => handleFeedback(false)} disabled={status === 'saving'}>
          No
        </button>
      </div>
      {status === 'error' && <p className="error-text">Failed to save. Try again.</p>}
    </div>
  )
}

// Main Mobile App Component
function MobileValuation() {
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
  })

  // Currency State (Default SEK)
  const [currency, setCurrency] = useState('SEK')

  const [showDetails, setShowDetails] = useState(false)

  const valuation = useMemo(() => {
    const targetCar = {
      ...config,
      first_registration: `${config.first_registration_year}-${config.first_registration_month}-01`
    }
    return calculateValuation(targetCar, auctionData)
  }, [config])

  const carSummary = `${config.model}${config.is_highland ? ' Highland' : ''} ${VARIANT_SHORT_NAMES[config.variant_clean]}`
  const carSpecs = `${config.first_registration_year} · ${(config.mileage / 1000).toFixed(0)}k km`

  return (
    <div className="mobile-app">
      <div className="currency-switch-container">
        <div className="currency-toggle">
          <button
            className={currency === 'SEK' ? 'active' : ''}
            onClick={() => setCurrency('SEK')}
          >
            SEK
          </button>
          <button
            className={currency === 'EUR' ? 'active' : ''}
            onClick={() => setCurrency('EUR')}
          >
            EUR
          </button>
        </div>
      </div>

      <main className="mobile-main">
        <PriceDisplay
          valuation={valuation}
          carSummary={carSummary}
          carSpecs={carSpecs}
          currency={currency}
        />

        <FeedbackSection
          valuation={valuation}
          config={config}
          currency={currency}
          onReset={() => {
            // Reset to defaults
            setConfig({
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
            })
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />

        <CarSelector config={config} setConfig={setConfig} />

        {valuation && valuation.neighbors && valuation.neighbors.length > 0 && (
          <button
            className="show-details-btn"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide Market Details' : 'Show Market Details'}
            <span className={`chevron ${showDetails ? 'up' : 'down'}`}></span>
          </button>
        )}

        {showDetails && <ComparablesSummary valuation={valuation} currency={currency} />}
      </main>

      <footer className="mobile-footer">
        <p>Based on {auctionData.length} B2B auction results</p>
      </footer>
    </div>
  )
}

export default MobileValuation

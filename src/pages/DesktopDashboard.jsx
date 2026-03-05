import { useMemo, useState } from 'react'
import '../App.css'

const MODEL_CHOICES = [
  { value: 'model_3', label: 'Model 3', model: 'Model 3', isHighland: false, defaultVariant: 'm3_lr' },
  { value: 'model_3_highland', label: 'Model 3 Highland', model: 'Model 3', isHighland: true, defaultVariant: 'm3_lr' },
  { value: 'model_y', label: 'Model Y', model: 'Model Y', isHighland: false, defaultVariant: 'my_lr' }
]

const VARIANT_CHOICES = {
  'Model 3': [
    { value: 'm3_sr', label: 'Standard Range' },
    { value: 'm3_lr', label: 'Long Range' },
    { value: 'm3_p', label: 'Performance' }
  ],
  'Model Y': [
    { value: 'my_sr', label: 'Standard Range' },
    { value: 'my_lr', label: 'Long Range' },
    { value: 'my_p', label: 'Performance' }
  ]
}

const AUTOPILOT_CHOICES = [
  { value: 'Standard', label: 'Standard' },
  { value: 'EAP', label: 'EAP' },
  { value: 'FSD', label: 'FSD' }
]

const TIRE_CHOICES = [
  { value: '4_summer', label: 'Summer' },
  { value: '4_winter', label: 'Winter' },
  { value: '4_all_season', label: 'All-season' },
  { value: '8_tires', label: '8 tires' }
]

const TAX_CHOICES = [
  { value: 'margin', label: 'Private / Margin' },
  { value: 'vat', label: 'Company / VAT' }
]

const MONTH_CHOICES = [
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
]

const DEFAULT_CONFIG = {
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
}

function getModelSelectionValue(config) {
  if (config.model === 'Model Y') return 'model_y'
  return config.is_highland ? 'model_3_highland' : 'model_3'
}

function buildTargetCar(config) {
  return {
    ...config,
    first_registration: `${config.first_registration_year}-${config.first_registration_month}-01`
  }
}

function formatCurrency(value) {
  return `€${value.toLocaleString('de-DE')}`
}

function formatDiffMonths(deltaMonths) {
  if (!deltaMonths) {
    return 'Same age at sale'
  }

  const amount = Math.abs(deltaMonths)
  const unit = amount === 1 ? 'month' : 'months'
  return deltaMonths > 0
    ? `${amount} ${unit} older at sale`
    : `${amount} ${unit} newer at sale`
}

function formatDiffMileage(deltaKm) {
  if (!deltaKm) {
    return 'Same mileage at sale'
  }

  const amount = Math.abs(deltaKm).toLocaleString('de-DE')
  return deltaKm > 0
    ? `${amount} km more at sale`
    : `${amount} km less at sale`
}

function formatSaleDate(isoDate) {
  if (!isoDate) return 'Unknown sale date'
  return new Date(isoDate).toLocaleDateString('de-DE', { year: 'numeric', month: 'short' })
}

function ChoiceGroup({ options, value, onChange }) {
  return (
    <div className="choice-group" role="group">
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={value === option.value ? 'choice active' : 'choice'}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function Configurator({ config, onChange, onCalculate, isLoading }) {
  const modelSelectionValue = getModelSelectionValue(config)
  const variantOptions = VARIANT_CHOICES[config.model]

  const currentYear = new Date().getFullYear()
  const minYear = config.is_highland ? 2023 : 2019
  const yearOptions = useMemo(() => {
    const years = []
    for (let year = currentYear; year >= minYear; year -= 1) {
      years.push(String(year))
    }
    return years
  }, [currentYear, minYear])

  const handleModelSelection = (nextValue) => {
    const nextModel = MODEL_CHOICES.find((entry) => entry.value === nextValue)
    if (!nextModel) return

    onChange((prev) => {
      const next = {
        ...prev,
        model: nextModel.model,
        is_highland: nextModel.isHighland,
        variant_clean: nextModel.defaultVariant
      }

      if (nextModel.isHighland && Number(prev.first_registration_year) < 2023) {
        next.first_registration_year = '2024'
      }

      return next
    })
  }

  return (
    <section className="journey-card" aria-label="Step 1 Configure your car">
      <div className="step-header">
        <span className="step-index">Step 1</span>
        <h2>Configure your Tesla</h2>
      </div>

      <div className="form-grid">
        <div className="field">
          <label>Model</label>
          <ChoiceGroup options={MODEL_CHOICES.map(({ value, label }) => ({ value, label }))} value={modelSelectionValue} onChange={handleModelSelection} />
        </div>

        <div className="field">
          <label>Variant</label>
          <ChoiceGroup options={variantOptions} value={config.variant_clean} onChange={(value) => onChange({ variant_clean: value })} />
        </div>

        <div className="field two-columns">
          <div>
            <label>First registration month</label>
            <select value={config.first_registration_month} onChange={(event) => onChange({ first_registration_month: event.target.value })}>
              {MONTH_CHOICES.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label>First registration year</label>
            <select value={config.first_registration_year} onChange={(event) => onChange({ first_registration_year: event.target.value })}>
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Mileage (km)</label>
          <input
            type="number"
            min="0"
            step="1000"
            value={config.mileage}
            onChange={(event) => onChange({ mileage: Number.parseInt(event.target.value, 10) || 0 })}
          />
          <p className="field-hint">{Math.round(config.mileage / 1000)}k km</p>
        </div>

        <div className="field">
          <label>Tax type</label>
          <ChoiceGroup options={TAX_CHOICES} value={config.tax_type} onChange={(value) => onChange({ tax_type: value })} />
        </div>

        <div className="field">
          <label>Accident history</label>
          <ChoiceGroup
            options={[
              { value: 'accident_free', label: 'Accident-free' },
              { value: 'has_accident', label: 'Has accident' }
            ]}
            value={config.is_accident_free ? 'accident_free' : 'has_accident'}
            onChange={(value) => onChange({ is_accident_free: value === 'accident_free' })}
          />
        </div>

        <div className="field">
          <label>Autopilot</label>
          <ChoiceGroup options={AUTOPILOT_CHOICES} value={config.autopilot} onChange={(value) => onChange({ autopilot: value })} />
        </div>

        <div className="field">
          <label>Tires included</label>
          <ChoiceGroup options={TIRE_CHOICES} value={config.tire_strategy} onChange={(value) => onChange({ tire_strategy: value })} />
        </div>

        <div className="field two-columns toggles">
          <label className="toggle">
            <input type="checkbox" checked={config.has_heatpump} onChange={(event) => onChange({ has_heatpump: event.target.checked })} />
            <span>Heat pump</span>
          </label>

          <label className="toggle">
            <input type="checkbox" checked={config.has_hitch} onChange={(event) => onChange({ has_hitch: event.target.checked })} />
            <span>Trailer hitch</span>
          </label>
        </div>
      </div>

      <button type="button" className="primary-button" onClick={onCalculate} disabled={isLoading}>
        {isLoading ? 'Calculating...' : 'Show estimated price'}
      </button>
    </section>
  )
}

function EmptyResultState() {
  return (
    <section className="journey-card result-card muted" aria-label="Step 2 See your estimated value">
      <div className="step-header">
        <span className="step-index">Step 2</span>
        <h2>See your estimated value</h2>
      </div>
      <p className="empty-copy">Your result appears here after you finish the configuration and run the valuation.</p>
    </section>
  )
}

function ErrorResultState({ message, onBack }) {
  return (
    <section className="journey-card result-card" aria-label="Valuation error">
      <div className="step-header">
        <span className="step-index">Step 2</span>
        <h2>Unable to estimate right now</h2>
      </div>
      <p className="error-copy">{message}</p>
      <p className="status-note">Try a slightly broader setup (variant, age, or tax type) and run again.</p>
      <button type="button" className="secondary-button" onClick={onBack}>
        Edit configuration
      </button>
    </section>
  )
}

function ComparableList({ valuation, configSnapshot }) {
  const neighbors = valuation.neighbors || []

  if (!neighbors.length) return null

  return (
    <section className="comparables" aria-label="Comparable cars">
      <h3>Closest comparable sales</h3>
      <div className="comparable-list">
        {neighbors.slice(0, 3).map((neighbor, index) => {
          const mileageDelta = neighbor.mileage - configSnapshot.mileage
          const ageDelta = neighbor.age_at_auction_months - valuation.target_age_months

          return (
            <article className="comparable-item" key={`${neighbor.end_time}-${index}`}>
              <div className="comparable-head">
                <span className="badge">Comparable {index + 1}</span>
                <span className="sale-date">Sold {formatSaleDate(neighbor.end_time)}</span>
              </div>
              <p className="sale-price">{formatCurrency(neighbor.original_price)}</p>
              <ul className="delta-list">
                <li>{formatDiffAge(ageDelta)}</li>
                <li>{formatDiffMileage(mileageDelta)}</li>
              </ul>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function formatDiffAge(deltaMonths) {
  return formatDiffMonths(deltaMonths)
}

function ResultState({ valuation, configSnapshot, isLoading, onBack }) {
  if (isLoading) {
    return (
      <section className="journey-card result-card" aria-label="Valuation loading state">
        <div className="step-header">
          <span className="step-index">Step 2</span>
          <h2>Calculating estimate</h2>
        </div>
        <p className="empty-copy">Matching your car against recent Tesla auction sales...</p>
        <button type="button" className="secondary-button" onClick={onBack}>
          Edit configuration
        </button>
      </section>
    )
  }

  if (!valuation) {
    return <EmptyResultState />
  }

  if (valuation.error) {
    return <ErrorResultState message={valuation.error} onBack={onBack} />
  }

  return (
    <section className="journey-card result-card" aria-label="Valuation result">
      <div className="step-header">
        <span className="step-index">Step 2</span>
        <h2>Your estimated market price</h2>
      </div>

      {!configSnapshot.is_accident_free ? (
        <p className="warning-copy">
          This estimate is based on accident-free comparables. Accident damage usually lowers real resale price.
        </p>
      ) : null}

      <div className="price-block">
        <p className="price-main">{formatCurrency(valuation.estimated_value)}</p>
        <p className="price-range">
          Range {formatCurrency(valuation.confidence_range.min)} to {formatCurrency(valuation.confidence_range.max)}
        </p>
      </div>

      <div className="meta-grid">
        <div>
          <span className="meta-label">Comparables used</span>
          <span className="meta-value">{valuation.neighbors.length}</span>
        </div>
        <div>
          <span className="meta-label">Matching cohort</span>
          <span className="meta-value">{valuation.cohort_size}</span>
        </div>
      </div>

      <ComparableList valuation={valuation} configSnapshot={configSnapshot} />

      <button type="button" className="secondary-button" onClick={onBack}>
        Edit configuration
      </button>
    </section>
  )
}

function DesktopDashboard() {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [configSnapshot, setConfigSnapshot] = useState(DEFAULT_CONFIG)
  const [valuation, setValuation] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeStep, setActiveStep] = useState(1)

  const updateConfig = (update) => {
    setConfig((previous) => {
      if (typeof update === 'function') {
        return update(previous)
      }

      return { ...previous, ...update }
    })

  }

  const calculateValuation = async () => {
    setActiveStep(2)
    setIsLoading(true)

    const snapshot = { ...config }
    setConfigSnapshot(snapshot)

    const endpoint = import.meta.env.PROD
      ? 'https://tesla-valuation-widget.vercel.app/api/valuate'
      : '/api/valuate'

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildTargetCar(snapshot))
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const payload = await response.json()
      setValuation(payload.valuation)
    } catch (error) {
      console.error('Error fetching valuation:', error)
      setValuation({ error: 'Failed to fetch valuation data. Please try again later.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="widget-shell">
      <header className="widget-header">
        <h1>Tesla Valuation</h1>
        <p>Configure your car and reveal an instant market estimate from real B2B auction data.</p>
      </header>

      <main className="journey-layout">
        {activeStep === 1 ? (
          <Configurator
            config={config}
            onChange={updateConfig}
            onCalculate={calculateValuation}
            isLoading={isLoading}
          />
        ) : (
          <ResultState
            valuation={valuation}
            configSnapshot={configSnapshot}
            isLoading={isLoading}
            onBack={() => setActiveStep(1)}
          />
        )}
      </main>
    </div>
  )
}

export default DesktopDashboard

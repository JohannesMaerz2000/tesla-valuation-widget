import { useEffect, useMemo, useRef, useState } from 'react'
import '../App.css'

const MODEL_CHOICES = [
  { value: 'model_3', label: 'Model 3', model: 'Model 3', isHighland: false },
  { value: 'model_3_highland', label: 'Model 3 Highland', model: 'Model 3', isHighland: true },
  { value: 'model_y', label: 'Model Y', model: 'Model Y', isHighland: false }
]

const VARIANT_CHOICES = [
  { value: 'sr', label: 'Standard Range' },
  { value: 'lr', label: 'Long Range' },
  { value: 'p', label: 'Performance' }
]

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
  model: null,
  variant_tier: null,
  is_highland: null,
  tax_type: null,
  autopilot: null,
  tire_strategy: null,
  has_heatpump: false,
  has_hitch: false,
  mileage: '',
  first_registration_year: '',
  first_registration_month: ''
}

function getModelSelectionValue(config) {
  if (!config.model) return null
  if (config.model === 'Model Y') return 'model_y'
  return config.is_highland ? 'model_3_highland' : 'model_3'
}

function buildTargetCar(config) {
  const variant_clean = config.model === 'Model Y'
    ? `my_${config.variant_tier}`
    : `m3_${config.variant_tier}`

  return {
    ...config,
    variant_clean,
    is_accident_free: true,
    mileage: Number(config.mileage),
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

function Configurator({
  config,
  configStep,
  onNextStep,
  onPreviousStep,
  onChange,
  onCalculate,
  isLoading,
  isPrimaryStepComplete,
  isComplete
}) {
  const modelSelectionValue = getModelSelectionValue(config)
  const panelRef = useRef(null)
  const maxPanelHeightRef = useRef(0)
  const [stablePanelHeight, setStablePanelHeight] = useState(null)

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
        is_highland: nextModel.isHighland
      }

      if (nextModel.isHighland && prev.first_registration_year && Number(prev.first_registration_year) < 2023) {
        next.first_registration_year = ''
        next.first_registration_month = ''
      }

      return next
    })
  }

  useEffect(() => {
    const panelElement = panelRef.current
    if (!panelElement || typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver((entries) => {
      const nextHeight = Math.ceil(entries[0]?.contentRect?.height ?? 0)
      if (!nextHeight || nextHeight <= maxPanelHeightRef.current) return

      maxPanelHeightRef.current = nextHeight
      setStablePanelHeight(nextHeight)
    })

    observer.observe(panelElement)

    return () => observer.disconnect()
  }, [configStep, isLoading, isPrimaryStepComplete, isComplete])

  return (
    <section className="journey-card" aria-label={`Configuration step ${configStep} of 2`}>
      <div className="step-header">
        <span className="step-index">Step {configStep}</span>
        <h2>{configStep === 1 ? 'Select Model' : 'Select equipment details'}</h2>
      </div>

      <div className="step-progress" aria-hidden="true">
        <span className={configStep === 1 ? 'progress-dot active' : 'progress-dot'} />
        <span className={configStep === 2 ? 'progress-dot active' : 'progress-dot'} />
      </div>

      <div ref={panelRef} className="config-panel" style={stablePanelHeight ? { minHeight: `${stablePanelHeight}px` } : undefined}>
        {configStep === 1 ? (
          <>
            <div className="form-grid">
              <div className="field">
                <label>Model</label>
                <ChoiceGroup options={MODEL_CHOICES.map(({ value, label }) => ({ value, label }))} value={modelSelectionValue} onChange={handleModelSelection} />
              </div>

              <div className="field">
                <label>Variant</label>
                <ChoiceGroup options={VARIANT_CHOICES} value={config.variant_tier} onChange={(value) => onChange({ variant_tier: value })} />
              </div>

              <div className="field two-columns">
                <div>
                  <label>First registration month</label>
                  <select value={config.first_registration_month} onChange={(event) => onChange({ first_registration_month: event.target.value })}>
                    <option value="">Select month</option>
                    {MONTH_CHOICES.map((month) => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>First registration year</label>
                  <select value={config.first_registration_year} onChange={(event) => onChange({ first_registration_year: event.target.value })}>
                    <option value="">Select year</option>
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
                  onChange={(event) => onChange({ mileage: event.target.value })}
                />
                {config.mileage !== '' ? <p className="field-hint">{Math.round(Number(config.mileage) / 1000)}k km</p> : null}
              </div>
            </div>

            <button type="button" className="primary-button" onClick={onNextStep} disabled={!isPrimaryStepComplete}>
              Continue
            </button>
          </>
        ) : (
          <>
            <div className="form-grid">
              <div className="field">
                <label>Tax type</label>
                <ChoiceGroup options={TAX_CHOICES} value={config.tax_type} onChange={(value) => onChange({ tax_type: value })} />
              </div>

              <div className="field">
                <label>Autopilot</label>
                <ChoiceGroup options={AUTOPILOT_CHOICES} value={config.autopilot} onChange={(value) => onChange({ autopilot: value })} />
              </div>

              <div className="field field-tires">
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

            <div className="button-row">
              <button type="button" className="secondary-button" onClick={onPreviousStep}>
                Back
              </button>

              <button type="button" className="primary-button" onClick={onCalculate} disabled={isLoading || !isComplete}>
                {isLoading ? 'Calculating...' : 'Show estimated price'}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function EmptyResultState() {
  return (
    <section className="journey-card result-card muted" aria-label="Result placeholder">
      <div className="step-header">
        <span className="step-index">Result</span>
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
        <span className="step-index">Result</span>
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
          <span className="step-index">Result</span>
          <h2>Calculating estimate</h2>
        </div>
        <div className="loading-shell" aria-live="polite" aria-busy="true">
          <div className="loading-status">
            <span className="loading-spinner" aria-hidden="true" />
            <p className="loading-copy">Matching your car against recent Tesla auction sales...</p>
          </div>

          <div className="loading-card" aria-hidden="true">
            <span className="loading-line loading-line-wide" />
            <span className="loading-line loading-line-mid" />
            <span className="loading-line loading-line-short" />
          </div>
        </div>

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
        <span className="step-index">Result</span>
        <h2>Your estimated market price</h2>
      </div>

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
  const [configStep, setConfigStep] = useState(1)
  const [layoutLockHeight, setLayoutLockHeight] = useState(null)
  const journeyLayoutRef = useRef(null)

  const isPrimaryStepComplete = useMemo(() => {
    return (
      !!config.model &&
      !!config.variant_tier &&
      config.first_registration_month !== '' &&
      config.first_registration_year !== '' &&
      config.mileage !== '' &&
      Number(config.mileage) >= 0
    )
  }, [config])

  const isConfigComplete = useMemo(() => {
    return (
      !!config.model &&
      !!config.variant_tier &&
      !!config.tax_type &&
      !!config.autopilot &&
      !!config.tire_strategy &&
      config.first_registration_month !== '' &&
      config.first_registration_year !== '' &&
      config.mileage !== '' &&
      Number(config.mileage) >= 0
    )
  }, [config])

  useEffect(() => {
    if (isLoading || layoutLockHeight === null) return undefined

    const unlockFrame = window.requestAnimationFrame(() => {
      setLayoutLockHeight(null)
    })

    return () => window.cancelAnimationFrame(unlockFrame)
  }, [isLoading, layoutLockHeight])

  const updateConfig = (update) => {
    setConfig((previous) => {
      if (typeof update === 'function') {
        return update(previous)
      }

      return { ...previous, ...update }
    })

  }

  const calculateValuation = async () => {
    if (!isConfigComplete) return

    const currentLayoutHeight = journeyLayoutRef.current?.getBoundingClientRect().height
    if (currentLayoutHeight) {
      setLayoutLockHeight(Math.ceil(currentLayoutHeight))
    }

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
      <main
        ref={journeyLayoutRef}
        className="journey-layout"
        style={layoutLockHeight ? { minHeight: `${layoutLockHeight}px` } : undefined}
      >
        {activeStep === 1 ? (
          <Configurator
            config={config}
            configStep={configStep}
            onNextStep={() => setConfigStep(2)}
            onPreviousStep={() => setConfigStep(1)}
            onChange={updateConfig}
            onCalculate={calculateValuation}
            isLoading={isLoading}
            isPrimaryStepComplete={isPrimaryStepComplete}
            isComplete={isConfigComplete}
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

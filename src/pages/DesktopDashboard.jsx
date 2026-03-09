import { useEffect, useMemo, useRef, useState } from 'react'
import '../App.css'
import {
  createTranslator,
  detectInitialLocale,
  getIntlLocale,
  resolveLocale,
  SUPPORTED_LOCALES
} from '../i18n/index.js'

const MODEL_CHOICES = [
  { value: 'model_3', labelKey: 'choices.model.model_3', model: 'Model 3', isHighland: false },
  { value: 'model_3_highland', labelKey: 'choices.model.model_3_highland', model: 'Model 3', isHighland: true },
  { value: 'model_y', labelKey: 'choices.model.model_y', model: 'Model Y', isHighland: false }
]

const VARIANT_CHOICES = [
  { value: 'sr', labelKey: 'choices.variant.sr' },
  { value: 'lr', labelKey: 'choices.variant.lr' },
  { value: 'p', labelKey: 'choices.variant.p' }
]

const AUTOPILOT_CHOICES = [
  { value: 'Standard', labelKey: 'choices.autopilot.Standard' },
  { value: 'EAP', labelKey: 'choices.autopilot.EAP' },
  { value: 'FSD', labelKey: 'choices.autopilot.FSD' }
]

const TIRE_CHOICES = [
  { value: '4_summer', labelKey: 'choices.tire.4_summer' },
  { value: '4_winter', labelKey: 'choices.tire.4_winter' },
  { value: '4_all_season', labelKey: 'choices.tire.4_all_season' },
  { value: '8_tires', labelKey: 'choices.tire.8_tires' }
]

const TAX_CHOICES = [
  { value: 'margin', labelKey: 'choices.tax.margin' },
  { value: 'vat', labelKey: 'choices.tax.vat' }
]

const MONTH_CHOICES = [
  { value: '01', labelKey: 'months.01' },
  { value: '02', labelKey: 'months.02' },
  { value: '03', labelKey: 'months.03' },
  { value: '04', labelKey: 'months.04' },
  { value: '05', labelKey: 'months.05' },
  { value: '06', labelKey: 'months.06' },
  { value: '07', labelKey: 'months.07' },
  { value: '08', labelKey: 'months.08' },
  { value: '09', labelKey: 'months.09' },
  { value: '10', labelKey: 'months.10' },
  { value: '11', labelKey: 'months.11' },
  { value: '12', labelKey: 'months.12' }
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

function formatCurrency(value, intlLocale) {
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(value)
}

function formatDiffMonths(deltaMonths, t) {
  if (!deltaMonths) {
    return t('result.sameAgeAtSale')
  }

  const amount = Math.abs(deltaMonths)
  const unitKey = amount === 1 ? 'result.monthSingular' : 'result.monthPlural'
  const unit = t(unitKey)

  return deltaMonths > 0
    ? t('result.olderAtSale', { amount, unit })
    : t('result.newerAtSale', { amount, unit })
}

function formatDiffMileage(deltaKm, t, intlLocale) {
  if (!deltaKm) {
    return t('result.sameMileageAtSale')
  }

  const rounded = Math.round(Math.abs(deltaKm) / 1000) * 1000
  if (rounded === 0) return t('result.sameMileageAtSale')

  const amount = rounded.toLocaleString(intlLocale)
  return deltaKm > 0
    ? t('result.moreMileageAtSale', { amount })
    : t('result.lessMileageAtSale', { amount })
}

function formatSaleDate(isoDate, t, intlLocale) {
  if (!isoDate) return t('result.unknownSaleDate')
  return new Date(isoDate).toLocaleDateString(intlLocale, { year: 'numeric', month: 'short' })
}

function getOptionLabel(option, t) {
  if (option.label) return option.label
  if (option.labelKey) return t(option.labelKey)
  return option.value
}

function ChoiceGroup({ options, value, onChange, t }) {
  return (
    <div className="choice-group" role="group">
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={value === option.value ? 'choice active' : 'choice'}
          onClick={() => onChange(option.value)}
        >
          {getOptionLabel(option, t)}
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
  isComplete,
  t,
  intlLocale
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
    <section className="journey-card" aria-label={t('step.progress', { step: configStep, total: 2 })}>
      <div className="step-header">
        <span className="step-index">{t('step.label', { step: configStep })}</span>
        <h2>{configStep === 1 ? t('step.selectModel') : t('step.selectEquipment')}</h2>
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
                <label>{t('form.model')}</label>
                <ChoiceGroup options={MODEL_CHOICES} value={modelSelectionValue} onChange={handleModelSelection} t={t} />
              </div>

              <div className="field">
                <label>{t('form.variant')}</label>
                <ChoiceGroup options={VARIANT_CHOICES} value={config.variant_tier} onChange={(value) => onChange({ variant_tier: value })} t={t} />
              </div>

              <div className="field two-columns">
                <div>
                  <label>{t('form.firstRegistrationMonth')}</label>
                  <select value={config.first_registration_month} onChange={(event) => onChange({ first_registration_month: event.target.value })}>
                    <option value="">{t('form.selectMonth')}</option>
                    {MONTH_CHOICES.map((month) => (
                      <option key={month.value} value={month.value}>{t(month.labelKey)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>{t('form.firstRegistrationYear')}</label>
                  <select value={config.first_registration_year} onChange={(event) => onChange({ first_registration_year: event.target.value })}>
                    <option value="">{t('form.selectYear')}</option>
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>{t('form.mileage')}</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={config.mileage}
                  onChange={(event) => onChange({ mileage: event.target.value })}
                />
                {config.mileage !== '' ? (
                  <p className="field-hint">{t('form.mileageHint', { value: Math.round(Number(config.mileage) / 1000).toLocaleString(intlLocale) })}</p>
                ) : null}
              </div>
            </div>

            <button type="button" className="primary-button" onClick={onNextStep} disabled={!isPrimaryStepComplete}>
              {t('form.continue')}
            </button>
          </>
        ) : (
          <>
            <div className="form-grid">
              <div className="field">
                <label>{t('form.taxType')}</label>
                <ChoiceGroup options={TAX_CHOICES} value={config.tax_type} onChange={(value) => onChange({ tax_type: value })} t={t} />
              </div>

              <div className="field">
                <label>{t('form.autopilot')}</label>
                <ChoiceGroup options={AUTOPILOT_CHOICES} value={config.autopilot} onChange={(value) => onChange({ autopilot: value })} t={t} />
              </div>

              <div className="field field-tires">
                <label>{t('form.tiresIncluded')}</label>
                <ChoiceGroup options={TIRE_CHOICES} value={config.tire_strategy} onChange={(value) => onChange({ tire_strategy: value })} t={t} />
              </div>

              <div className="field two-columns toggles">
                <label className="toggle">
                  <input type="checkbox" checked={config.has_heatpump} onChange={(event) => onChange({ has_heatpump: event.target.checked })} />
                  <span>{t('form.heatPump')}</span>
                </label>

                <label className="toggle">
                  <input type="checkbox" checked={config.has_hitch} onChange={(event) => onChange({ has_hitch: event.target.checked })} />
                  <span>{t('form.trailerHitch')}</span>
                </label>
              </div>
            </div>

            <div className="button-row">
              <button type="button" className="secondary-button" onClick={onPreviousStep}>
                {t('form.back')}
              </button>

              <button type="button" className="primary-button" onClick={onCalculate} disabled={isLoading || !isComplete}>
                {isLoading ? t('form.calculating') : t('form.showEstimatedPrice')}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function EmptyResultState({ t }) {
  return (
    <section className="journey-card result-card muted" aria-label={t('result.placeholderAria')}>
      <div className="step-header">
        <span className="step-index">{t('result.label')}</span>
        <h2>{t('result.placeholderTitle')}</h2>
      </div>
      <p className="empty-copy">{t('result.placeholderCopy')}</p>
    </section>
  )
}

function ErrorResultState({ message, onBack, t }) {
  return (
    <section className="journey-card result-card" aria-label={t('result.errorAria')}>
      <div className="step-header">
        <span className="step-index">{t('result.label')}</span>
        <h2>{t('result.errorTitle')}</h2>
      </div>
      <p className="error-copy">{message}</p>
      <p className="status-note">{t('result.statusNote')}</p>
      <button type="button" className="secondary-button" onClick={onBack}>
        {t('result.editConfiguration')}
      </button>
    </section>
  )
}

function ComparableList({ valuation, configSnapshot, t, intlLocale }) {
  const neighbors = valuation.neighbors || []

  if (!neighbors.length) return null

  return (
    <section className="comparables-compact" aria-label={t('result.comparableCarsAria')}>
      <h3 className="comparables-heading">{t('result.comparablesHeading')}</h3>
      <div className="comp-table">
        {neighbors.slice(0, 3).map((neighbor, index) => {
          const mileageDelta = neighbor.mileage - configSnapshot.mileage
          const ageDelta = neighbor.age_at_auction_months - valuation.target_age_months

          return (
            <div className="comp-row" key={`${neighbor.end_time}-${index}`}>
              <span className="comp-rank" aria-label={t('result.comparableLabel', { index: index + 1 })}>{index + 1}</span>
              <div className="comp-main">
                <span className="comp-price">{formatCurrency(neighbor.original_price, intlLocale)}</span>
                <span className="comp-date">{formatSaleDate(neighbor.end_time, t, intlLocale)}</span>
              </div>
              <div className="comp-deltas">
                <span>{formatDiffAge(ageDelta, t)}</span>
                <span>{formatDiffMileage(mileageDelta, t, intlLocale)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function formatDiffAge(deltaMonths, t) {
  return formatDiffMonths(deltaMonths, t)
}

function ResultState({ valuation, configSnapshot, isLoading, onBack, t, intlLocale }) {
  if (isLoading) {
    return (
      <section className="journey-card result-card" aria-label={t('result.loadingAria')}>
        <div className="step-header">
          <span className="step-index">{t('result.label')}</span>
          <h2>{t('result.loadingTitle')}</h2>
        </div>
        <div className="loading-shell" aria-live="polite" aria-busy="true">
          <div className="loading-status">
            <span className="loading-spinner" aria-hidden="true" />
            <p className="loading-copy">{t('result.loadingCopy')}</p>
          </div>

          <div className="loading-card" aria-hidden="true">
            <span className="loading-line loading-line-wide" />
            <span className="loading-line loading-line-mid" />
            <span className="loading-line loading-line-short" />
          </div>
        </div>

        <button type="button" className="secondary-button" onClick={onBack}>
          {t('result.editConfiguration')}
        </button>
      </section>
    )
  }

  if (!valuation) {
    return <EmptyResultState t={t} />
  }

  if (valuation.error) {
    return <ErrorResultState message={valuation.error} onBack={onBack} t={t} />
  }

  return (
    <section className="journey-card result-card" aria-label={t('result.finalAria')}>
      <div className="step-header">
        <span className="step-index">{t('result.label')}</span>
        <h2>{t('result.finalTitle')}</h2>
      </div>

      <div className="price-block-compact">
        <p className="price-main">{formatCurrency(valuation.estimated_value, intlLocale)}</p>
        <div className="price-sub-row">
          <span className="price-range-inline">
            {formatCurrency(valuation.confidence_range.min, intlLocale)} - {formatCurrency(valuation.confidence_range.max, intlLocale)}
          </span>
          <span className="meta-chip">{t('result.cohort', { count: valuation.cohort_size.toLocaleString(intlLocale) })}</span>
        </div>
      </div>

      <ComparableList valuation={valuation} configSnapshot={configSnapshot} t={t} intlLocale={intlLocale} />

      <button type="button" className="secondary-button" onClick={onBack}>
        {t('result.editConfiguration')}
      </button>
    </section>
  )
}

function LocaleSwitcher({ locale, onLocaleChange, t }) {
  return (
    <div className="widget-toolbar">
      <span className="locale-label">{t('language.label')}</span>
      <div className="locale-switch" role="group" aria-label={t('language.label')}>
        {SUPPORTED_LOCALES.map((localeCode) => (
          <button
            key={localeCode}
            type="button"
            className={locale === localeCode ? 'locale-button active' : 'locale-button'}
            onClick={() => onLocaleChange(localeCode)}
          >
            {t(`language.names.${localeCode}`)}
          </button>
        ))}
      </div>
    </div>
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
  const [locale, setLocale] = useState(() => detectInitialLocale())
  const journeyLayoutRef = useRef(null)

  const t = useMemo(() => createTranslator(locale), [locale])
  const intlLocale = useMemo(() => getIntlLocale(locale), [locale])

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

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem('tesla-widget-locale', locale)
    } catch {
      // Ignore storage write errors in locked-down embed environments.
    }
  }, [locale])

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
      setValuation({ error: t('result.fetchError') })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="widget-shell" lang={locale}>
      <LocaleSwitcher
        locale={locale}
        onLocaleChange={(nextLocale) => setLocale(resolveLocale(nextLocale))}
        t={t}
      />

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
            t={t}
            intlLocale={intlLocale}
          />
        ) : (
          <ResultState
            valuation={valuation}
            configSnapshot={configSnapshot}
            isLoading={isLoading}
            onBack={() => setActiveStep(1)}
            t={t}
            intlLocale={intlLocale}
          />
        )}
      </main>
    </div>
  )
}

export default DesktopDashboard

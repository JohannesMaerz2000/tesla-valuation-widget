const MESSAGES = {
  en: {
    language: {
      label: 'Language',
      names: {
        en: 'English',
        de: 'German'
      }
    },
    step: {
      progress: 'Configuration step {step} of {total}',
      label: 'Step {step}',
      selectModel: 'Select model',
      selectEquipment: 'Select equipment details'
    },
    form: {
      model: 'Model',
      variant: 'Variant',
      firstRegistrationMonth: 'First registration month',
      firstRegistrationYear: 'First registration year',
      mileage: 'Mileage (km)',
      selectMonth: 'Select month',
      selectYear: 'Select year',
      taxType: 'Tax type',
      autopilot: 'Autopilot',
      tiresIncluded: 'Tires included',
      heatPump: 'Heat pump',
      trailerHitch: 'Trailer hitch',
      continue: 'Continue',
      back: 'Back',
      calculating: 'Calculating...',
      showEstimatedPrice: 'Show estimated price',
      mileageHint: '{value}k km'
    },
    result: {
      label: 'Result',
      placeholderAria: 'Result placeholder',
      placeholderTitle: 'See your estimated value',
      placeholderCopy: 'Your result appears here after you finish the configuration and run the valuation.',
      errorAria: 'Valuation error',
      errorTitle: 'Unable to estimate right now',
      statusNote: 'Try a slightly broader setup (variant, age, or tax type) and run again.',
      comparableCarsAria: 'Comparable cars',
      comparablesHeading: 'Based on closest auction sales',
      comparableLabel: 'Comparable {index}',
      loadingAria: 'Valuation loading state',
      loadingTitle: 'Calculating estimate',
      loadingCopy: 'Matching your car against recent Tesla auction sales...',
      finalAria: 'Valuation result',
      finalTitle: 'Your estimated market price',
      cohort: '{count} in cohort',
      editConfiguration: 'Edit configuration',
      unknownSaleDate: 'Unknown sale date',
      sameAgeAtSale: 'Same age at sale',
      olderAtSale: '{amount} {unit} older at sale',
      newerAtSale: '{amount} {unit} newer at sale',
      sameMileageAtSale: 'Same mileage at sale',
      moreMileageAtSale: '{amount} km more at sale',
      lessMileageAtSale: '{amount} km less at sale',
      monthSingular: 'month',
      monthPlural: 'months',
      fetchError: 'Failed to fetch valuation data. Please try again later.'
    },
    choices: {
      model: {
        model_3: 'Model 3',
        model_3_highland: 'Model 3 Highland',
        model_y: 'Model Y'
      },
      variant: {
        sr: 'Standard Range',
        lr: 'Long Range',
        p: 'Performance'
      },
      autopilot: {
        Standard: 'Standard',
        EAP: 'EAP',
        FSD: 'FSD'
      },
      tire: {
        '4_summer': 'Summer',
        '4_winter': 'Winter',
        '4_all_season': 'All-season',
        '8_tires': '8 tires'
      },
      tax: {
        margin: 'Private / Margin',
        vat: 'Company / VAT'
      }
    },
    months: {
      '01': 'January',
      '02': 'February',
      '03': 'March',
      '04': 'April',
      '05': 'May',
      '06': 'June',
      '07': 'July',
      '08': 'August',
      '09': 'September',
      '10': 'October',
      '11': 'November',
      '12': 'December'
    }
  },
  de: {
    language: {
      label: 'Sprache',
      names: {
        en: 'Englisch',
        de: 'Deutsch'
      }
    },
    step: {
      progress: 'Konfigurationsschritt {step} von {total}',
      label: 'Schritt {step}',
      selectModel: 'Modell auswählen',
      selectEquipment: 'Ausstattung auswählen'
    },
    form: {
      model: 'Modell',
      variant: 'Variante',
      firstRegistrationMonth: 'Erstzulassung Monat',
      firstRegistrationYear: 'Erstzulassung Jahr',
      mileage: 'Kilometerstand (km)',
      selectMonth: 'Monat wählen',
      selectYear: 'Jahr wählen',
      taxType: 'Steuerart',
      autopilot: 'Autopilot',
      tiresIncluded: 'Enthaltene Reifen',
      heatPump: 'Wärmepumpe',
      trailerHitch: 'Anhängerkupplung',
      continue: 'Weiter',
      back: 'Zurück',
      calculating: 'Berechnung...',
      showEstimatedPrice: 'Schätzpreis anzeigen',
      mileageHint: '{value}k km'
    },
    result: {
      label: 'Ergebnis',
      placeholderAria: 'Ergebnis Platzhalter',
      placeholderTitle: 'Geschätzten Wert anzeigen',
      placeholderCopy: 'Dein Ergebnis erscheint hier, sobald du die Konfiguration abschließt und die Bewertung startest.',
      errorAria: 'Bewertungsfehler',
      errorTitle: 'Bewertung aktuell nicht möglich',
      statusNote: 'Versuche eine etwas breitere Konfiguration (Variante, Alter oder Steuerart) und starte erneut.',
      comparableCarsAria: 'Vergleichsfahrzeuge',
      comparablesHeading: 'Basierend auf den nächsten Auktionsverkäufen',
      comparableLabel: 'Vergleich {index}',
      loadingAria: 'Bewertung wird geladen',
      loadingTitle: 'Schätzung wird berechnet',
      loadingCopy: 'Dein Fahrzeug wird mit aktuellen Tesla-Auktionsverkäufen abgeglichen...',
      finalAria: 'Bewertungsergebnis',
      finalTitle: 'Geschätzter Marktpreis',
      cohort: '{count} in Vergleichsgruppe',
      editConfiguration: 'Konfiguration bearbeiten',
      unknownSaleDate: 'Unbekanntes Verkaufsdatum',
      sameAgeAtSale: 'Gleiches Alter beim Verkauf',
      olderAtSale: '{amount} {unit} älter beim Verkauf',
      newerAtSale: '{amount} {unit} jünger beim Verkauf',
      sameMileageAtSale: 'Gleicher Kilometerstand beim Verkauf',
      moreMileageAtSale: '{amount} km mehr beim Verkauf',
      lessMileageAtSale: '{amount} km weniger beim Verkauf',
      monthSingular: 'Monat',
      monthPlural: 'Monate',
      fetchError: 'Bewertungsdaten konnten nicht geladen werden. Bitte später erneut versuchen.'
    },
    choices: {
      model: {
        model_3: 'Model 3',
        model_3_highland: 'Model 3 Highland',
        model_y: 'Model Y'
      },
      variant: {
        sr: 'Standard Range',
        lr: 'Long Range',
        p: 'Performance'
      },
      autopilot: {
        Standard: 'Standard',
        EAP: 'EAP',
        FSD: 'FSD'
      },
      tire: {
        '4_summer': 'Sommer',
        '4_winter': 'Winter',
        '4_all_season': 'Ganzjahresreifen',
        '8_tires': '8 Reifen'
      },
      tax: {
        margin: 'Privatverkauf',
        vat: 'Firmenfahrzeug'
      }
    },
    months: {
      '01': 'Januar',
      '02': 'Februar',
      '03': 'März',
      '04': 'April',
      '05': 'Mai',
      '06': 'Juni',
      '07': 'Juli',
      '08': 'August',
      '09': 'September',
      '10': 'Oktober',
      '11': 'November',
      '12': 'Dezember'
    }
  }
}

const LOCALE_META = {
  en: { intlLocale: 'en-US' },
  de: { intlLocale: 'de-DE' }
}

export const FALLBACK_LOCALE = 'en'
export const DEFAULT_LOCALE = 'de'
export const SUPPORTED_LOCALES = Object.keys(MESSAGES)

function getNestedValue(object, path) {
  return path.split('.').reduce((current, segment) => {
    if (current && Object.prototype.hasOwnProperty.call(current, segment)) {
      return current[segment]
    }
    return undefined
  }, object)
}

function interpolate(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return String(values[key])
    }
    return `{${key}}`
  })
}

export function resolveLocale(locale) {
  if (!locale || typeof locale !== 'string') return DEFAULT_LOCALE

  const normalized = locale.toLowerCase().split('-')[0]
  return SUPPORTED_LOCALES.includes(normalized) ? normalized : DEFAULT_LOCALE
}

export function getIntlLocale(locale) {
  const resolved = resolveLocale(locale)
  return LOCALE_META[resolved]?.intlLocale || LOCALE_META[FALLBACK_LOCALE].intlLocale
}

export function createTranslator(locale) {
  const resolvedLocale = resolveLocale(locale)

  return (key, values = {}) => {
    const primary = getNestedValue(MESSAGES[resolvedLocale], key)
    const fallback = getNestedValue(MESSAGES[FALLBACK_LOCALE], key)
    const resolvedText = primary ?? fallback ?? key

    if (typeof resolvedText !== 'string') return key
    return interpolate(resolvedText, values)
  }
}

export function detectInitialLocale() {
  if (typeof window === 'undefined') return DEFAULT_LOCALE

  const queryLocale = new URLSearchParams(window.location.search).get('lang')

  let storedLocale = null
  try {
    storedLocale = window.localStorage.getItem('tesla-widget-locale')
  } catch {
    storedLocale = null
  }

  const documentLocale = document.documentElement.lang
  const browserLocale = window.navigator.languages?.[0] || window.navigator.language

  return resolveLocale(queryLocale || storedLocale || documentLocale || browserLocale)
}

/**
 * Agrobase V3 — Currency & Exchange Rate Module
 * MobiPay AgroSys Limited
 *
 * Public API:
 *   - Currency formatting:  formatMoney(), formatMoneyForTenant()
 *   - Currency validation:  isValidCurrency(), requireValidCurrency()
 *   - Currency resolution:  getTenantCurrency(), resolveCurrency(), currencyFromCountry()
 *   - Money arithmetic:     roundMoney(), addMoney(), subtractMoney(), multiplyMoney()
 *   - Currency conversion:  convertCurrency()
 *   - Exchange rates:       getExchangeRate(), upsertExchangeRate(), listExchangeRates(),
 *                           deleteExchangeRate(), expireExchangeRate()
 *   - External sync:        fetchExternalRates(), syncExternalRates()
 *   - UI helpers:           getSupportedCurrencies(), getCurrenciesForCountry()
 */

// Currency core
export {
  CURRENCIES,
  CURRENCY_SYMBOLS,
  COUNTRY_CURRENCY,
  VALID_CURRENCY_CODES,
  type CurrencyInfo,
  type CurrencyFormatStyle,
  isValidCurrency,
  requireValidCurrency,
  currencyFromCountry,
  formatMoney,
  formatMoneyForTenant,
  roundMoney,
  addMoney,
  subtractMoney,
  multiplyMoney,
  convertCurrency,
  getTenantCurrency,
  resolveCurrency,
  getSupportedCurrencies,
  getCurrenciesForCountry,
} from './engine'

// Exchange rates
export {
  getExchangeRate,
  upsertExchangeRate,
  listExchangeRates,
  deleteExchangeRate,
  expireExchangeRate,
  fetchExternalRates,
  syncExternalRates,
  type ExchangeRateInfo,
} from './exchange-rates'
import ExchangeRate from '../models/ExchangeRate.js';

/**
 * Exchange Rate Service
 * Handles FX rate fetching, caching, and conversion
 * Target: <50ms conversion latency
 */

// Supported currencies (20+)
export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'CNY', 'HKD',
  'SGD', 'SEK', 'NOK', 'DKK', 'KRW', 'INR', 'MXN', 'BRL', 'ZAR', 'AED',
  'SAR', 'THB', 'MYR', 'PHP', 'IDR', 'PLN', 'CZK', 'HUF', 'ILS', 'TRY'
];

// In-memory rate cache for fast access
const rateCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetch rates from external API
 */
export const fetchRatesFromAPI = async (baseCurrency = 'inr') => {
  const baseUrl = process.env.FX_API_BASE_URL || 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api';
  const date = 'latest';
  const apiVersion = 'v1';
  
  const url = `${baseUrl}@${date}/${apiVersion}/currencies/${baseCurrency.toLowerCase()}.json`;
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data = await response.json();
    const fetchDuration = Date.now() - startTime;
    
    return {
      success: true,
      rates: data[baseCurrency.toLowerCase()],
      date: data.date,
      fetchDuration,
      source: 'api'
    };
  } catch (error) {
    console.error('FX API fetch failed:', error.message);
    return {
      success: false,
      error: error.message,
      source: 'api'
    };
  }
};

/**
 * Get fallback rates from MongoDB cache
 */
export const getFallbackRates = async (baseCurrency) => {
  try {
    const rates = await ExchangeRate.find({
      baseCurrency: baseCurrency.toUpperCase(),
      status: 'active'
    })
      .sort({ fetchedAt: -1 })
      .limit(30)
      .lean();
    
    if (rates.length === 0) {
      return null;
    }
    
    // Convert to rate map
    const rateMap = {};
    for (const rate of rates) {
      if (!rateMap[rate.targetCurrency]) {
        rateMap[rate.targetCurrency] = rate.rate;
      }
    }
    
    return {
      success: true,
      rates: rateMap,
      source: 'fallback',
      fetchedAt: rates[0].fetchedAt
    };
  } catch (error) {
    console.error('Fallback rate fetch failed:', error.message);
    return null;
  }
};

/**
 * Store rates in MongoDB
 */
export const storeRates = async (baseCurrency, rates, source = 'api') => {
  const now = new Date();
  const batchId = `BATCH-${now.toISOString().replace(/[:.]/g, '-')}`;
  
  const operations = [];
  
  for (const [targetCurrency, rate] of Object.entries(rates)) {
    if (!SUPPORTED_CURRENCIES.includes(targetCurrency.toUpperCase())) continue;
    if (targetCurrency.toUpperCase() === baseCurrency.toUpperCase()) continue;
    
    operations.push({
      baseCurrency: baseCurrency.toUpperCase(),
      targetCurrency: targetCurrency.toUpperCase(),
      rate: parseFloat(rate),
      inverseRate: 1 / parseFloat(rate),
      fetchedAt: now,
      validFrom: now,
      validUntil: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      source,
      apiVersion: 'v1',
      status: 'active',
      metadata: {
        batchId
      }
    });
  }
  
  // Mark old rates as expired
  await ExchangeRate.updateMany(
    { baseCurrency: baseCurrency.toUpperCase(), status: 'active' },
    { status: 'expired' }
  );
  
  // Insert new rates
  if (operations.length > 0) {
    await ExchangeRate.insertMany(operations, { ordered: false });
  }
  
  // Update cache
  updateCache(baseCurrency.toUpperCase(), rates);
  
  return {
    stored: operations.length,
    batchId
  };
};

/**
 * Update in-memory cache
 */
const updateCache = (baseCurrency, rates) => {
  const cacheEntry = {
    rates,
    updatedAt: Date.now()
  };
  rateCache.set(baseCurrency.toUpperCase(), cacheEntry);
};

/**
 * Get rate from cache
 */
const getCachedRate = (baseCurrency, targetCurrency) => {
  const entry = rateCache.get(baseCurrency.toUpperCase());
  
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > CACHE_TTL) return null;
  
  const rate = entry.rates[targetCurrency.toLowerCase()];
  return rate ? { rate, source: 'cache' } : null;
};

/**
 * Get exchange rate between two currencies
 * Optimized for <50ms latency
 */
export const getExchangeRate = async (fromCurrency, toCurrency) => {
  const startTime = Date.now();
  
  fromCurrency = fromCurrency.toUpperCase();
  toCurrency = toCurrency.toUpperCase();
  
  // Same currency - no conversion needed
  if (fromCurrency === toCurrency) {
    return {
      rate: 1,
      inverseRate: 1,
      source: 'identity',
      latency: Date.now() - startTime
    };
  }
  
  // Try cache first (fastest)
  const cached = getCachedRate(fromCurrency, toCurrency);
  if (cached) {
    return {
      rate: cached.rate,
      inverseRate: 1 / cached.rate,
      source: 'cache',
      latency: Date.now() - startTime
    };
  }
  
  // Try inverse cache
  const inverseCached = getCachedRate(toCurrency, fromCurrency);
  if (inverseCached) {
    return {
      rate: 1 / inverseCached.rate,
      inverseRate: inverseCached.rate,
      source: 'cache-inverse',
      latency: Date.now() - startTime
    };
  }
  
  // Try MongoDB
  const dbRate = await ExchangeRate.getCurrentRate(fromCurrency, toCurrency);
  if (dbRate) {
    return {
      rate: dbRate.rate,
      inverseRate: dbRate.inverseRate,
      rateId: dbRate._id,
      version: dbRate.version,
      fetchedAt: dbRate.fetchedAt,
      source: 'database',
      latency: Date.now() - startTime
    };
  }
  
  // Try inverse from MongoDB
  const inverseDbRate = await ExchangeRate.getCurrentRate(toCurrency, fromCurrency);
  if (inverseDbRate) {
    return {
      rate: inverseDbRate.inverseRate,
      inverseRate: inverseDbRate.rate,
      rateId: inverseDbRate._id,
      version: inverseDbRate.version,
      fetchedAt: inverseDbRate.fetchedAt,
      source: 'database-inverse',
      latency: Date.now() - startTime
    };
  }
  
  // No rate available
  return null;
};

/**
 * Convert amount between currencies
 */
export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  const rateInfo = await getExchangeRate(fromCurrency, toCurrency);
  
  if (!rateInfo) {
    throw new Error(`Exchange rate not available for ${fromCurrency}/${toCurrency}`);
  }
  
  const convertedAmount = amount * rateInfo.rate;
  
  return {
    originalAmount: amount,
    originalCurrency: fromCurrency.toUpperCase(),
    convertedAmount: Math.round(convertedAmount * 100) / 100,
    targetCurrency: toCurrency.toUpperCase(),
    rate: rateInfo.rate,
    inverseRate: rateInfo.inverseRate,
    rateId: rateInfo.rateId,
    source: rateInfo.source,
    latency: rateInfo.latency,
    timestamp: new Date().toISOString()
  };
};

/**
 * Get all current rates for a base currency
 */
export const getAllRates = async (baseCurrency = 'INR') => {
  const rates = await ExchangeRate.find({
    baseCurrency: baseCurrency.toUpperCase(),
    status: 'active'
  })
    .sort({ targetCurrency: 1 })
    .lean();
  
  return {
    baseCurrency: baseCurrency.toUpperCase(),
    rates: rates.map(r => ({
      currency: r.targetCurrency,
      rate: r.rate,
      inverseRate: r.inverseRate,
      change: r.changePercent,
      updatedAt: r.fetchedAt
    })),
    count: rates.length,
    lastUpdated: rates[0]?.fetchedAt
  };
};

/**
 * Refresh all rates
 */
export const refreshAllRates = async () => {
  const results = [];
  const baseCurrencies = ['INR', 'USD', 'EUR', 'GBP'];
  
  for (const base of baseCurrencies) {
    const apiResult = await fetchRatesFromAPI(base);
    
    if (apiResult.success) {
      const storeResult = await storeRates(base, apiResult.rates, 'api');
      results.push({
        base,
        success: true,
        stored: storeResult.stored,
        fetchDuration: apiResult.fetchDuration
      });
    } else {
      // Try fallback
      const fallback = await getFallbackRates(base);
      results.push({
        base,
        success: false,
        error: apiResult.error,
        fallbackAvailable: !!fallback
      });
    }
  }
  
  return results;
};

export default {
  SUPPORTED_CURRENCIES,
  fetchRatesFromAPI,
  getFallbackRates,
  storeRates,
  getExchangeRate,
  convertCurrency,
  getAllRates,
  refreshAllRates
};

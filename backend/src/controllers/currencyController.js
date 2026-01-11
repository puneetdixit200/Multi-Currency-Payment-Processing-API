import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import * as ExchangeRateService from '../services/ExchangeRateService.js';

// GET /api/v1/currencies
export const listCurrencies = asyncHandler(async (req, res) => {
  res.json({
    currencies: ExchangeRateService.SUPPORTED_CURRENCIES,
    count: ExchangeRateService.SUPPORTED_CURRENCIES.length
  });
});

// GET /api/v1/currencies/rates
export const getCurrentRates = asyncHandler(async (req, res) => {
  const baseCurrency = req.query.base || 'USD';
  const result = await ExchangeRateService.getAllRates(baseCurrency);
  res.json(result);
});

// POST /api/v1/currencies/convert
export const convertAmount = asyncHandler(async (req, res) => {
  const { amount, from, to } = req.body;
  
  if (!amount || !from || !to) {
    throw new ValidationError('amount, from, and to currencies are required');
  }
  
  const result = await ExchangeRateService.convertCurrency(
    parseFloat(amount),
    from,
    to
  );
  
  res.json(result);
});

// GET /api/v1/currencies/rates/history
export const getRateHistory = asyncHandler(async (req, res) => {
  const { from, to, days } = req.query;
  
  if (!from || !to) {
    throw new ValidationError('from and to currencies are required');
  }
  
  const ExchangeRate = (await import('../models/ExchangeRate.js')).default;
  const history = await ExchangeRate.getRateHistory(from, to, parseInt(days) || 30);
  
  res.json({
    baseCurrency: from.toUpperCase(),
    targetCurrency: to.toUpperCase(),
    history: history.map(r => ({
      rate: r.rate,
      change: r.changePercent,
      date: r.fetchedAt
    }))
  });
});

// POST /api/v1/currencies/rates/refresh (Admin only)
export const refreshRates = asyncHandler(async (req, res) => {
  const results = await ExchangeRateService.refreshAllRates();
  res.json({ message: 'Rates refreshed', results });
});

export default { listCurrencies, getCurrentRates, convertAmount, getRateHistory, refreshRates };

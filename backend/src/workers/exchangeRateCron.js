import cron from 'node-cron';
import { refreshAllRates } from '../services/ExchangeRateService.js';

let isRunning = false;

export const startExchangeRateCron = () => {
  const interval = parseInt(process.env.FX_FETCH_INTERVAL_HOURS) || 1;
  
  // Run immediately on startup
  setTimeout(async () => {
    try {
      console.log('🔄 Running initial exchange rate fetch...');
      const results = await refreshAllRates();
      console.log('✅ Initial exchange rates loaded:', results.map(r => `${r.base}: ${r.stored || 'failed'}`).join(', '));
    } catch (error) {
      console.error('❌ Initial rate fetch failed:', error.message);
    }
  }, 5000);
  
  // Schedule periodic updates
  const cronExpression = `0 */${interval} * * *`; // Every X hours
  
  cron.schedule(cronExpression, async () => {
    if (isRunning) {
      console.log('⏳ Rate fetch already in progress, skipping...');
      return;
    }
    
    isRunning = true;
    console.log(`🔄 Fetching exchange rates (every ${interval}h)...`);
    
    try {
      const results = await refreshAllRates();
      console.log('✅ Exchange rates updated:', results.map(r => `${r.base}: ${r.stored || 'failed'}`).join(', '));
    } catch (error) {
      console.error('❌ Rate fetch failed:', error.message);
    } finally {
      isRunning = false;
    }
  });
  
  console.log(`📅 Exchange rate cron scheduled: every ${interval} hour(s)`);
};

export default { startExchangeRateCron };

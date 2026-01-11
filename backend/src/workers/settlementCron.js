import cron from 'node-cron';
import { runDailySettlementBatch } from '../services/SettlementService.js';

let isRunning = false;

export const startSettlementCron = () => {
  // Run daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    if (isRunning) {
      console.log('⏳ Settlement batch already in progress, skipping...');
      return;
    }
    
    isRunning = true;
    console.log('🔄 Running daily settlement batch...');
    
    try {
      const results = await runDailySettlementBatch();
      const successful = results.filter(r => r.success).length;
      console.log(`✅ Settlement batch completed: ${successful}/${results.length} merchants processed`);
    } catch (error) {
      console.error('❌ Settlement batch failed:', error.message);
    } finally {
      isRunning = false;
    }
  });
  
  console.log('📅 Settlement cron scheduled: daily at 2:00 AM');
};

export default { startSettlementCron };

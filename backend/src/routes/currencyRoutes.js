import express from 'express';
import * as currencyController from '../controllers/currencyController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { adminOnly } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', currencyController.listCurrencies);
router.get('/rates', optionalAuth, currencyController.getCurrentRates);
router.get('/rates/history', optionalAuth, currencyController.getRateHistory);
router.post('/convert', optionalAuth, currencyController.convertAmount);
router.post('/rates/refresh', authenticate, adminOnly, currencyController.refreshRates);

export default router;

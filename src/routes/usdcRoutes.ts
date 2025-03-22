import express from 'express';
import { conversionController, getUsdcBalance } from '../controllers/usdcController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Public route (or protect if sensitive)
router.get('/conversion', conversionController); // Matches /api/usdc/conversion
// Protected route (requires token to check balances)
router.get('/balance/:address', authenticateToken, getUsdcBalance); // Matches /api/usdc/balance/:address

export default router;
import { Router } from 'express';
import { mpesaDeposit, mpesaWithdraw, mpesaB2CWebhook, mpesaQueueWebhook, mpesaSTKPushWebhook } from '../controllers/mpesaController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Protected routes (require authentication)
router.post('/deposit', authenticateToken, mpesaDeposit);   // Matches /api/mpesa/deposit
router.post('/withdraw', authenticateToken, mpesaWithdraw); // Matches /api/mpesa/withdraw

// Public webhook routes (called by Safaricom)
router.post('/stk-webhook', mpesaSTKPushWebhook);           // Matches /api/mpesa/stk-webhook
router.post('/b2c-webhook', mpesaB2CWebhook);               // Matches /api/mpesa/b2c-webhook
router.post('/queue-webhook', mpesaQueueWebhook);           // Matches /api/mpesa/queue-webhook

export default router;
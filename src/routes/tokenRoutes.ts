import express from 'express';
import { send, pay, tokenTransferEvents, unify, getWallet } from '../controllers/tokenController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Protected routes (require authentication)
router.post('/send', authenticateToken, send);               // Matches /api/token/send
router.post('/pay', authenticateToken, pay);                 // Matches /api/token/pay
router.get('/events', authenticateToken, tokenTransferEvents); // Matches /api/token/events
router.post('/unify', authenticateToken, unify);             // Matches /api/token/unify
router.get('/wallet', authenticateToken, getWallet);         // Matches /api/token/wallet

export default router;
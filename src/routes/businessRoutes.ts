import { Router } from 'express';
import {
  requestBusinessCreation,
  completeBusinessCreation,
  transferFundsToPersonal,
  payBusiness,
} from '../controllers/businessController';
import { authenticateToken } from '../middleware/authMiddleware';

const router: Router = Router();

// Protected routes (require authentication)
router.post('/request-creation', authenticateToken, requestBusinessCreation); // Matches /api/business/request-creation
router.post('/complete-creation', authenticateToken, completeBusinessCreation); // Matches /api/business/complete-creation
router.post('/transfer-to-personal', authenticateToken, transferFundsToPersonal); // Matches /api/business/transfer-to-personal
router.post('/pay', authenticateToken, payBusiness); // New route for paying businesses: /api/business/pay

export default router;
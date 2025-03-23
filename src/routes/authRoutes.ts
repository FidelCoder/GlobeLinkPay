import { Router } from 'express';
import { 
  initiateRegisterUser, 
  registerUser, 
  loginUser, 
  requestPasswordReset, 
  resetPassword, 
  transferFunds, 
  getBalance, 
  transferCrossChain 
} from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Public routes (no authentication required)
router.post('/initiate-register', initiateRegisterUser);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);

// Protected routes (require authentication)
router.post('/transfer', authenticateToken, transferFunds);
router.post('/balance', authenticateToken, getBalance); // New route for getting balance
router.post('/transfer-crosschain', authenticateToken, transferCrossChain); // New route for cross-chain transfers

export default router;
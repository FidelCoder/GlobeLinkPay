import { Router } from 'express';
import { initiateRegisterUser, registerUser, loginUser, requestPasswordReset, resetPassword, transferFunds } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/initiate-register', initiateRegisterUser);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/transfer', authenticateToken, transferFunds); // New route for fund transfers

export default router;
import express from 'express';
import { requestPasswordReset, resetPassword, loginUser, registerUser, initiateRegisterUser } from '../controllers/authController';

const router = express.Router();

// Public routes (no authentication required)
router.post('/initiate-register', initiateRegisterUser); // Matches /api/auth/initiate-register
router.post('/register', registerUser);                  // Matches /api/auth/register
router.post('/login', loginUser);                        // Matches /api/auth/login
router.post('/request-password-reset', requestPasswordReset); // Matches /api/auth/request-password-reset
router.post('/reset-password', resetPassword);           // Matches /api/auth/reset-password

export default router;
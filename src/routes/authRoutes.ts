import { Router } from 'express';
import { initiateRegisterUser, registerUser, loginUser, requestPasswordReset, resetPassword } from '../controllers/authController';

const router = Router();

router.post('/initiate-register', initiateRegisterUser);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);

export default router;
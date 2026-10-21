import express from 'express';
import {
  getCurrentUser,
  registerUser,
  loginUser,
  forgotPassword,
  validateResetToken,
  resetPassword,
  getEmailStatus,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getCurrentUser);
router.post('/logout', (req, res) => res.status(200).json({ message: 'Logged out successfully.' }));
router.get('/email-service-status', getEmailStatus);
router.post('/forgot-password', forgotPassword);
router.get('/reset-password/validate/:token', validateResetToken);
router.post('/reset-password/:token', resetPassword);

export default router;

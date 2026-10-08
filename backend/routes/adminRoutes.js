import express from 'express';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';
import {
  getAdminStats,
  getAdminProperties,
  hideProperty,
  restoreProperty,
  getAdminUsers,
  toggleBlockUser,
} from '../controllers/adminController.js';

const router = express.Router();

// Strict authorization: every admin route requires authentication AND role === 'admin'
router.use(protect, requireAdmin);

router.get('/stats', getAdminStats);
router.get('/properties', getAdminProperties);
router.put('/properties/:id/hide', hideProperty);
router.put('/properties/:id/restore', restoreProperty);
router.get('/users', getAdminUsers);
router.put('/users/:id/toggle-block', toggleBlockUser);

export default router;

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createOrGetConversation,
  getConversations,
  getUnreadCount,
  getConversationById,
  getMessages,
  sendMessage,
  exportConversation,
} from '../controllers/chatController.js';

const router = express.Router();

// All chat routes require authentication
router.use(protect);

router.get('/unread-count', getUnreadCount);
router.post('/conversations', createOrGetConversation);
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversationById);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);
router.get('/conversations/:id/export', exportConversation);

export default router;

import express from 'express';
import bcrypt from 'bcryptjs';
import { protect } from '../middleware/authMiddleware.js';
import User from '../models/User.js';

const router = express.Router();

router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -passwordHash');
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/profile', protect, async (req, res) => {
  try {
    const allowedFields = ['name', 'phone', 'address', 'city', 'state', 'country', 'about', 'profileImage'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowedFields.includes(key)));
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password -passwordHash');
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+passwordHash +password');
    const storedHash = user?.passwordHash || user?.password;
    if (!user || !storedHash || !(await bcrypt.compare(currentPassword, storedHash))) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.password = undefined;
    await user.save();
    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

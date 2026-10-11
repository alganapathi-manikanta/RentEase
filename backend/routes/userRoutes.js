import express from 'express';
import bcrypt from 'bcryptjs';
import { protect } from '../middleware/authMiddleware.js';
import User from '../models/User.js';

const router = express.Router();

router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.status(200).json({ ...user.toObject(), id: user._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/profile', protect, async (req, res) => {
  try {
    const allowedFields = ['name', 'phone', 'address', 'city', 'state', 'country', 'about', 'profileImage', 'preferences'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowedFields.includes(key)));

    if (updates.name !== undefined) {
      updates.name = String(updates.name).trim();
      if (!updates.name) {
        return res.status(400).json({ success: false, message: 'Full name cannot be empty.' });
      }
    }

    if (updates.phone !== undefined) {
      updates.phone = String(updates.phone).trim();
      if (!updates.phone) {
        return res.status(400).json({ success: false, message: 'Phone number cannot be empty.' });
      }
    }

    if (updates.preferences !== undefined) {
      if (typeof updates.preferences !== 'object' || updates.preferences === null) {
        return res.status(400).json({ success: false, message: 'Invalid preferences payload.' });
      }
      const existingUser = await User.findById(req.user._id).select('preferences');
      const currentPrefs = existingUser?.preferences || {};
      const validPrefKeys = ['propertyUpdates', 'inquiries', 'wishlistAlerts', 'accountSecurity', 'marketingUpdates'];
      const mergedPrefs = { ...currentPrefs };
      for (const key of validPrefKeys) {
        if (typeof updates.preferences[key] === 'boolean') {
          mergedPrefs[key] = updates.preferences[key];
        }
      }
      updates.preferences = mergedPrefs;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password -passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.status(200).json({ ...user.toObject(), id: user._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current password and new password are required.' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    const user = await User.findById(req.user._id).select('+passwordHash +password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const storedHash = user.passwordHash || user.password;
    if (!storedHash || !(await bcrypt.compare(currentPassword, storedHash))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const isSame = await bcrypt.compare(newPassword, storedHash);
    if (isSame) {
      return res.status(400).json({ success: false, message: 'New password must be different from your current password.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.password = undefined;
    await user.save();
    res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

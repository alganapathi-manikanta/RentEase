import express from 'express';
import mongoose from 'mongoose';
import Property from '../models/Property.js';
import User from '../models/User.js';
import Wishlist from '../models/Wishlist.js';
import { authorize, protect } from '../middleware/authMiddleware.js';

const router = express.Router();
const availablePropertyFilter = {
  isPublished: { $ne: false },
  listingStatus: { $nin: ['inactive', 'draft'] },
};

router.use(protect, authorize('tenant'));

const saveWishlistEntry = async (tenantId, propertyId) => {
  try {
    await Wishlist.updateOne(
      { tenant: tenantId, property: propertyId },
      { $setOnInsert: { tenant: tenantId, property: propertyId } },
      { upsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
};

const migrateLegacyFavorites = async (tenantId) => {
  const user = await User.findById(tenantId).select('favoriteProperties');
  const legacyIds = user?.favoriteProperties || [];
  if (!legacyIds.length) return;

  for (const propertyId of legacyIds) {
    await saveWishlistEntry(tenantId, propertyId);
  }
  await User.updateOne({ _id: tenantId }, { $pullAll: { favoriteProperties: legacyIds } });
};

router.get('/', async (req, res, next) => {
  try {
    await migrateLegacyFavorites(req.user._id);
    const entries = await Wishlist.find({ tenant: req.user._id }).populate({
      path: 'property',
      match: availablePropertyFilter,
    });
    res.status(200).json({ success: true, data: entries.map((entry) => entry.property).filter(Boolean) });
  } catch (error) {
    next(error);
  }
});

router.post('/:propertyId', async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({ success: false, message: 'Invalid property ID.' });
    }
    const property = await Property.findOne({ _id: propertyId, ...availablePropertyFilter });
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    await saveWishlistEntry(req.user._id, property._id);
    res.status(200).json({ success: true, data: { propertyId: property._id, saved: true } });
  } catch (error) {
    next(error);
  }
});

router.delete('/:propertyId', async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({ success: false, message: 'Invalid property ID.' });
    }

    await Promise.all([
      Wishlist.deleteOne({ tenant: req.user._id, property: propertyId }),
      User.updateOne({ _id: req.user._id }, { $pull: { favoriteProperties: propertyId } }),
    ]);
    res.status(200).json({ success: true, data: { propertyId, saved: false } });
  } catch (error) {
    next(error);
  }
});

export default router;

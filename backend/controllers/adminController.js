import mongoose from 'mongoose';
import Property from '../models/Property.js';
import User from '../models/User.js';

const invalidId = (id) => !mongoose.Types.ObjectId.isValid(id);

export const getAdminStats = async (req, res) => {
  try {
    const [
      totalProperties,
      activeProperties,
      hiddenProperties,
      totalUsers,
      totalTenants,
      totalLandlords,
      totalAdmins,
      blockedUsers,
    ] = await Promise.all([
      Property.countDocuments({}),
      Property.countDocuments({ isActive: { $ne: false }, listingStatus: { $ne: 'inactive' } }),
      Property.countDocuments({ $or: [{ isActive: false }, { listingStatus: 'inactive' }] }),
      User.countDocuments({}),
      User.countDocuments({ role: 'tenant' }),
      User.countDocuments({ role: 'landlord' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ isBlocked: true }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalProperties,
        activeProperties,
        hiddenProperties,
        totalUsers,
        totalTenants,
        totalLandlords,
        totalAdmins,
        blockedUsers,
      },
    });
  } catch (error) {
    console.error('[ADMIN STATS ERROR]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminProperties = async (req, res) => {
  try {
    const { status = 'all', search = '' } = req.query;

    const filter = {};

    if (status === 'active') {
      filter.isActive = { $ne: false };
      filter.listingStatus = { $ne: 'inactive' };
    } else if (status === 'hidden') {
      filter.$or = [{ isActive: false }, { listingStatus: 'inactive' }];
    }

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      filter.$or = filter.$or
        ? [{ $and: [{ $or: filter.$or }, { $or: [{ title: regex }, { city: regex }, { area: regex }, { ownerName: regex }, { ownerPhone: regex }] }] }]
        : [{ title: regex }, { city: regex }, { area: regex }, { ownerName: regex }, { ownerPhone: regex }];
    }

    const properties = await Property.find(filter)
      .populate('ownerId', 'name email phone')
      .sort({ createdAt: -1 });

    const formatted = properties.map((p) => {
      const doc = p.toObject();
      const ownerUser = doc.ownerId && typeof doc.ownerId === 'object' ? doc.ownerId : null;
      return {
        ...doc,
        id: doc._id,
        isActive: doc.isActive !== false && doc.listingStatus !== 'inactive',
        ownerName: (ownerUser && ownerUser.name) || doc.ownerName || '',
        ownerPhone: (ownerUser && ownerUser.phone) || doc.ownerPhone || '',
        landlord: ownerUser
          ? {
              id: ownerUser._id,
              name: ownerUser.name,
              email: ownerUser.email,
              phone: ownerUser.phone,
            }
          : null,
      };
    });

    res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    console.error('[ADMIN PROPERTIES ERROR]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const hideProperty = async (req, res) => {
  try {
    const { id } = req.params;
    if (invalidId(id)) return res.status(400).json({ success: false, message: 'Invalid property ID.' });

    const property = await Property.findById(id).populate('ownerId', 'name email phone');
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    property.isActive = false;
    property.listingStatus = 'inactive';
    await property.save();

    res.status(200).json({
      success: true,
      message: `Property "${property.title}" has been hidden from the public website.`,
      data: property,
    });
  } catch (error) {
    console.error('[ADMIN HIDE PROPERTY ERROR]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const restoreProperty = async (req, res) => {
  try {
    const { id } = req.params;
    if (invalidId(id)) return res.status(400).json({ success: false, message: 'Invalid property ID.' });

    const property = await Property.findById(id).populate('ownerId', 'name email phone');
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    property.isActive = true;
    property.listingStatus = 'active';
    await property.save();

    res.status(200).json({
      success: true,
      message: `Property "${property.title}" has been restored and is now visible to the public.`,
      data: property,
    });
  } catch (error) {
    console.error('[ADMIN RESTORE PROPERTY ERROR]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminUsers = async (req, res) => {
  try {
    const { role = 'all', search = '' } = req.query;

    const filter = {};
    if (role !== 'all') {
      filter.role = role;
    }

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [{ name: regex }, { email: regex }, { phone: regex }, { city: regex }];
    }

    const users = await User.find(filter)
      .select('_id name email phone role city state country address isBlocked createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('[ADMIN USERS ERROR]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (invalidId(id)) return res.status(400).json({ success: false, message: 'Invalid user ID.' });

    if (req.user._id.toString() === id) {
      return res.status(400).json({ success: false, message: 'You cannot block your own admin account.' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (targetUser.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot block administrative accounts.' });
    }

    targetUser.isBlocked = !targetUser.isBlocked;
    await targetUser.save();

    const statusAction = targetUser.isBlocked ? 'suspended' : 'reactivated';
    res.status(200).json({
      success: true,
      message: `User account "${targetUser.name}" (${targetUser.email}) has been ${statusAction}.`,
      data: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        phone: targetUser.phone,
        role: targetUser.role,
        isBlocked: targetUser.isBlocked,
      },
    });
  } catch (error) {
    console.error('[ADMIN TOGGLE BLOCK ERROR]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

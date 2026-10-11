import Property from '../models/Property.js';
import mongoose from 'mongoose';
import { normalizeMediaUrl } from '../utils/media.js';

const normalizePhotos = (photos) => {
  if (!Array.isArray(photos)) return [];
  return photos
    .map((photo) => {
      if (typeof photo === 'string') return normalizeMediaUrl(photo);
      if (photo && typeof photo === 'object' && typeof photo.url === 'string') return normalizeMediaUrl(photo.url);
      return '';
    })
    .filter(Boolean);
};

const normalizeProperty = (data) => {
  const listingType = data.listingType || ({ rent: 'Rent', sale: 'Sale', both: 'Both' }[data.transactionType] || 'Rent');
  const type = data.type || ({ flat: 'Flat', house: 'House', land: 'Land' }[data.propertyType] || 'House');
  const transactionType = data.transactionType || listingType.toLowerCase();
  const squareFeet = Number(data.squareFeet ?? data.sqft ?? 0);
  const rooms = Array.isArray(data.rooms) ? data.rooms.map((room, idx) => {
    const length = Number(room.length ?? room.lFt) || 0;
    const width = Number(room.width ?? room.wFt) || 0;
    const height = Number(room.height ?? room.hFt) || 0;
    const area = Number(room.area) || (length * width);
    return {
      ...room,
      id: room.id || `room-${idx}`,
      name: (room.name || `Room ${idx + 1}`).trim(),
      type: room.type || (String(room.name || '').toLowerCase().includes('bed') ? 'bedroom' : 'other'),
      length,
      width,
      height,
      area,
      count: Math.max(1, Number(room.count) || 1),
      description: room.description || '',
      photos: normalizePhotos(room.photos),
      unit: room.unit || 'ft',
      floorNumber: Number(room.floorNumber) || 0,
      position: room.position || { x: Number(room.x) || 0, y: 0, z: Number(room.z) || 0 },
    };
  }) : [];

  let threeDConfig = data.threeDConfig;
  if (threeDConfig && Array.isArray(threeDConfig.floors)) {
    threeDConfig = {
      ...threeDConfig,
      floors: threeDConfig.floors.map((floor, fIdx) => ({
        floorNumber: Number(floor.floorNumber) || fIdx,
        rooms: Array.isArray(floor.rooms)
          ? floor.rooms.map((room, rIdx) => {
              const length = Number(room.length ?? room.lFt) || 12;
              const width = Number(room.width ?? room.wFt) || 10;
              const height = Number(room.height ?? room.hFt) || 0;
              const area = Number(room.area) || (length * width);
              return {
                ...room,
                id: room.id || `room-${fIdx}-${rIdx}`,
                name: (room.name || `Room ${rIdx + 1}`).trim(),
                type: room.type || 'other',
                length,
                width,
                height,
                area,
                count: Math.max(1, Number(room.count) || 1),
                description: room.description || '',
                photos: normalizePhotos(room.photos),
                unit: room.unit || 'ft',
                floorNumber: Number(floor.floorNumber) || fIdx,
                position: room.position || { x: Number(room.x) || 0, y: 0, z: Number(room.z) || 0 },
                lFt: Number(room.lFt ?? length) || 12,
                wFt: Number(room.wFt ?? width) || 10,
                hFt: Number(room.hFt ?? height) || 9,
              };
            })
          : [],
      })),
    };
  }

  const isLand = String(data.type || data.propertyType || '').toLowerCase().includes('land') ||
    String(data.type || data.propertyType || '').toLowerCase().includes('plot');
  const isSaleOnly = transactionType === 'sale';
  const isRentOnly = transactionType === 'rent';
  const isBoth = transactionType === 'both';

  const validBillModes = ['Included in Rent', 'Paid Separately', 'Fixed Monthly Amount', 'As per usage'];
  
  let electricityBill;
  let monthlyElectricityCharge = 0;
  let waterCharges;
  let monthlyWaterCharge = 0;

  if (isLand && isSaleOnly) {
    electricityBill = undefined;
    monthlyElectricityCharge = undefined;
    waterCharges = undefined;
    monthlyWaterCharge = undefined;
  } else if (isSaleOnly) {
    // FOR SALE: NEVER 'Included in Rent'
    const rawElec = data.electricityBill || data.rentDetails?.electricityBill;
    if (rawElec && rawElec !== 'Included in Rent' && validBillModes.includes(rawElec)) {
      electricityBill = rawElec;
      monthlyElectricityCharge = Math.max(0, Number(data.monthlyElectricityCharge ?? data.rentDetails?.monthlyElectricityCharge) || 0);
    } else {
      electricityBill = 'As per usage';
      monthlyElectricityCharge = 0;
    }

    const rawWater = data.waterCharges || data.rentDetails?.waterCharges;
    if (rawWater && rawWater !== 'Included in Rent' && validBillModes.includes(rawWater)) {
      waterCharges = rawWater;
      monthlyWaterCharge = Math.max(0, Number(data.monthlyWaterCharge ?? data.rentDetails?.monthlyWaterCharge) || 0);
    } else {
      waterCharges = 'As per usage';
      monthlyWaterCharge = 0;
    }
  } else {
    // FOR RENT OR BOTH
    electricityBill = validBillModes.includes(data.electricityBill)
      ? data.electricityBill
      : (validBillModes.includes(data.rentDetails?.electricityBill) ? data.rentDetails.electricityBill : 'Included in Rent');
    monthlyElectricityCharge = Math.max(0, Number(data.monthlyElectricityCharge ?? data.rentDetails?.monthlyElectricityCharge) || 0);

    waterCharges = validBillModes.includes(data.waterCharges)
      ? data.waterCharges
      : (validBillModes.includes(data.rentDetails?.waterCharges) ? data.rentDetails.waterCharges : 'Included in Rent');
    monthlyWaterCharge = Math.max(0, Number(data.monthlyWaterCharge ?? data.rentDetails?.monthlyWaterCharge) || 0);
  }

  let rentDetails = undefined;
  let saleDetails = undefined;
  let price = Number(data.price) || 0;

  if (isSaleOnly) {
    const salePrice = Number(data.saleDetails?.salePrice || data.price || 0);
    price = salePrice;
    saleDetails = {
      ...(data.saleDetails || {}),
      salePrice,
    };
    rentDetails = undefined;
  } else if (isRentOnly) {
    const monthlyRent = Number(data.rentDetails?.monthlyRent || data.price || 0);
    price = monthlyRent;
    rentDetails = {
      ...(data.rentDetails || {}),
      monthlyRent,
      electricityBill,
      monthlyElectricityCharge,
      waterCharges,
      monthlyWaterCharge,
    };
    saleDetails = undefined;
  } else if (isBoth) {
    const salePrice = Number(data.saleDetails?.salePrice || data.price || 0);
    const monthlyRent = Number(data.rentDetails?.monthlyRent || 0);
    price = salePrice || monthlyRent;
    saleDetails = {
      ...(data.saleDetails || {}),
      salePrice,
    };
    rentDetails = {
      ...(data.rentDetails || {}),
      monthlyRent,
      electricityBill,
      monthlyElectricityCharge,
      waterCharges,
      monthlyWaterCharge,
    };
  }

  let floorPlan = null;
  if (data.floorPlan) {
    if (typeof data.floorPlan === 'string' && data.floorPlan.trim()) {
      floorPlan = {
        url: normalizeMediaUrl(data.floorPlan),
        name: data.floorPlan.split('/').pop() || 'Floor Plan',
        type: data.floorPlan.endsWith('.pdf') ? 'application/pdf' : 'image/png',
        size: 0,
        layout: null,
      };
    } else if (typeof data.floorPlan === 'object' && data.floorPlan.url) {
      floorPlan = {
        ...data.floorPlan,
        url: normalizeMediaUrl(String(data.floorPlan.url)),
        name: String(data.floorPlan.name || data.floorPlan.url.split('/').pop() || 'Floor Plan').trim(),
        type: String(data.floorPlan.type || '').trim(),
        size: Number(data.floorPlan.size) || 0,
        aspectRatio: Number(data.floorPlan.aspectRatio) || 1.25,
        status: data.floorPlan.status || (data.floorPlan.layout ? 'processed' : 'none'),
        error: data.floorPlan.error || '',
        layout: data.floorPlan.layout || null,
        roomPlacements: Array.isArray(data.floorPlan.roomPlacements) ? data.floorPlan.roomPlacements : [],
        processedAt: data.floorPlan.processedAt || new Date(),
      };
    }
  }

  const canonicalLayout = data.canonicalLayout || data.floorPlan?.layout || (threeDConfig && threeDConfig.canonicalLayout) || null;

  const ownerUser = data.ownerId && typeof data.ownerId === 'object' ? data.ownerId : null;
  const ownerPhone = (ownerUser && ownerUser.phone) || data.ownerPhone || '';
  const ownerName = (ownerUser && ownerUser.name) || data.ownerName || '';

  const normalized = {
    ...data,
    type,
    propertyType: data.propertyType || type.toLowerCase(),
    listingType,
    transactionType,
    sqft: squareFeet,
    squareFeet,
    location: data.location || data.area || data.address || '',
    status: isBoth ? 'Both' : (isSaleOnly ? 'Sale' : 'Rent'),
    price,
    saleDetails,
    rentDetails,
    listingStatus: data.listingStatus || 'active',
    isPublished: data.isPublished !== false,
    isActive: data.isActive !== false,
    ownerId: ownerUser ? ownerUser._id : data.ownerId,
    ownerName,
    ownerPhone,
    landlord: ownerUser ? {
      id: ownerUser._id,
      name: ownerUser.name,
      email: ownerUser.email,
      phone: ownerUser.phone,
    } : undefined,
    electricityBill,
    monthlyElectricityCharge,
    waterCharges,
    monthlyWaterCharge,
    rooms,
    photos: normalizePhotos(data.photos),
    videos: normalizePhotos(data.videos),
    floorPlan,
    canonicalLayout,
    ...(threeDConfig ? { threeDConfig: { ...threeDConfig, ...(canonicalLayout ? { canonicalLayout } : {}) } } : {}),
  };

  if (isLand && isSaleOnly) {
    delete normalized.electricityBill;
    delete normalized.waterCharges;
    delete normalized.monthlyElectricityCharge;
    delete normalized.monthlyWaterCharge;
    delete normalized.rentDetails;
  }

  return normalized;
};

const invalidId = (id) => !mongoose.Types.ObjectId.isValid(id);

export const getProperties = async (req, res) => {
  try {
    const { city, location, type, propertyType, status, transaction, minBudget, maxBudget, bedrooms, bathrooms } = req.query;

    const filter = {
      isActive: { $ne: false },
      isPublished: { $ne: false },
      listingStatus: { $nin: ['inactive', 'draft'] },
    };
    if (city) filter.city = { $regex: city, $options: 'i' };
    if (location) filter.$or = [{ city: { $regex: location, $options: 'i' } }, { area: { $regex: location, $options: 'i' } }, { address: { $regex: location, $options: 'i' } }];
    if (type) filter.type = type;
    if (propertyType) filter.propertyType = propertyType.toLowerCase();
    if (status) {
      const s = status.toLowerCase();
      if (s === 'rent') {
        filter.transactionType = { $in: ['rent', 'both'] };
      } else if (s === 'sale') {
        filter.transactionType = { $in: ['sale', 'both'] };
      } else {
        filter.status = status;
      }
    }
    if (transaction) {
      const t = transaction.toLowerCase();
      if (t === 'rent') {
        filter.transactionType = { $in: ['rent', 'both'] };
      } else if (t === 'sale') {
        filter.transactionType = { $in: ['sale', 'both'] };
      } else {
        filter.transactionType = t;
      }
    }
    if (minBudget || maxBudget) {
      filter.price = {};
      if (minBudget) filter.price.$gte = Number(minBudget);
      if (maxBudget) filter.price.$lte = Number(maxBudget);
    }
    if (bedrooms) filter.bedrooms = { $gte: Number(bedrooms) };
    if (bathrooms) filter.bathrooms = { $gte: Number(bathrooms) };

    const properties = await Property.find(filter)
      .select('-canonicalLayout -threeDConfig.canonicalLayout -floorPlan.layout -floorPlan.roomPlacements')
      .populate('ownerId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();
    const normalizedList = properties.map((doc) => normalizeProperty(doc));
    res.status(200).json({ success: true, data: normalizedList });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPropertyById = async (req, res) => {
  try {
    if (invalidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid property ID.' });
    const property = await Property.findOne({
      _id: req.params.id,
      isActive: { $ne: false },
      isPublished: { $ne: false },
      listingStatus: { $nin: ['inactive', 'draft'] },
    }).populate('ownerId', 'name email phone');

    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    res.status(200).json({ success: true, data: normalizeProperty(property.toObject()) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const incrementPropertyViews = async (req, res) => {
  try {
    if (invalidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid property ID.' });

    const property = await Property.findOneAndUpdate(
      {
        _id: req.params.id,
        isActive: { $ne: false },
        isPublished: { $ne: false },
        listingStatus: { $nin: ['inactive', 'draft'] },
      },
      { $inc: { views: 1 } },
      { new: true }
    ).populate('ownerId', 'name email phone');

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    res.status(200).json({ success: true, views: property.views, data: normalizeProperty(property.toObject()) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyProperties = async (req, res) => {
  try {
    const properties = await Property.find({ ownerId: req.user._id })
      .select('-canonicalLayout -threeDConfig.canonicalLayout -floorPlan.layout -floorPlan.roomPlacements')
      .populate('ownerId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();
    const normalizedList = properties.map((doc) => normalizeProperty(doc));
    res.status(200).json({ success: true, data: normalizedList });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createProperty = async (req, res) => {
  try {
    if (req.user?.role !== 'landlord') {
      return res.status(403).json({ success: false, message: 'Access denied. Only landlords can list properties.' });
    }

    const { ownerId, ownerName, ownerPhone, ...safePropertyData } = req.body;
    const propertyData = {
      ...normalizeProperty(safePropertyData),
      ownerId: req.user._id,
      ownerName: req.user.name,
      ownerPhone: req.user.phone,
      isActive: true,
    };

    const property = await Property.create(propertyData);
    res.status(201).json({ success: true, message: 'Property created successfully.', data: property, property });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProperty = async (req, res) => {
  try {
    if (invalidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid property ID.' });
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    if (property.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only update your own property.' });
    }

    const { ownerId, ownerName, ownerPhone, views, interested, _id, id, createdAt, updatedAt, ...safeUpdates } = req.body;
    
    // Normalize entire update payload to ensure consistent data structures
    const normalized = normalizeProperty({
      ...property.toObject(),
      ...safeUpdates,
      // If client explicitly passed floorPlan: null, preserve that intent
      floorPlan: safeUpdates.floorPlan === null ? null : (safeUpdates.floorPlan || property.floorPlan),
    });

    delete normalized.ownerId;
    delete normalized.ownerName;
    delete normalized.ownerPhone;
    delete normalized.views;
    delete normalized.interested;
    delete normalized._id;
    delete normalized.id;
    delete normalized.createdAt;
    delete normalized.updatedAt;

    Object.assign(property, normalized);
    if (safeUpdates.floorPlan === null) {
      property.floorPlan = null;
    }

    const updated = await property.save();

    res.status(200).json({ success: true, message: 'Property updated successfully.', data: updated, property: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProperty = async (req, res) => {
  try {
    if (invalidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid property ID.' });
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    if (property.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own property.' });
    }

    await property.deleteOne();
    res.status(200).json({ success: true, message: 'Property deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOwnedProperty = async (req, res) => {
  if (invalidId(req.params.id)) {
    res.status(400).json({ success: false, message: 'Invalid property ID.' });
    return null;
  }
  const property = await Property.findById(req.params.id);
  if (!property) {
    res.status(404).json({ message: 'Property not found.' });
    return null;
  }
  if (property.ownerId.toString() !== req.user._id.toString()) {
    res.status(403).json({ message: 'You can only update your own property.' });
    return null;
  }
  return property;
};

export const getProperty3D = async (req, res) => {
  try {
    if (invalidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid property ID.' });
    const property = await Property.findById(req.params.id).select('threeDConfig rooms squareFeet propertyType');
    if (!property) return res.status(404).json({ message: 'Property not found.' });
    res.status(200).json({ success: true, data: property.threeDConfig || { enabled: false, floors: [], rooms: property.rooms, squareFeet: property.squareFeet, propertyType: property.propertyType } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const saveProperty3D = async (req, res) => {
  try {
    const property = await getOwnedProperty(req, res);
    if (!property) return;
    property.threeDConfig = req.body;
    const updated = await property.save();
    res.status(200).json({ message: '3D configuration saved.', threeDConfig: updated.threeDConfig });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProperty3D = async (req, res) => {
  try {
    const property = await getOwnedProperty(req, res);
    if (!property) return;
    property.threeDConfig = { enabled: false, floors: [] };
    await property.save();
    res.status(200).json({ message: '3D configuration deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

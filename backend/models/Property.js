import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, default: 'other', trim: true },
    length: { type: Number, required: true, min: 0 },
    width: { type: Number, required: true, min: 0 },
    height: { type: Number, default: 0, min: 0 },
    area: { type: Number, default: 0, min: 0 },
    count: { type: Number, default: 1, min: 1 },
    description: { type: String, default: '' },
    photos: [{ type: String }],
    unit: { type: String, enum: ['ft', 'm'], default: 'ft' },
    floorNumber: { type: Number, default: 0 },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      z: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

const threeDConfigSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    unit: { type: String, enum: ['ft', 'm'], default: 'ft' },
    floors: [
      {
        floorNumber: { type: Number, default: 0 },
        rooms: [roomSchema],
      },
    ],
    wallThickness: { type: Number, default: 0.15, min: 0.05 },
    canonicalLayout: { type: mongoose.Schema.Types.Mixed, default: null },
    lastUpdated: { type: Date },
  },
  { _id: false, strict: false }
);

const floorPlanSchema = new mongoose.Schema(
  {
    url: { type: String, default: '' },
    name: { type: String, default: '' },
    type: { type: String, default: '' },
    size: { type: Number, default: 0 },
    aspectRatio: { type: Number, default: 1.25 },
    status: { type: String, enum: ['none', 'pending', 'processed', 'failed'], default: 'none' },
    error: { type: String, default: '' },
    layout: { type: mongoose.Schema.Types.Mixed, default: null },
    roomPlacements: [{ type: mongoose.Schema.Types.Mixed }],
    processedAt: { type: Date },
  },
  { _id: false, strict: false }
);

const propertySchema = new mongoose.Schema(
  {
    floorPlan: { type: floorPlanSchema, default: null },
    canonicalLayout: { type: mongoose.Schema.Types.Mixed, default: null },
    title: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ['House', 'Flat', 'Villa', 'Land', 'Commercial'] },
    propertyType: { type: String, enum: ['flat', 'house', 'land', 'villa', 'commercial'] },
    listingType: { type: String, enum: ['Rent', 'Sale', 'Both'], default: 'Rent' },
    transactionType: { type: String, enum: ['rent', 'sale', 'both'] },
    status: { type: String, required: true, enum: ['Rent', 'Sale', 'Both'] },
    price: { type: Number, required: true },
    city: { type: String, required: true, trim: true },
    location: { type: String, default: '', trim: true },
    state: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    bedrooms: { type: Number, default: 0 },
    bathrooms: { type: Number, default: 0 },
    kitchen: { type: Number, default: 0 },
    hall: { type: Number, default: 0 },
    parking: { type: Number, default: 0 },
    sqft: { type: Number, default: 0 },
    squareFeet: { type: Number, default: 0, min: 0 },
    floorNumber: { type: Number, default: 0 },
    totalFloors: { type: Number, default: 0 },
    numberOfFloors: { type: Number, default: 0 },
    furnished: { type: String, default: '' },
    balcony: { type: String, default: '' },
    garden: { type: String, default: '' },
    amenities: [{ type: String }],
    description: { type: String, default: '' },
    landDetails: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    rentDetails: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    electricityBill: {
      type: String,
      enum: ['Included in Rent', 'Paid Separately', 'Fixed Monthly Amount', 'As per usage'],
      default: function () {
        return (this.transactionType === 'sale' || this.status === 'Sale' || this.listingType === 'Sale')
          ? 'As per usage'
          : 'Included in Rent';
      },
    },
    monthlyElectricityCharge: { type: Number, default: 0, min: 0 },
    waterCharges: {
      type: String,
      enum: ['Included in Rent', 'Paid Separately', 'Fixed Monthly Amount', 'As per usage'],
      default: function () {
        return (this.transactionType === 'sale' || this.status === 'Sale' || this.listingType === 'Sale')
          ? 'As per usage'
          : 'Included in Rent';
      },
    },
    monthlyWaterCharge: { type: Number, default: 0, min: 0 },
    saleDetails: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    rooms: [roomSchema],
    roomLength: { type: Number, default: 0 },
    roomWidth: { type: Number, default: 0 },
    roomHeight: { type: Number, default: 0 },
    threeDConfig: { type: threeDConfigSchema, default: () => ({ enabled: false, floors: [] }) },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ownerName: { type: String, required: true },
    ownerPhone: { type: String, required: true },
    photos: [{ type: String }],
    videos: [{ type: String }],
    views: { type: Number, default: 0 },
    interested: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    listingStatus: { type: String, enum: ['active', 'inactive', 'rented', 'sold', 'draft'], default: 'active' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

propertySchema.index({ ownerId: 1, createdAt: -1 });
propertySchema.index({ city: 1, type: 1, listingType: 1, isPublished: 1 });
propertySchema.index({ propertyType: 1, transactionType: 1, listingStatus: 1 });

const Property = mongoose.model('Property', propertySchema);

export default Property;
